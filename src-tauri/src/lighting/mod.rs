//! Optional per-key keyboard backlight through a local OpenRGB SDK server.
//! Only 127.0.0.1 is ever contacted; the UI chooses neither host nor device.
mod protocol;

use std::collections::HashMap;
use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::models::Result;
use protocol::{packet, Color, Controller};

pub use protocol::DEFAULT_PORT;

/// Unlit keys stay faintly on so the board does not look switched off.
const BASE: Color = [16, 16, 16];
const MAX_LIT_KEYS: usize = 8;
const MAX_CONTROLLERS: u32 = 64;

#[derive(Debug, Serialize)]
pub struct LightingStatus {
    pub device: String,
    pub keys: u32,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LitKey {
    pub key: String,
    pub color: Color,
}

#[derive(Default)]
pub struct Lighting {
    session: Mutex<Option<Session>>,
}

impl Lighting {
    fn lock(&self) -> Result<MutexGuard<'_, Option<Session>>> {
        self.session.lock().map_err(|_| "Keyboard lighting is unavailable. Restart the app.".to_string())
    }

    pub fn connect(&self, port: u16) -> Result<LightingStatus> {
        let mut guard = self.lock()?;
        if let Some(previous) = guard.take() {
            previous.restore();
        }
        let session = Session::open(port)?;
        let status = LightingStatus { device: session.name.clone(), keys: session.keys.len() as u32 };
        *guard = Some(session);
        Ok(status)
    }

    /// Lights `lit` and dims every other key. `frame` increases with each request.
    pub fn highlight(&self, frame: u64, lit: &[LitKey]) -> Result<()> {
        if lit.len() > MAX_LIT_KEYS || lit.iter().any(|entry| entry.key.chars().count() > 16) {
            return Err("Invalid key lighting request.".into());
        }
        let mut guard = self.lock()?;
        let Some(session) = guard.as_mut() else {
            return Err("Keyboard lighting is not connected.".into());
        };
        // Requests can overtake each other on worker threads; never paint an older key over a newer one.
        if frame <= session.last_frame {
            return Ok(());
        }
        session.last_frame = frame;
        let painted = session.paint(lit);
        if painted.is_err() {
            *guard = None;
        }
        painted
    }

    /// Returns the keyboard to the lighting OpenRGB had before. Does nothing when not connected.
    pub fn disconnect(&self) {
        if let Ok(mut guard) = self.session.lock() {
            if let Some(session) = guard.take() {
                session.restore();
            }
        }
    }
}

struct Session {
    stream: TcpStream,
    device: u32,
    name: String,
    led_count: usize,
    keys: HashMap<String, usize>,
    saved_colors: Vec<Color>,
    saved_mode: Option<(i32, Vec<u8>)>,
    inbox: Vec<u8>,
    stale: bool,
    last_frame: u64,
}

fn lost(error: io::Error) -> String {
    format!("Lost contact with OpenRGB ({error}). Turn keyboard lighting off and on again in Settings.")
}

impl Session {
    fn open(port: u16) -> Result<Self> {
        let address = SocketAddr::from(([127, 0, 0, 1], port));
        let stream = TcpStream::connect_timeout(&address, Duration::from_secs(1)).map_err(|_| {
            format!("OpenRGB is not reachable on port {port}. Start OpenRGB and turn on its SDK server.")
        })?;
        Self::handshake(stream)
    }

    fn handshake(mut stream: TcpStream) -> Result<Self> {
        stream.set_nodelay(true).map_err(lost)?;
        stream.set_write_timeout(Some(Duration::from_secs(1))).map_err(lost)?;
        send(&mut stream, 0, packet::SET_CLIENT_NAME, b"Asdfy\0").map_err(lost)?;
        send(&mut stream, 0, packet::REQUEST_PROTOCOL_VERSION, &protocol::CLIENT_PROTOCOL.to_le_bytes()).map_err(lost)?;
        // Protocol 0 servers never answer the version request.
        stream.set_read_timeout(Some(Duration::from_secs(1))).map_err(lost)?;
        let version = match receive(&mut stream, packet::REQUEST_PROTOCOL_VERSION) {
            Ok(body) => protocol::u32_at(&body, 0).map_err(lost)?.min(protocol::CLIENT_PROTOCOL),
            Err(error) if matches!(error.kind(), io::ErrorKind::WouldBlock | io::ErrorKind::TimedOut) => 0,
            Err(error) => return Err(lost(error)),
        };
        stream.set_read_timeout(Some(Duration::from_secs(3))).map_err(lost)?;
        send(&mut stream, 0, packet::REQUEST_CONTROLLER_COUNT, &[]).map_err(lost)?;
        let count = protocol::u32_at(&receive(&mut stream, packet::REQUEST_CONTROLLER_COUNT).map_err(lost)?, 0)
            .map_err(lost)?;
        let request = if version >= 1 { version.to_le_bytes().to_vec() } else { Vec::new() };
        let mut others = Vec::new();
        for device in 0..count.min(MAX_CONTROLLERS) {
            send(&mut stream, device, packet::REQUEST_CONTROLLER_DATA, &request).map_err(lost)?;
            let body = receive(&mut stream, packet::REQUEST_CONTROLLER_DATA).map_err(lost)?;
            let controller = protocol::parse_controller(&body, version).map_err(lost)?;
            let keys = key_map(&controller.leds);
            let per_key = ('a'..='z').all(|letter| keys.contains_key(&letter.to_string()));
            if controller.kind == protocol::DEVICE_TYPE_KEYBOARD && per_key {
                return Self::take_over(stream, device, controller, keys);
            }
            others.push(controller.name);
        }
        Err(if others.is_empty() {
            "OpenRGB is running but reports no devices.".to_string()
        } else {
            format!("OpenRGB found no keyboard with per-key lighting. It reports: {}.", others.join(", "))
        })
    }

