/**
 * Identifies an uploaded image by its bytes (never by its name or declared type)
 * and reads its pixel size from the header, without decoding the image.
 * Supported: PNG, JPEG (with EXIF orientation), WebP (VP8, VP8L, VP8X) and SVG.
 */

const TYPES = {
  png: { ext: "png", mime: "image/png" },
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  webp: { ext: "webp", mime: "image/webp" },
  svg: { ext: "svg", mime: "image/svg+xml" },
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

function ascii(buffer, start, end) {
  if (buffer.length < end) return "";
  return buffer.toString("latin1", start, end);
}

function pngSize(buffer) {
  // Signature, then the IHDR chunk: length (4), "IHDR" (4), width (4), height (4).
  if (buffer.length < 24 || ascii(buffer, 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// SOF markers carry the frame size. C4 (DHT), C8 (JPG) and CC (DAC) are not frames.
const JPEG_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/**
 * Reads the EXIF orientation (tag 0x0112 in IFD0) from an APP1 segment body.
 * @returns {number|null}
 */
function exifOrientation(buffer, start, end) {
  if (ascii(buffer, start, start + 6) !== "Exif\0\0") return null;
  const tiff = start + 6;
  if (tiff + 8 > end) return null;
  const order = ascii(buffer, tiff, tiff + 2);
  if (order !== "II" && order !== "MM") return null;
  const le = order === "II";
  const u16 = (at) => (le ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
  const u32 = (at) => (le ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));
  if (u16(tiff + 2) !== 42) return null;
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > end) return null;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return null;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

function jpegSize(buffer) {
  let offset = 2;
  let size = null;
  let orientation = null;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    let marker = buffer[offset + 1];
    // Fill bytes: any number of 0xFF before a marker.
    while (marker === 0xff && offset + 2 < buffer.length) {
      offset += 1;
      marker = buffer[offset + 1];
    }
    // Standalone markers without a length.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI or start of scan
    if (offset + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const bodyStart = offset + 4;
    const bodyEnd = Math.min(offset + 2 + length, buffer.length);

    if (marker === 0xe1 && orientation === null)
      orientation = exifOrientation(buffer, bodyStart, bodyEnd);
    if (JPEG_SOF.has(marker) && bodyStart + 5 <= buffer.length) {
      size = {
        height: buffer.readUInt16BE(bodyStart + 1),
        width: buffer.readUInt16BE(bodyStart + 3),
      };
    }
    offset += 2 + length;
  }
  if (!size) return null;
  // Orientations 5 to 8 rotate by 90 degrees, so the displayed size is swapped.
  if (orientation !== null && orientation >= 5)
    return { width: size.height, height: size.width, orientation };
  return { ...size, orientation: orientation ?? 1 };
}

function webpSize(buffer) {
  if (buffer.length < 30) return null;
  const chunk = ascii(buffer, 12, 16);
  if (chunk === "VP8 ") {
    // Key frame start code 9D 01 2A, then 14-bit width and height.
    if (!startsWith(buffer, [0x9d, 0x01, 0x2a], 23)) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return null;
}

/**
 * Whether the bytes look like an SVG document: optional BOM, XML declaration,
 * comments and DOCTYPE, then an <svg> root element.
 */
function looksLikeSvg(buffer) {
  const head = buffer.subarray(0, 4096);
  if (head.includes(0)) return false; // binary data
  let text = head.toString("utf8").replace(/^\uFEFF/, "");
  const prolog =
    /^(\s+|<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>)/i;
  for (let i = 0; i < 50; i++) {
    const match = text.match(prolog);
    if (!match) break;
    text = text.slice(match[0].length);
  }
  return /^<svg[\s>/]/i.test(text);
}

/**
 * Parses a CSS length for an SVG width or height. Only unitless and px values
 * give a pixel size.
 */
function svgLength(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d*\.?\d+(?:e[+-]?\d+)?)(px)?$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Size of an SVG root element from its viewBox, else its width and height.
 * @param {{getAttribute: function(string): string|null}} element
 * @returns {{width:number, height:number}|null}
 */
function svgSizeFromElement(element) {
  const viewBox = element.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      parts.length === 4 &&
      parts.every(Number.isFinite) &&
      parts[2] > 0 &&
      parts[3] > 0
    )
      return { width: parts[2], height: parts[3] };
  }
  const width = svgLength(element.getAttribute("width"));
  const height = svgLength(element.getAttribute("height"));
  if (width && height) return { width, height };
  return null;
}

/**
 * Identifies an image from its bytes.
 * @param {Buffer} buffer
 * @returns {{type: string, ext: string, mime: string, width: number|null, height: number|null}|null}
 *   null when the bytes are not a supported image. SVG sizes are read after
 *   sanitizing (see svg.js), so they are null here.
 */
function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  if (startsWith(buffer, PNG_SIGNATURE)) {
    const size = pngSize(buffer);
    return size ? { type: "png", ...TYPES.png, ...size } : null;
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    const size = jpegSize(buffer);
    return size
      ? { type: "jpeg", ...TYPES.jpeg, width: size.width, height: size.height }
      : null;
  }
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") {
    const size = webpSize(buffer);
    return size ? { type: "webp", ...TYPES.webp, ...size } : null;
  }
  if (looksLikeSvg(buffer))
    return { type: "svg", ...TYPES.svg, width: null, height: null };
  return null;
}

/** Media type for a stored file, from its extension (set from the sniffed type). */
function mimeForFilename(filename = "") {
  const ext = String(filename).split(".").pop().toLowerCase();
  const found = Object.values(TYPES).find((type) => type.ext === ext);
  return found ? found.mime : null;
}

module.exports = {
  TYPES,
  sniffImage,
  svgSizeFromElement,
  mimeForFilename,
  looksLikeSvg,
};
