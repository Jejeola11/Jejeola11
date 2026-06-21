// Generates icon-192.png and icon-512.png (deep-teal rounded square + gold "F").
// Pure Node, no deps. Run: node app/icons/make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c, table = crc32.t || (crc32.t = (() => {
    const t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(S) {
  const R = 0.22 * S;                       // corner radius
  const teal = [4, 35, 31, 255];
  const gold = [239, 201, 95, 255];
  const clear = [0, 0, 0, 0];
  // F geometry (relative to S)
  const stem = [0.30, 0.26, 0.42, 0.74];    // x0,y0,x1,y1
  const top  = [0.30, 0.26, 0.70, 0.38];
  const mid  = [0.30, 0.46, 0.62, 0.56];
  const inBox = (x, y, b) => x >= b[0]*S && x < b[2]*S && y >= b[1]*S && y < b[3]*S;
  const inRounded = (x, y) => {
    const cx = Math.min(Math.max(x, R), S - R), cy = Math.min(Math.max(y, R), S - R);
    const dx = x - cx, dy = y - cy;
    if ((x < R || x > S - R) && (y < R || y > S - R)) return dx*dx + dy*dy <= R*R;
    return true;
  };

  const raw = Buffer.alloc(S * (S * 4 + 1));
  let p = 0;
  for (let y = 0; y < S; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < S; x++) {
      let px = clear;
      if (inRounded(x + 0.5, y + 0.5)) {
        px = (inBox(x, y, stem) || inBox(x, y, top) || inBox(x, y, mid)) ? gold : teal;
      }
      raw[p++] = px[0]; raw[p++] = px[1]; raw[p++] = px[2]; raw[p++] = px[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const S of [192, 512]) {
  fs.writeFileSync(path.join(__dirname, `icon-${S}.png`), makePNG(S));
  console.log('wrote icon-' + S + '.png');
}
