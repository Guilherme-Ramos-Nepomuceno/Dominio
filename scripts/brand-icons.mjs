// Gera os ícones do PWA a partir de public/brand/icon.svg (ADR-030).
// Uso: node scripts/brand-icons.mjs
//
// - icon-192/512 e icon.png: cantos arredondados com fundo transparente
//   (navegador e desktop mostram o arquivo como está).
// - apple-touch-icon e maskable: quadrado cheio, sem cantos — o iOS e o
//   Android aplicam a própria máscara. No maskable o D encolhe para caber na
//   zona segura (círculo de 80% do lado).
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const pub = (p) => path.join(root, "public", p)

const rounded = await readFile(pub("brand/icon.svg"), "utf8")
// Fundo sem cantos: tira o rx do retângulo de fundo.
const square = rounded.replace('rx="22" ', "")
// Maskable: fundo cheio e o desenho a 84% em volta do centro.
const maskable = square.replace('<g clip-path="url(#c)">', '<g transform="translate(8 8) scale(.84)"><g clip-path="url(#c)">').replace("</g>\n</svg>", "</g></g>\n</svg>")

const outputs = [
  { svg: rounded, size: 192, file: "icons/icon-192.png" },
  { svg: rounded, size: 512, file: "icons/icon-512.png" },
  { svg: maskable, size: 512, file: "icons/icon-maskable-512.png" },
  { svg: square, size: 180, file: "icons/apple-touch-icon.png" },
  { svg: rounded, size: 256, file: "icon.png" },
]

for (const { svg, size, file } of outputs) {
  await sharp(Buffer.from(svg), { density: Math.ceil((72 * size) / 100) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(pub(file))
  console.log(`${file} (${size}px)`)
}
