use super::protocol::{decode_header, encode, packet, parse_controller, update_leds, CLIENT_PROTOCOL};
use super::*;
use std::net::TcpListener;
use std::sync::mpsc::{self, Receiver};
use std::thread;

enum Seen {
    CustomMode,
    Leds(Vec<Color>),
    Mode(i32, Vec<u8>),
    Notified,
}

fn string(out: &mut Vec<u8>, text: &str) {
    out.extend_from_slice(&((text.len() + 1) as u16).to_le_bytes());
    out.extend_from_slice(text.as_bytes());
    out.push(0);
}

/// A protocol 3 mode block with one colour.
fn mode(name: &str) -> Vec<u8> {
    let mut out = Vec::new();
    string(&mut out, name);
    for value in 0..12u32 {
        out.extend_from_slice(&value.to_le_bytes());
    }
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&[9, 8, 7, 0]);
    out
}

/// A protocol 3 controller with "Direct" and an active "Breathing" mode, one matrix zone,
/// and LED `i` coloured (i, 0, 0).
fn controller(kind: i32, name: &str, leds: &[String]) -> Vec<u8> {
    let mut data = Vec::new();
    data.extend_from_slice(&kind.to_le_bytes());
    string(&mut data, name);
    for text in ["Vendor", "Description", "1.0", "serial", "HID: /dev/hidraw0"] {
        string(&mut data, text);
    }
    data.extend_from_slice(&2u16.to_le_bytes());
    data.extend_from_slice(&1i32.to_le_bytes());
    data.extend(mode("Direct"));
    data.extend(mode("Breathing"));
    data.extend_from_slice(&1u16.to_le_bytes());
    string(&mut data, "Keyboard");
    for value in [2u32, leds.len() as u32, leds.len() as u32, leds.len() as u32] {
        data.extend_from_slice(&value.to_le_bytes());
    }
    data.extend_from_slice(&12u16.to_le_bytes());
    for value in [1u32, 1, 0] {
        data.extend_from_slice(&value.to_le_bytes());
    }
    data.extend_from_slice(&(leds.len() as u16).to_le_bytes());
    for (index, led) in leds.iter().enumerate() {
        string(&mut data, led);
        data.extend_from_slice(&(index as u32).to_le_bytes());
    }
    data.extend_from_slice(&(leds.len() as u16).to_le_bytes());
    for index in 0..leds.len() {
        data.extend_from_slice(&[index as u8, 0, 0, 0]);
    }
    let mut body = ((data.len() + 4) as u32).to_le_bytes().to_vec();
    body.extend(data);
    body
}

/// 26 letters, Space, both Shifts, ANSI backslash, then two LEDs that are not typing keys.
fn keyboard_leds() -> Vec<String> {
    let mut leds: Vec<String> = ('A'..='Z').map(|letter| format!("Key: {letter}")).collect();
    for name in ["Key: Space", "Key: Left Shift", "Key: Right Shift", "Key: \\ (ANSI)", "Key: Number Pad Enter", "Logo"] {
        leds.push(name.to_string());
    }
    leds
}

fn reply(stream: &mut TcpStream, device: u32, id: u32, payload: &[u8]) {
    stream.write_all(&encode(device, id, payload)).unwrap();
}

/// A minimal OpenRGB SDK server: a mouse at index 0 and, if `keyboard`, a keyboard at index 1.
/// It announces a device-list change after `notify_after` LED frames.
fn serve(keyboard: bool, notify_after: Option<usize>) -> (u16, Receiver<Seen>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut frames = 0;
        loop {
            let mut header = [0u8; 16];
            if stream.read_exact(&mut header).is_err() {
                return;
            }
            let device = u32::from_le_bytes([header[4], header[5], header[6], header[7]]);
            let header = decode_header(&header).unwrap();
            let mut body = vec![0u8; header.size as usize];
            stream.read_exact(&mut body).unwrap();
            match header.id {
                packet::SET_CLIENT_NAME => assert_eq!(body, b"Asdfy\0"),
                packet::REQUEST_PROTOCOL_VERSION => {
                    assert_eq!(body, CLIENT_PROTOCOL.to_le_bytes());
                    // A newer server: the client must settle on its own version 3.
                    reply(&mut stream, device, header.id, &5u32.to_le_bytes());
                }
                packet::REQUEST_CONTROLLER_COUNT => reply(&mut stream, device, header.id, &2u32.to_le_bytes()),
                packet::REQUEST_CONTROLLER_DATA => {
                    assert_eq!(body, 3u32.to_le_bytes());
                    let data = if device == 1 && keyboard {
                        controller(DEVICE_TYPE, "Test Keyboard", &keyboard_leds())
                    } else {
                        controller(6, if device == 0 { "Test Mouse" } else { "Test Mouse 2" }, &["Logo".to_string()])
                    };
                    reply(&mut stream, device, header.id, &data);
                }
                packet::SET_CUSTOM_MODE => {
                    assert_eq!(device, 1);
                    let _ = sender.send(Seen::CustomMode);
                }
                packet::UPDATE_LEDS => {
                    assert_eq!(device, 1);
                    assert_eq!(protocol::u32_at(&body, 0).unwrap() as usize, body.len());
                    let count = u16::from_le_bytes([body[4], body[5]]) as usize;
                    let colors = (0..count).map(|index| {
                        let at = 6 + 4 * index;
                        [body[at], body[at + 1], body[at + 2]]
                    }).collect();
                    let _ = sender.send(Seen::Leds(colors));
                    frames += 1;
                    if Some(frames) == notify_after {
                        reply(&mut stream, 0, packet::DEVICE_LIST_UPDATED, &[]);
                        let _ = sender.send(Seen::Notified);
                    }
                }
                packet::UPDATE_MODE => {
                    assert_eq!(protocol::u32_at(&body, 0).unwrap() as usize, body.len());
                    let index = i32::from_le_bytes([body[4], body[5], body[6], body[7]]);
                    let _ = sender.send(Seen::Mode(index, body[8..].to_vec()));
                }
                other => panic!("unexpected packet {other}"),
            }
        }
    });
    (port, receiver)
}

