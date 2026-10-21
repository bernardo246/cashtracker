// Gera os ícones do PWA (monograma "C" #3ECF8E sobre #0B0F0E) sem dependências:
// rasteriza o "C" com supersampling e codifica o PNG com node:zlib.
// Uso: pnpm --filter @cash/web icons
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = [0x0b, 0x0f, 0x0e];
const FG = [0x3e, 0xcf, 0x8e];
const GAP = (40 * Math.PI) / 180; // abertura do "C": ±40° ao redor do eixo +x
const SS = 4; // supersampling por eixo

// Geometria relativa ao lado; `outer` é o raio externo do "C" (0.5 = lado inteiro).
const geometry = (outer) => ({ outer, inner: outer * 0.62 });

function inC(x, y, { outer, inner }) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const d = Math.hypot(dx, dy);
  if (d > outer || d < inner) return false;
  return Math.abs(Math.atan2(dy, dx)) > GAP;
}

function render(size, outer) {
  const g = geometry(outer);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    raw[row] = 0; // filtro "None"
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++)
          if (inC((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, g)) hits++;
      const a = hits / (SS * SS);
      for (let c = 0; c < 3; c++) raw[row + 1 + px * 3 + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  return raw;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function png(size, outer) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(render(size, outer), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function svg(outer) {
  const s = 512;
  const { outer: R, inner: r } = geometry(outer);
  const pt = (rad, sign) => `${(s / 2 + rad * s * Math.cos(GAP)).toFixed(2)} ${(s / 2 + sign * rad * s * Math.sin(GAP)).toFixed(2)}`;
  const path = `M${pt(R, -1)}A${R * s} ${R * s} 0 1 0 ${pt(R, 1)}L${pt(r, 1)}A${r * s} ${r * s} 0 1 1 ${pt(r, -1)}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="#0B0F0E"/><path d="${path}" fill="#3ECF8E"/></svg>\n`;
}

const out = join(root, "public/icons");
mkdirSync(out, { recursive: true });
// "C" ocupa ~64% do lado; no maskable fica dentro da zona segura (círculo de 80%).
writeFileSync(join(out, "icon-192.png"), png(192, 0.32));
writeFileSync(join(out, "icon-512.png"), png(512, 0.32));
writeFileSync(join(out, "maskable-512.png"), png(512, 0.26));
writeFileSync(join(out, "apple-touch-icon.png"), png(180, 0.32));
writeFileSync(join(root, "src/app/icon.svg"), svg(0.32));
console.log("Ícones gerados em public/icons e src/app/icon.svg");
