// Gera os ícones do PWA a partir de public/brand/icon.svg (ADR-030).
// Uso: node scripts/brand-icons.mjs
//
// - icon-192/512 e icon.png: cantos arredondados com fundo transparente
//   (navegador e desktop mostram o arquivo como está).
// - apple-touch-icon e maskable: quadrado cheio, sem cantos — o iOS e o
//   Android aplicam a própria máscara. No maskable o D encolhe para caber na
//   zona segura (círculo de 80% do lado). O apple-touch-icon fica na raiz,
//   onde o iOS e outros apps procuram mesmo sem <link>.
// - favicon.ico (16, 32 e 48 px): navegador e sistema pedem /favicon.ico
//   direto ao salvar favorito ou atalho; sem ele, ficavam com o ícone antigo.
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const pub = (p) => path.join(root, "public", p)

// Fim de linha normalizado: com core.autocrlf o checkout grava CRLF, e as
// trocas abaixo procuram "\n".
const rounded = (await readFile(pub("brand/icon.svg"), "utf8")).replace(/\r\n/g, "\n")
// Fundo sem cantos: tira o rx do retângulo de fundo.
const square = rounded.replace('rx="22" ', "")
// Maskable: fundo cheio e o desenho a 84% em volta do centro.
const maskable = square.replace('<g clip-path="url(#c)">', '<g transform="translate(8 8) scale(.84)"><g clip-path="url(#c)">').replace("</g>\n</svg>", "</g></g>\n</svg>")

const outputs = [
  { svg: rounded, size: 192, file: "icons/icon-192.png" },
  { svg: rounded, size: 512, file: "icons/icon-512.png" },
  { svg: maskable, size: 512, file: "icons/icon-maskable-512.png" },
  { svg: square, size: 180, file: "apple-touch-icon.png" },
  { svg: rounded, size: 256, file: "icon.png" },
]

for (const { svg, size, file } of outputs) {
  await sharp(Buffer.from(svg), { density: Math.ceil((72 * size) / 100) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(pub(file))
  console.log(`${file} (${size}px)`)
}

// ICO com PNGs dentro (aceito por todos os navegadores atuais): cabeçalho de
// 6 bytes, uma entrada de 16 bytes por tamanho e os PNGs em seguida.
const icoSizes = [16, 32, 48]
const pngs = await Promise.all(
  icoSizes.map((size) =>
    sharp(Buffer.from(rounded), { density: Math.ceil((72 * size) / 100) * 4 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
)
const header = Buffer.alloc(6 + 16 * pngs.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)
let offset = header.length
pngs.forEach((png, i) => {
  const entry = 6 + 16 * i
  header.writeUInt8(icoSizes[i], entry)
  header.writeUInt8(icoSizes[i], entry + 1)
  header.writeUInt8(0, entry + 2)
  header.writeUInt8(0, entry + 3)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(png.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += png.length
})
await writeFile(pub("favicon.ico"), Buffer.concat([header, ...pngs]))
console.log(`favicon.ico (${icoSizes.join(", ")}px)`)
