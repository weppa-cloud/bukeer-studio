#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'ai', 'agent-manifest.yaml')
const AUTOGEN_HEADER = '<!-- AUTO-GENERATED FROM CLAUDE.md. Run `npm run ai:sync` to update. -->\n\n'

const args = new Set(process.argv.slice(2))
const checkMode = args.has('--check')

function readConfig(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Invalid JSON-compatible YAML in ${path.relative(ROOT, filePath)}: ${error.message}`)
  }
}

function listImmediateDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return []
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return []
  const files = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(absolutePath)
      } else if (entry.isFile()) {
        files.push(absolutePath)
      }
    }
  }

  walk(dirPath)
  files.sort()
  return files
}

function applyReplacements(text, replacements) {
  let out = text
  for (const replacement of replacements) {
    if (!replacement?.from) continue
    out = out.split(replacement.from).join(replacement.to ?? '')
  }
  return out
}

function isMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.md' || ext === '.mdx'
}

function sameBuffer(a, b) {
  if (a.length !== b.length) return false
  return a.equals(b)
}

function createSyncState() {
  return {
    drifts: [],
    writes: [],
  }
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function upsertTextFile(state, filePath, content) {
  const next = Buffer.from(content, 'utf8')
  const exists = fs.existsSync(filePath)
  const current = exists ? fs.readFileSync(filePath) : null

  if (current && sameBuffer(current, next)) return

  if (checkMode) {
    state.drifts.push(`OUT_OF_SYNC ${path.relative(ROOT, filePath)}`)
    return
  }

  ensureParentDir(filePath)
  fs.writeFileSync(filePath, next)
  state.writes.push(`UPDATED ${path.relative(ROOT, filePath)}`)
}

function upsertBinaryFile(state, filePath, contentBuffer) {
  const exists = fs.existsSync(filePath)
  const current = exists ? fs.readFileSync(filePath) : null

  if (current && sameBuffer(current, contentBuffer)) return

  if (checkMode) {
    state.drifts.push(`OUT_OF_SYNC ${path.relative(ROOT, filePath)}`)
    return
  }

  ensureParentDir(filePath)
  fs.writeFileSync(filePath, contentBuffer)
  state.writes.push(`UPDATED ${path.relative(ROOT, filePath)}`)
}

function removePath(state, targetPath) {
  if (!fs.existsSync(targetPath)) return

  if (checkMode) {
    state.drifts.push(`STALE ${path.relative(ROOT, targetPath)}`)
    return
  }

  fs.rmSync(targetPath, { recursive: true, force: true })
  state.writes.push(`REMOVED ${path.relative(ROOT, targetPath)}`)
}

function syncDirectory(state, sourceDir, targetDir, replacements) {
  const sourceFiles = listFilesRecursive(sourceDir)
  const expectedRelativeFiles = new Set()

  for (const sourceFile of sourceFiles) {
    const relativeFromSource = path.relative(sourceDir, sourceFile)
    expectedRelativeFiles.add(relativeFromSource)

    const targetFile = path.join(targetDir, relativeFromSource)
    if (isMarkdown(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf8')
      const transformed = applyReplacements(raw, replacements)
      upsertTextFile(state, targetFile, transformed)
    } else {
      const raw = fs.readFileSync(sourceFile)
      upsertBinaryFile(state, targetFile, raw)
    }
  }

  const targetFiles = listFilesRecursive(targetDir)
  for (const targetFile of targetFiles) {
    const relativeFromTarget = path.relative(targetDir, targetFile)
    if (!expectedRelativeFiles.has(relativeFromTarget)) {
      removePath(state, targetFile)
    }
  }
}

function syncAgentsDoc(state, manifest, replacementSet) {
  const claudeFile = path.join(ROOT, manifest.sourceOfTruth.claudeFile)
  const agentsFile = path.join(ROOT, manifest.sourceOfTruth.agentsFile)

  const claudeRaw = fs.readFileSync(claudeFile, 'utf8')
  let agentsContent = applyReplacements(claudeRaw, replacementSet)

  if (!agentsContent.startsWith(AUTOGEN_HEADER)) {
    agentsContent = AUTOGEN_HEADER + agentsContent
  }

  upsertTextFile(state, agentsFile, agentsContent)
}

function syncSkills(state, manifest, replacementSet) {
  const sourceRoot = path.join(ROOT, manifest.skills.sourceDir)
  const targetRoot = path.join(ROOT, manifest.skills.targetDir)
  const preserve = new Set(manifest.skills.preserve ?? [])

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Skills source dir does not exist: ${manifest.skills.sourceDir}`)
  }

  fs.mkdirSync(targetRoot, { recursive: true })

  const managedSkills = listImmediateDirs(sourceRoot)
  const targetSkills = listImmediateDirs(targetRoot)

  for (const targetSkill of targetSkills) {
    if (!managedSkills.includes(targetSkill) && !preserve.has(targetSkill)) {
      removePath(state, path.join(targetRoot, targetSkill))
    }
  }

  for (const skillName of managedSkills) {
    const sourceDir = path.join(sourceRoot, skillName)
    const targetDir = path.join(targetRoot, skillName)
    syncDirectory(state, sourceDir, targetDir, replacementSet)
  }
}

