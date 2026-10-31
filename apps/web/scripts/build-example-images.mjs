import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const photos = JSON.parse(await readFile(path.join(root, "lib/trade/example-photos.json"), "utf8"));
const output = path.join(root, "public/example-photos/optimized");
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0, thumbnailBytes = 0;

async function asset(id, bytes, width, height) {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const name = `${id}.${hash}.${width}w.webp`;
  await writeFile(path.join(output, name), bytes);
  return { src: `/example-photos/optimized/${name}`, width, height, bytes: bytes.length };
}

for (const [id, photo] of Object.entries(photos)) {
  const source = await readFile(path.join(root, "public", photo.src));
  const metadata = await sharp(source).metadata();
  const full = await asset(id, source, metadata.width, metadata.height);
  const thumbnails = [];
  for (const width of [240, 400, 480].filter((width) => width < metadata.width)) {
    const { data, info } = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 75, effort: 6 }).toBuffer({ resolveWithObject: true });
    thumbnails.push(await asset(id, data, info.width, info.height));
  }
  const card = thumbnails.at(-1) ?? full;
  manifest[id] = { full, thumbnails };
  originalBytes += source.length;
  thumbnailBytes += card.bytes;
}
await writeFile(path.join(root, "lib/trade/example-image-variants.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ items: Object.keys(manifest).length, originalBytes, thumbnailBytes, cardReductionPercent: Math.round((1 - thumbnailBytes / originalBytes) * 100) }));
