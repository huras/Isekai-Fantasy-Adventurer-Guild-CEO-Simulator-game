/*
  Tileset JSON generator
  - Computes sprite positions from a tileset image using TILE_SIZE, OFFSET, PADDING
  - Writes a JSON file with metadata and per-sprite attributes

  Usage examples (run from the `app` directory):
    node scripts/generate-tileset-json.js --input public/items/tileset_1.png
    node scripts/generate-tileset-json.js --input public/items/tileset_1.png --tileSize 32 --offset 1,1 --padding 2,2
    node scripts/generate-tileset-json.js --input public/items/tileset_1.png --output public/items/tileset_1.json

  Notes:
  - The resulting JSON goes next to the image by default (same basename + .json)
  - The computed backgroundImage uses the public URL inferred from the path under `public/`
*/

import fs from 'node:fs'
import path from 'node:path'

function readPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r')
  try {
    const header = Buffer.alloc(24)
    const bytesRead = fs.readSync(fd, header, 0, 24, 0)
    if (bytesRead < 24) throw new Error('File too small to be a valid PNG')
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    if (!header.slice(0, 8).equals(pngSig)) throw new Error('Not a PNG file')
    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)
    return { width, height }
  } finally {
    fs.closeSync(fd)
  }
}

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

function parseVec2(input, fallbackX, fallbackY) {
  if (input == null) return { x: fallbackX, y: fallbackY }
  if (typeof input === 'number') return { x: input, y: input }
  const str = String(input).trim()
  if (str.includes('x')) {
    const [w, h] = str.split('x').map(Number)
    return { x: Number.isFinite(w) ? w : fallbackX, y: Number.isFinite(h) ? h : fallbackY }
  }
  if (str.includes(',')) {
    const [x, y] = str.split(',').map(Number)
    return { x: Number.isFinite(x) ? x : fallbackX, y: Number.isFinite(y) ? y : fallbackY }
  }
  const n = Number(str)
  return { x: Number.isFinite(n) ? n : fallbackX, y: Number.isFinite(n) ? n : fallbackY }
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function inferPublicUrlFromPath(imageFilePath) {
  // Map anything under /public/... to a URL like /...
  const normalized = imageFilePath.split(path.sep).join('/')
  const idx = normalized.lastIndexOf('/public/')
  if (idx >= 0) {
    return normalized.slice(idx + '/public'.length)
  }
  // Fallback: just use basename with leading slash
  return '/' + path.posix.basename(normalized)
}

function getOutputPath(inputPath, outputArg) {
  if (!outputArg) {
    const dir = path.dirname(inputPath)
    const base = path.basename(inputPath, path.extname(inputPath))
    return path.join(dir, base + '.json')
  }
  const outputPath = path.resolve(outputArg)
  if (outputPath.toLowerCase().endsWith('.json')) return outputPath
  // treat as directory
  const base = path.basename(inputPath, path.extname(inputPath))
  ensureDirSync(outputPath)
  return path.join(outputPath, base + '.json')
}

async function main() {
  const args = parseArgs(process.argv)
  const input = args.input || args.i || args.dir
  if (!input) {
    console.error('Missing --input <path/to/tileset.png> or --dir <path>')
    process.exit(1)
  }

  const cwd = process.cwd()
  const inputPath = path.isAbsolute(input) ? input : path.resolve(cwd, input)
  if (!fs.existsSync(inputPath)) {
    console.error(`Input path not found: ${inputPath}`)
    process.exit(1)
  }

  const tileSizeVec = parseVec2(args.tileSize ?? args.tile ?? 32, 32, 32)
  const offset = parseVec2(args.offset ?? '1,1', 1, 1)
  const padding = parseVec2(args.padding ?? '2,2', 2, 2)

  const imagePaths = []
  const stats = fs.statSync(inputPath)
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(inputPath)) {
      if (entry.toLowerCase().endsWith('.png')) {
        imagePaths.push(path.join(inputPath, entry))
      }
    }
    if (imagePaths.length === 0) {
      console.error('No .png files found in directory:', inputPath)
      process.exit(1)
    }
  } else {
    imagePaths.push(inputPath)
  }

  for (const imgPath of imagePaths) {
    const dim = readPngSize(imgPath)
    const width = dim?.width
    const height = dim?.height
    if (!width || !height) {
      console.error('Failed to read image dimensions:', imgPath)
      continue
    }

    const cols = Math.max(0, Math.floor((width - offset.x) / (tileSizeVec.x + padding.x)))
    const rows = Math.max(0, Math.floor((height - offset.y) / (tileSizeVec.y + padding.y)))

    const publicUrl = args.url || inferPublicUrlFromPath(imgPath)

    const sprites = []
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = offset.x + col * (tileSizeVec.x + padding.x)
        const y = offset.y + row * (tileSizeVec.y + padding.y)
        const widthOut = tileSizeVec.x + padding.x / 2
        const heightOut = tileSizeVec.y + padding.y / 2
        sprites.push({
          id: `r${row}_c${col}`,
          row,
          col,
          x,
          y,
          width: widthOut,
          height: heightOut,
          backgroundImage: `url(${publicUrl})`,
          backgroundPosition: `-${x}px -${y}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        })
      }
    }

    const json = {
      tileset: path.basename(imgPath, path.extname(imgPath)),
      imagePath: publicUrl,
      constants: {
        TILE_SIZE: tileSizeVec.x,
        OFFSET: { x: offset.x, y: offset.y },
        PADDING: { x: padding.x, y: padding.y },
      },
      image: { width, height },
      grid: { cols, rows },
      sprites,
    }

    const outPath = getOutputPath(imgPath, args.output || args.out)
    ensureDirSync(path.dirname(outPath))
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8')
    console.log(`Generated ${sprites.length} sprites → ${outPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


