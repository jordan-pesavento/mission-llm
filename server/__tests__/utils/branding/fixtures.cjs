/**
 * Test fixtures for the branding tests: tiny image files built in memory and
 * an in-memory stand-in for the prisma `system_settings` table.
 * (A .cjs file, so jest does not collect it as a test suite.)
 */

const zlib = require("zlib");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * A valid, decodable RGBA PNG filled with one color.
 * @param {number} width
 * @param {number} height
 * @param {number[]} rgba
 */
function makePng(width, height, rgba = [79, 134, 255, 255]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const row = Buffer.alloc(1 + width * 4);
  for (let x = 0; x < width; x++) row.set(rgba, 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * JPEG header bytes (SOI, optional EXIF orientation, SOF0, EOI). Enough for the
 * sniffer, which never decodes pixels.
 */
function makeJpeg(width, height, orientation = null, littleEndian = true) {
  const parts = [Buffer.from([0xff, 0xd8])];
  if (orientation !== null) {
    const tiff = Buffer.alloc(26);
    tiff.write(littleEndian ? "II" : "MM", 0, "latin1");
    const u16 = (value, at) =>
      littleEndian
        ? tiff.writeUInt16LE(value, at)
        : tiff.writeUInt16BE(value, at);
    const u32 = (value, at) =>
      littleEndian
        ? tiff.writeUInt32LE(value, at)
        : tiff.writeUInt32BE(value, at);
    u16(42, 2);
    u32(8, 4); // IFD0 offset
    u16(1, 8); // one entry
    u16(0x0112, 10); // orientation
    u16(3, 12); // SHORT
    u32(1, 14); // count
    u16(orientation, 18);
    u32(0, 22); // next IFD
    const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
    const app1 = Buffer.alloc(4);
    app1[0] = 0xff;
    app1[1] = 0xe1;
    app1.writeUInt16BE(body.length + 2, 2);
    parts.push(app1, body);
  }
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 3;
  parts.push(sof, Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}

/** WebP container bytes for the three bitstream kinds. */
function makeWebp(kind, width, height) {
  const buffer = Buffer.alloc(40);
  buffer.write("RIFF", 0, "latin1");
  buffer.writeUInt32LE(32, 4);
  buffer.write("WEBP", 8, "latin1");
  if (kind === "VP8") {
    buffer.write("VP8 ", 12, "latin1");
    buffer.set([0x9d, 0x01, 0x2a], 23);
    buffer.writeUInt16LE(width, 26);
    buffer.writeUInt16LE(height, 28);
  } else if (kind === "VP8L") {
    buffer.write("VP8L", 12, "latin1");
    buffer[20] = 0x2f;
    const w = width - 1;
    const h = height - 1;
    buffer[21] = w & 0xff;
    buffer[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
    buffer[23] = (h >> 2) & 0xff;
    buffer[24] = (h >> 10) & 0x0f;
  } else {
    buffer.write("VP8X", 12, "latin1");
    buffer.writeUIntLE(width - 1, 24, 3);
    buffer.writeUIntLE(height - 1, 27, 3);
  }
  return buffer;
}

/** In-memory prisma with the calls the branding module makes. */
function createFakePrisma() {
  const rows = new Map();
  const matches = (where = {}, label) => {
    if (typeof where.label === "string") return where.label === label;
    if (where.label?.in) return where.label.in.includes(label);
    return true;
  };
  const system_settings = {
    findMany: jest.fn(async ({ where } = {}) =>
      [...rows.values()].filter((row) => matches(where, row.label))
    ),
    findFirst: jest.fn(
      async ({ where } = {}) =>
        [...rows.values()].find((row) => matches(where, row.label)) || null
    ),
    upsert: jest.fn(async ({ where, update, create }) => {
      const existing = rows.get(where.label);
      const row = existing
        ? { ...existing, ...update }
        : { id: rows.size + 1, ...create };
      rows.set(where.label, row);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      let count = 0;
      for (const row of rows.values())
        if (matches(where, row.label)) {
          Object.assign(row, data);
          count += 1;
        }
      return { count };
    }),
  };
  return {
    system_settings,
    event_logs: { create: jest.fn(async ({ data }) => data) },
    $transaction: jest.fn(async (ops) => Promise.all(ops)),
    __rows: rows,
    __set(label, value) {
      rows.set(label, { id: rows.size + 1, label, value });
    },
    __get(label) {
      return rows.get(label)?.value ?? null;
    },
  };
}

module.exports = { makePng, makeJpeg, makeWebp, createFakePrisma, crc32 };
