import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as esbuild from 'esbuild'

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(root, 'src')

const [jsBuild, cssBuild] = await Promise.all([
  esbuild.build({
    entryPoints: [path.join(src, 'main.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    loader: {
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
    },
    write: false,
  }),
  esbuild.build({
    entryPoints: [path.join(src, 'style.css')],
    bundle: true,
    minify: true,
    loader: {
      '.woff2': 'dataurl',
      '.woff': 'dataurl',
    },
    write: false,
  }),
])

const template = await readFile(path.join(src, 'index.template.html'), 'utf8')
const appCode = jsBuild.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
const styleCode = cssBuild.outputFiles[0].text
const html = template
  .replace('/*__STYLE__*/', () => styleCode)
  .replace('/*__APP__*/', () => appCode)

const outputPath = path.join(root, 'index.html')
await writeFile(outputPath, html, 'utf8')
// 博物馆总览已经拆到 museum/index.html；museum.html 只保留一个跳转页，
// build 不再覆盖它。

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)
console.log(`built ${outputPath}`)
console.log(`single-file build: ${kb} KiB (js ${(jsBuild.outputFiles[0].text.length / 1024).toFixed(1)} KiB, css ${(styleCode.length / 1024).toFixed(1)} KiB)`)
