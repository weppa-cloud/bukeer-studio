import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "../..")
const shadcnBin = join(root, "node_modules/.bin/shadcn")
const sourceRegistry = join(root, "docs/design/human-agent-v0/registry/registry.json")
const docsDist = join(root, "docs/design/human-agent-v0/registry-dist")
const publicDist = join(root, "public/r/bukeer-admin-next")

rmSync(docsDist, { recursive: true, force: true })
execFileSync(shadcnBin, ["build", sourceRegistry, "--output", docsDist], {
  cwd: root,
  stdio: "inherit",
})

rmSync(publicDist, { recursive: true, force: true })
mkdirSync(publicDist, { recursive: true })
cpSync(docsDist, publicDist, { recursive: true })

console.log(`Bukeer v0 registry built: ${docsDist}`)
console.log(`Bukeer v0 registry public copy: ${publicDist}`)
