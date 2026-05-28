import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const outDir = join(root, "public", "icons")

const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fdf6ec"/>
  <circle cx="256" cy="256" r="220" fill="#f6ecd9" stroke="#8c1a1f" stroke-width="14"/>
  <circle cx="256" cy="256" r="170" fill="#c1272d"/>
  <circle cx="190" cy="210" r="22" fill="#fdf6ec"/>
  <circle cx="316" cy="178" r="22" fill="#fdf6ec"/>
  <circle cx="334" cy="298" r="22" fill="#fdf6ec"/>
  <circle cx="204" cy="316" r="22" fill="#fdf6ec"/>
  <circle cx="266" cy="262" r="18" fill="#3d8b3d"/>
  <circle cx="232" cy="252" r="6" fill="#1f5a1f"/>
  <circle cx="282" cy="278" r="6" fill="#1f5a1f"/>
</svg>`

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#c1272d"/>
  <circle cx="256" cy="256" r="140" fill="#f6ecd9"/>
  <circle cx="256" cy="256" r="100" fill="#c1272d"/>
  <circle cx="220" cy="232" r="14" fill="#fdf6ec"/>
  <circle cx="292" cy="240" r="14" fill="#fdf6ec"/>
  <circle cx="240" cy="296" r="14" fill="#fdf6ec"/>
</svg>`

await mkdir(outDir, { recursive: true })

const make = async (svg, size, name) => {
  const out = join(outDir, name)
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
  console.log(`✓ ${name} (${size}×${size})`)
}

await make(baseSvg, 192, "icon-192.png")
await make(baseSvg, 512, "icon-512.png")
await make(maskableSvg, 512, "maskable-512.png")

// Apple touch icon goes at public root
await sharp(Buffer.from(baseSvg))
  .resize(180, 180)
  .png()
  .toFile(join(root, "public", "apple-touch-icon.png"))
console.log("✓ apple-touch-icon.png (180×180)")
