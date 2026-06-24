import fs from 'node:fs';

const [gunId, jsonPath, bodyPath] = process.argv.slice(2);
let raw = fs.readFileSync(jsonPath, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
const puzzles = JSON.parse(raw);
fs.writeFileSync(bodyPath, JSON.stringify({ gun_id: gunId, puzzles }));
