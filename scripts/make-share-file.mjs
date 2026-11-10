import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const index = await readFile(join(dist, 'index.html'), 'utf8')

const cssMatch = index.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)
const scriptMatch = index.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)

if (!cssMatch || !scriptMatch) {
  throw new Error('Could not find Vite CSS and JavaScript assets in dist/index.html')
}

const css = await readFile(join(dist, cssMatch[1].replace(/^\//, '')), 'utf8')
const script = await readFile(join(dist, scriptMatch[1].replace(/^\//, '')), 'utf8')
const safeScript = script.replaceAll('</script>', '<\\u002fscript>')
const shareFile = index
  .replace(cssMatch[0], `<style>${css}</style>`)
  .replace(scriptMatch[0], `<script type="module">${safeScript}__THRIVE_SCRIPT_END__`)
  .replaceAll('</script>', '<\\u002fscript>')
  .replace('__THRIVE_SCRIPT_END__', '</script>')

await writeFile(join(dist, 'student-thrive-share.html'), shareFile)
console.log('Created dist/student-thrive-share.html')