const DEVICE_TYPE: i32 = protocol::DEVICE_TYPE_KEYBOARD;

fn next(seen: &Receiver<Seen>) -> Seen {
    seen.recv_timeout(Duration::from_secs(5)).expect("the fake server saw nothing")
}

fn lit(key: &str, color: Color) -> LitKey {
    LitKey { key: key.to_string(), color }
}

#[test]
fn key_names_map_to_app_keys() {
    assert_eq!(key_id("Key: A").as_deref(), Some("a"));
    assert_eq!(key_id("Key: ;").as_deref(), Some(";"));
    assert_eq!(key_id("Key: \\ (ANSI)").as_deref(), Some("\\"));
    assert_eq!(key_id("Key: Space").as_deref(), Some(" "));
    assert_eq!(key_id("Key: Left Shift").as_deref(), Some("shift-left"));
    assert_eq!(key_id("Key: Right Shift").as_deref(), Some("shift-right"));
    assert_eq!(key_id("Key: Number Pad Enter"), None);
    assert_eq!(key_id("Key: F1"), None);
    assert_eq!(key_id("Logo"), None);
}

#[test]
fn controller_data_is_parsed_and_truncation_is_rejected() {
    let body = controller(DEVICE_TYPE, "Board", &keyboard_leds());
    let parsed = parse_controller(&body, 3).unwrap();
    assert_eq!((parsed.kind, parsed.name.as_str(), parsed.active_mode), (DEVICE_TYPE, "Board", 1));
    assert_eq!(parsed.active_mode_data.as_deref(), Some(mode("Breathing").as_slice()));
    assert_eq!(parsed.leds.len(), 32);
    assert_eq!(parsed.colors[5], [5, 0, 0]);
    for length in [0, 10, body.len() / 2, body.len() - 1] {
        assert!(parse_controller(&body[..length], 3).is_err());
    }
    let payload = update_leds(&[[1, 2, 3]]);
    assert_eq!(payload, [10, 0, 0, 0, 1, 0, 1, 2, 3, 0]);
}

#[test]
fn lights_keys_ignores_stale_frames_and_restores_on_disconnect() {
    let (port, seen) = serve(true, None);
    let lighting = Lighting::default();
    let status = lighting.connect(port).unwrap();
    assert_eq!((status.device.as_str(), status.keys), ("Test Keyboard", 30));
    assert!(matches!(next(&seen), Seen::CustomMode));
    let Seen::Leds(first) = next(&seen) else { panic!("expected the base frame") };
    assert_eq!(first.len(), 32);
    assert!(first.iter().all(|color| *color == BASE));

    lighting.highlight(2, &[lit("a", [255, 0, 0]), lit("shift-right", [0, 0, 255]), lit("?", [1, 1, 1])]).unwrap();
    let Seen::Leds(frame) = next(&seen) else { panic!("expected a key frame") };
    assert_eq!(frame[0], [255, 0, 0]);
    assert_eq!(frame[28], [0, 0, 255]);
    assert_eq!(frame.iter().filter(|color| **color == BASE).count(), 30);

    // An older frame arriving late must not repaint the keyboard.
    lighting.highlight(1, &[lit("b", [0, 255, 0])]).unwrap();
    lighting.disconnect();
    let Seen::Leds(restored) = next(&seen) else { panic!("expected the saved colours") };
    assert_eq!(restored[3], [3, 0, 0]);
    let Seen::Mode(index, data) = next(&seen) else { panic!("expected the saved mode") };
    assert_eq!((index, data), (1, mode("Breathing")));
    assert!(lighting.highlight(3, &[]).unwrap_err().contains("not connected"));
}

#[test]
fn a_changed_device_list_ends_the_session_without_restoring() {
    let (port, seen) = serve(true, Some(1));
    let lighting = Lighting::default();
    lighting.connect(port).unwrap();
    assert!(matches!(next(&seen), Seen::CustomMode));
    assert!(matches!(next(&seen), Seen::Leds(_)));
    assert!(matches!(next(&seen), Seen::Notified));
    assert!(lighting.highlight(1, &[lit("a", [255, 0, 0])]).unwrap_err().contains("device list changed"));
    assert!(lighting.highlight(2, &[]).unwrap_err().contains("not connected"));
    lighting.disconnect();
    assert!(seen.recv_timeout(Duration::from_millis(300)).is_err());
}

#[test]
fn reports_missing_server_and_missing_keyboard() {
    let unused = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
    assert!(Lighting::default().connect(unused).unwrap_err().contains("not reachable"));
    let (port, _seen) = serve(false, None);
    let error = Lighting::default().connect(port).unwrap_err();
    assert!(error.contains("no keyboard with per-key lighting"), "{error}");
    assert!(error.contains("Test Mouse, Test Mouse 2"), "{error}");
}

#[test]
fn oversized_requests_are_rejected_before_use() {
    let lighting = Lighting::default();
    let keys: Vec<LitKey> = (0..9).map(|_| lit("a", [1, 1, 1])).collect();
    assert!(lighting.highlight(1, &keys).unwrap_err().contains("Invalid"));
    assert!(lighting.highlight(1, &[lit("a-very-long-key-name", [1, 1, 1])]).unwrap_err().contains("Invalid"));
}
