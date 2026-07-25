/**
 * Wraps the existing icon.png into a valid .ico file (single 256x256 image).
 * The ICO format can embed PNG data directly for 256x256.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const pngData = fs.readFileSync(path.join(__dirname, '../assets/icon.png'));

// ICO header: 6 bytes
// ICONDIR: idReserved(2), idType(2=1), idCount(2)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);  // reserved
header.writeUInt16LE(1, 2);  // type: 1 = ICO
header.writeUInt16LE(1, 4);  // count: 1 image

// ICONDIRENTRY: 16 bytes
const entry = Buffer.alloc(16);
entry[0] = 0;   // width: 0 = 256
entry[1] = 0;   // height: 0 = 256
entry[2] = 0;   // colorCount
entry[3] = 0;   // reserved
entry.writeUInt16LE(1, 4);               // planes
entry.writeUInt16LE(32, 6);              // bitCount
entry.writeUInt32LE(pngData.length, 8);  // size of PNG data
entry.writeUInt32LE(6 + 16, 12);         // offset = header(6) + entry(16)

const ico = Buffer.concat([header, entry, pngData]);
const outPath = path.join(__dirname, '../assets/icon.ico');
fs.writeFileSync(outPath, ico);
console.log('ICO written:', outPath, `(${ico.length} bytes)`);
