import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "piper-tts-web", "dist");
const publicDir = join(root, "public");

const copies = [
  ["onnx", "onnx"],
  ["piper", "piper"],
  ["worker", "worker"],
];

if (!existsSync(dist)) {
  console.warn("piper-tts-web dist not found — skip asset copy");
  process.exit(0);
}

for (const [from, to] of copies) {
  const src = join(dist, from);
  const dest = join(publicDir, to);
  if (!existsSync(src)) {
    console.warn(`Missing ${src}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Copied ${from} → public/${to}`);
}

// Serve the prebundled ESM from /public so Next/webpack never parses the 40MB+ file
const engineSrc = join(dist, "piper-tts-web.js");
const engineDest = join(publicDir, "piper-tts-web.js");
if (existsSync(engineSrc)) {
  cpSync(engineSrc, engineDest);
  console.log("Copied piper-tts-web.js → public/piper-tts-web.js");
}