function syncCommands(state, manifest, replacementSet, toolMapping) {
  const sourceRoot = path.join(ROOT, manifest.commands.sourceDir)
  const targetRoot = path.join(ROOT, manifest.commands.targetDir)

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Commands source dir does not exist: ${manifest.commands.sourceDir}`)
  }

  fs.mkdirSync(targetRoot, { recursive: true })

  const sourceCommandFiles = listFilesRecursive(sourceRoot)
  const expected = new Set()

  for (const sourceFile of sourceCommandFiles) {
    const relativeFromSource = path.relative(sourceRoot, sourceFile)
    expected.add(relativeFromSource)

    const targetFile = path.join(targetRoot, relativeFromSource)
    if (isMarkdown(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf8')
      const mapped = applyReplacements(raw, toolMapping.replacements ?? [])
      const transformed = applyReplacements(mapped, replacementSet)
      upsertTextFile(state, targetFile, transformed)
    } else {
      const raw = fs.readFileSync(sourceFile)
      upsertBinaryFile(state, targetFile, raw)
    }
  }

  const existingTargetFiles = listFilesRecursive(targetRoot)
  for (const targetFile of existingTargetFiles) {
    const relativeFromTarget = path.relative(targetRoot, targetFile)
    if (!expected.has(relativeFromTarget)) {
      removePath(state, targetFile)
    }
  }
}

function syncRules(state, manifest, replacementSet) {
  if (!manifest.rules) return

  const sourceRoot = path.join(ROOT, manifest.rules.sourceDir)
  const targetRoot = path.join(ROOT, manifest.rules.targetDir)

  if (!fs.existsSync(sourceRoot)) {
    removePath(state, targetRoot)
    return
  }

  fs.mkdirSync(targetRoot, { recursive: true })
  syncDirectory(state, sourceRoot, targetRoot, replacementSet)
}

function validateMcp(manifest) {
  const mcpConfigPath = path.join(ROOT, manifest.mcp.configFile)
  if (!fs.existsSync(mcpConfigPath)) {
    throw new Error(`MCP config missing: ${manifest.mcp.configFile}`)
  }

  const mcpRaw = fs.readFileSync(mcpConfigPath, 'utf8')
  const mcp = JSON.parse(mcpRaw)
  const configured = new Set(Object.keys(mcp.mcpServers ?? {}))
  const expected = manifest.mcp.expectedServers ?? []

  const missing = expected.filter((server) => !configured.has(server))
  if (missing.length > 0) {
    throw new Error(`Missing MCP servers in ${manifest.mcp.configFile}: ${missing.join(', ')}`)
  }
}

function run() {
  const manifest = readConfig(MANIFEST_PATH)
  const toolMappingPath = path.join(ROOT, manifest.toolMappingFile)
  const toolMapping = readConfig(toolMappingPath)

  const commonReplacements = manifest.replacements.common ?? []
  const agentsReplacements = manifest.replacements.agents ?? []
  const skillsReplacements = manifest.replacements.skills ?? []
  const commandReplacements = manifest.replacements.commands ?? []
  const ruleReplacements = manifest.replacements.rules ?? []

  const state = createSyncState()

  validateMcp(manifest)

  syncAgentsDoc(state, manifest, [...commonReplacements, ...agentsReplacements])
  syncSkills(state, manifest, [...commonReplacements, ...skillsReplacements])
  syncCommands(state, manifest, [...commonReplacements, ...commandReplacements], toolMapping)
  syncRules(state, manifest, [...commonReplacements, ...ruleReplacements])

  if (checkMode) {
    if (state.drifts.length > 0) {
      console.error('AI sync drift detected:')
      for (const drift of state.drifts) {
        console.error(`- ${drift}`)
      }
      console.error('Run: npm run ai:sync')
      process.exit(1)
    }

    console.log('AI sync check passed.')
    return
  }

  if (state.writes.length === 0) {
    console.log('AI sync: no changes.')
    return
  }

  console.log(`AI sync: updated ${state.writes.length} item(s).`)
  for (const item of state.writes) {
    console.log(`- ${item}`)
  }
}

run()
