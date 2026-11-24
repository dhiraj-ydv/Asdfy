//! OpenRGB SDK wire format, written from OpenRGB's published protocol documentation
//! (Documentation/OpenRGBSDK.md). The documentation leaves byte order and colour layout
//! unstated; OpenRGB uses little-endian integers and colours ordered R, G, B, padding.
use std::io;

pub const MAGIC: [u8; 4] = *b"ORGB";
pub const DEFAULT_PORT: u16 = 6742;
/// Highest protocol this client parses. Version 4 adds zone segments, which are not needed.
pub const CLIENT_PROTOCOL: u32 = 3;
/// OpenRGB's device type value for keyboards.
pub const DEVICE_TYPE_KEYBOARD: i32 = 5;
const MAX_PACKET: u32 = 16 * 1024 * 1024;

pub mod packet {
    pub const REQUEST_CONTROLLER_COUNT: u32 = 0;
    pub const REQUEST_CONTROLLER_DATA: u32 = 1;
    pub const REQUEST_PROTOCOL_VERSION: u32 = 40;
    pub const SET_CLIENT_NAME: u32 = 50;
    pub const DEVICE_LIST_UPDATED: u32 = 100;
    pub const UPDATE_LEDS: u32 = 1050;
    pub const SET_CUSTOM_MODE: u32 = 1100;
    pub const UPDATE_MODE: u32 = 1101;
}

pub type Color = [u8; 3];

pub struct Header {
    pub id: u32,
    pub size: u32,
}

/// What the client needs from a controller's description.
pub struct Controller {
    pub kind: i32,
    pub name: String,
    pub active_mode: i32,
    /// The active mode's block exactly as received, so it can be sent back unchanged to restore it.
    pub active_mode_data: Option<Vec<u8>>,
    pub leds: Vec<String>,
    pub colors: Vec<Color>,
}

fn invalid(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message.to_string())
}

pub fn encode(device: u32, id: u32, payload: &[u8]) -> Vec<u8> {
    let mut packet = Vec::with_capacity(16 + payload.len());
    packet.extend_from_slice(&MAGIC);
    packet.extend_from_slice(&device.to_le_bytes());
    packet.extend_from_slice(&id.to_le_bytes());
    packet.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    packet.extend_from_slice(payload);
    packet
}

pub fn decode_header(bytes: &[u8]) -> io::Result<Header> {
    if bytes.len() < 16 || bytes[..4] != MAGIC {
        return Err(invalid("not an OpenRGB packet"));
    }
    let size = u32_at(bytes, 12)?;
    if size > MAX_PACKET {
        return Err(invalid("OpenRGB packet too large"));
    }
    Ok(Header { id: u32_at(bytes, 8)?, size })
}

pub fn u32_at(bytes: &[u8], at: usize) -> io::Result<u32> {
    let slice = bytes.get(at..at + 4).ok_or_else(|| invalid("truncated OpenRGB packet"))?;
    Ok(u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

/// UPDATELEDS payload; its leading size counts the whole payload, including itself.
pub fn update_leds(colors: &[Color]) -> Vec<u8> {
    let count = colors.len().min(u16::MAX as usize);
    let size = 4 + 2 + 4 * count;
    let mut payload = Vec::with_capacity(size);
    payload.extend_from_slice(&(size as u32).to_le_bytes());
    payload.extend_from_slice(&(count as u16).to_le_bytes());
    for color in &colors[..count] {
        payload.extend_from_slice(&[color[0], color[1], color[2], 0]);
    }
    payload
}

/// UPDATEMODE payload for a mode block previously received from the server.
pub fn update_mode(index: i32, mode: &[u8]) -> Vec<u8> {
    let size = 4 + 4 + mode.len();
    let mut payload = Vec::with_capacity(size);
    payload.extend_from_slice(&(size as u32).to_le_bytes());
    payload.extend_from_slice(&index.to_le_bytes());
    payload.extend_from_slice(mode);
    payload
}

struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl<'a> Reader<'a> {
    fn take(&mut self, count: usize) -> io::Result<&'a [u8]> {
        let end = self.at.checked_add(count).filter(|end| *end <= self.bytes.len())
            .ok_or_else(|| invalid("truncated OpenRGB controller data"))?;
        let slice = &self.bytes[self.at..end];
        self.at = end;
        Ok(slice)
    }

    fn u16(&mut self) -> io::Result<u16> {
        let bytes = self.take(2)?;
        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    fn i32(&mut self) -> io::Result<i32> {
        let bytes = self.take(4)?;
        Ok(i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    /// Strings carry a 16-bit length that includes their null terminator.
    fn string(&mut self) -> io::Result<String> {
        let length = self.u16()? as usize;
        let bytes = self.take(length)?;
        let text = bytes.strip_suffix(&[0u8]).unwrap_or(bytes);
        Ok(String::from_utf8_lossy(text).into_owned())
    }

    fn skip_mode(&mut self, protocol: u32) -> io::Result<()> {
        self.string()?;
        // value, flags, speed min/max, [brightness min/max], colours min/max, speed,
        // [brightness], direction, colour mode; bracketed fields arrived in protocol 3.
        self.take(4 * if protocol >= 3 { 12 } else { 9 })?;
        let colors = self.u16()? as usize;
        self.take(4 * colors)?;
        Ok(())
    }
}

/// Parses a REQUEST_CONTROLLER_DATA reply for a negotiated protocol of 3 or lower.
pub fn parse_controller(body: &[u8], protocol: u32) -> io::Result<Controller> {
    let mut reader = Reader { bytes: body, at: 0 };
    reader.take(4)?;
    let kind = reader.i32()?;
    let name = reader.string()?;
    if protocol >= 1 {
        reader.string()?;
    }
    for _ in 0..4 {
        reader.string()?;
    }
    let mode_count = reader.u16()?;
    let active_mode = reader.i32()?;
    let mut active_mode_data = None;
    for index in 0..i32::from(mode_count) {
        let start = reader.at;
        reader.skip_mode(protocol)?;
        if index == active_mode {
            active_mode_data = Some(body[start..reader.at].to_vec());
        }
    }
    for _ in 0..reader.u16()? {
        reader.string()?;
        reader.take(4 * 4)?;
        let matrix = reader.u16()? as usize;
        reader.take(matrix)?;
    }
    let mut leds = Vec::new();
    for _ in 0..reader.u16()? {
        leds.push(reader.string()?);
        reader.take(4)?;
    }
    let mut colors = Vec::new();
    for _ in 0..reader.u16()? {
        let color = reader.take(4)?;
        colors.push([color[0], color[1], color[2]]);
    }
    Ok(Controller { kind, name, active_mode, active_mode_data, leds, colors })
}
