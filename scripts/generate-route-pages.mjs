import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const arenaSource = await readFile(resolve(projectRoot, 'src/data/arenas.ts'), 'utf8')
const routeSlugs = [...arenaSource.matchAll(/\bslug:\s*'([a-z0-9-]+)'/g)]
  .map(([, slug]) => slug)

if (routeSlugs.length === 0) {
  throw new Error('No arena routes found in src/data/arenas.ts')
}

const distDirectory = resolve(projectRoot, 'dist')
const indexHtml = await readFile(resolve(distDirectory, 'index.html'), 'utf8')

await Promise.all(routeSlugs.map(async (slug) => {
  const routeDirectory = resolve(distDirectory, slug)
  await mkdir(routeDirectory, { recursive: true })
  await writeFile(resolve(routeDirectory, 'index.html'), indexHtml)
}))

console.log(`Generated ${routeSlugs.length} arena route pages.`)