    fn take_over(mut stream: TcpStream, device: u32, controller: Controller, keys: HashMap<String, usize>) -> Result<Self> {
        send(&mut stream, device, packet::SET_CUSTOM_MODE, &[]).map_err(lost)?;
        let mut session = Session {
            stream,
            device,
            name: controller.name,
            led_count: controller.leds.len(),
            keys,
            saved_colors: controller.colors,
            saved_mode: controller.active_mode_data.map(|data| (controller.active_mode, data)),
            inbox: Vec::new(),
            stale: false,
            last_frame: 0,
        };
        session.paint(&[])?;
        Ok(session)
    }

    fn paint(&mut self, lit: &[LitKey]) -> Result<()> {
        self.drain().map_err(lost)?;
        if self.stale {
            return Err("OpenRGB's device list changed. Turn keyboard lighting off and on again in Settings.".into());
        }
        let mut colors = vec![BASE; self.led_count];
        for entry in lit {
            if let Some(&index) = self.keys.get(&entry.key) {
                colors[index] = entry.color;
            }
        }
        send(&mut self.stream, self.device, packet::UPDATE_LEDS, &protocol::update_leds(&colors)).map_err(lost)
    }

    /// Reads notifications the server sent on its own without waiting for more.
    fn drain(&mut self) -> io::Result<()> {
        self.stream.set_nonblocking(true)?;
        let mut chunk = [0u8; 4096];
        let read = loop {
            match self.stream.read(&mut chunk) {
                Ok(0) => break Err(io::Error::from(io::ErrorKind::UnexpectedEof)),
                Ok(count) => self.inbox.extend_from_slice(&chunk[..count]),
                Err(error) if error.kind() == io::ErrorKind::WouldBlock => break Ok(()),
                Err(error) => break Err(error),
            }
        };
        self.stream.set_nonblocking(false)?;
        read?;
        while self.inbox.len() >= 16 {
            let header = protocol::decode_header(&self.inbox[..16])?;
            let total = 16 + header.size as usize;
            if self.inbox.len() < total {
                break;
            }
            // Device indexes are only valid until the server's list changes.
            if header.id == packet::DEVICE_LIST_UPDATED {
                self.stale = true;
            }
            self.inbox.drain(..total);
        }
        Ok(())
    }

    /// Best effort: the colours first, then the effect that was active, if the device list is unchanged.
    fn restore(mut self) {
        if self.stale {
            return;
        }
        let device = self.device;
        let _ = send(&mut self.stream, device, packet::UPDATE_LEDS, &protocol::update_leds(&self.saved_colors));
        if let Some((index, mode)) = &self.saved_mode {
            let _ = send(&mut self.stream, device, packet::UPDATE_MODE, &protocol::update_mode(*index, mode));
        }
    }
}

fn send(stream: &mut TcpStream, device: u32, id: u32, payload: &[u8]) -> io::Result<()> {
    stream.write_all(&protocol::encode(device, id, payload))
}

/// Reads packets until the reply to `id`, skipping notifications the server sends on its own.
fn receive(stream: &mut TcpStream, id: u32) -> io::Result<Vec<u8>> {
    loop {
        let mut header = [0u8; 16];
        stream.read_exact(&mut header)?;
        let header = protocol::decode_header(&header)?;
        let mut body = vec![0u8; header.size as usize];
        stream.read_exact(&mut body)?;
        if header.id == id {
            return Ok(body);
        }
    }
}

fn key_map(leds: &[String]) -> HashMap<String, usize> {
    let mut keys = HashMap::new();
    for (index, name) in leds.iter().enumerate() {
        if let Some(id) = key_id(name) {
            keys.entry(id).or_insert(index);
        }
    }
    keys
}

/// Maps OpenRGB key LED names ("Key: A", "Key: \ (ANSI)", "Key: Left Shift") to the app's key ids.
fn key_id(name: &str) -> Option<String> {
    let label = name.strip_prefix("Key: ")?;
    let label = match label.rfind(" (") {
        Some(at) if label.ends_with(')') => &label[..at],
        _ => label,
    }
    .trim()
    .to_lowercase();
    let id = match label.as_str() {
        "space" | "spacebar" => " ",
        "left shift" => "shift-left",
        "right shift" => "shift-right",
        "backspace" => "backspace",
        "tab" => "tab",
        "caps lock" => "caps",
        "enter" => "enter",
        single if single.chars().count() == 1 => return Some(single.to_string()),
        _ => return None,
    };
    Some(id.to_string())
}

#[cfg(test)]
mod tests;
