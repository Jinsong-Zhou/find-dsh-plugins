#!/usr/bin/env node

/**
 * Security gate for DSH plugin installation, backed by NVIDIA SkillSpector.
 *
 * Scans a pinned candidate source before installation and normalizes the
 * scanner's recommendation into a gate decision. Fails closed: a missing
 * scanner, a failed scan, an unverifiable commit, or an unreadable report
 * all block installation.
 *
 * Exit codes: 0 allow (SAFE), 1 confirm (CAUTION), 2 block (DO_NOT_INSTALL),
 * 3 fail closed (error, scanner unavailable, or pin mismatch).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const GATE_EXIT_CODES = { allow: 0, confirm: 1, block: 2, error: 3 }

export function parseArgs(argv) {
  const options = { target: '', expectedCommit: '', report: 'skillspector-report.json', llm: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--target' || arg === '-t') {
      const value = argv[index + 1]
      if (value === undefined || value.trim() === '') throw new Error(`${arg} requires a value`)
      options.target = value.trim()
      index += 1
    } else if (arg === '--expected-commit' || arg === '-c') {
      const value = String(argv[index + 1] ?? '').trim()
      if (!COMMIT_SHA_PATTERN.test(value)) throw new Error(`${arg} must be a full 40-character commit SHA`)
      options.expectedCommit = value.toLowerCase()
      index += 1
    } else if (arg === '--report' || arg === '-o') {
      const value = argv[index + 1]
      if (value === undefined || value.trim() === '') throw new Error(`${arg} requires a value`)
      options.report = value.trim()
      index += 1
    } else if (arg === '--llm') {
      options.llm = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (!options.help && options.target === '') throw new Error('--target is required')
  return options
}

export function classifyTarget(target) {
  if (/^(https?|ssh|git):\/\//i.test(target) || /^git@[^:]+:/.test(target)) {
    return /\.zip($|\?)/i.test(target) ? 'remote-archive' : 'remote-git'
  }
  return 'local'
}

/**
 * Map a SkillSpector JSON report to a gate decision. `llmRequested` marks a
 * scan where LLM analysis was required; a report produced without it is then
 * incomplete evidence and fails closed.
 */
export function evaluateReport(report, { llmRequested = false } = {}) {
  const assessment = report?.risk_assessment
  const metadata = report?.metadata ?? {}
  const recommendation = typeof assessment?.recommendation === 'string'
    ? assessment.recommendation.toUpperCase()
    : ''
  const llmUsed = metadata.llm_requested === true && metadata.llm_available !== false && !metadata.llm_error
  const base = {
    recommendation: recommendation || null,
    riskScore: typeof assessment?.score === 'number' ? assessment.score : null,
    severity: typeof assessment?.severity === 'string' ? assessment.severity : null,
    scanMode: llmUsed ? 'llm' : 'static',
    scannerVersion: typeof metadata.skillspector_version === 'string' ? metadata.skillspector_version : null,
  }
  if (llmRequested && !llmUsed) {
    return {
      ...base,
      gate: 'error',
      reason: `LLM analysis was requested but did not run${metadata.llm_error ? `: ${metadata.llm_error}` : ''}; the report is incomplete evidence`,
    }
  }
  if (recommendation === 'SAFE') {
    return { ...base, gate: 'allow', reason: 'scanner recommendation SAFE; confirm the pinned source before installing' }
  }
  if (recommendation === 'CAUTION') {
    return { ...base, gate: 'confirm', reason: 'scanner recommendation CAUTION; show the findings and require explicit risk acceptance' }
  }
  if (recommendation === 'DO_NOT_INSTALL') {
    return { ...base, gate: 'block', reason: 'scanner recommendation DO_NOT_INSTALL; do not install this source' }
  }
  return { ...base, gate: 'error', reason: 'report has no recognizable recommendation; failing closed' }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
}

function resolveScannerVersion() {
  try {
    return run('skillspector', ['--version'], { timeout: 15_000 }).trim()
  } catch {
    return null
  }
}

/** Clone the remote repository and detach onto the pinned commit. */
function checkoutPinnedCommit(url, expectedCommit, workDirectory) {
  run('git', ['clone', '--quiet', '--no-checkout', '--', url, workDirectory], { timeout: 300_000 })
  try {
    run('git', ['-C', workDirectory, 'checkout', '--quiet', '--detach', expectedCommit], { timeout: 60_000 })
  } catch {
    throw new Error(`--expected-commit ${expectedCommit} was not found in ${url}`)
  }
  const head = run('git', ['-C', workDirectory, 'rev-parse', 'HEAD'], { timeout: 15_000 }).trim().toLowerCase()
  if (head !== expectedCommit) throw new Error(`checked-out commit ${head} does not match --expected-commit ${expectedCommit}`)
  rmSync(join(workDirectory, '.git'), { recursive: true, force: true })
  return head
}

function verifyLocalCommit(directory, expectedCommit) {
  const head = run('git', ['-C', directory, 'rev-parse', 'HEAD'], { timeout: 15_000 }).trim().toLowerCase()
  if (head !== expectedCommit) throw new Error(`local HEAD ${head} does not match --expected-commit ${expectedCommit}`)
  const status = run('git', ['-C', directory, 'status', '--porcelain'], { timeout: 15_000 }).trim()
  if (status !== '') throw new Error('local working tree has uncommitted changes; the scan would not describe the pinned commit')
  return head
}

function runScan(scanPath, reportPath, llm) {
  const args = ['scan', scanPath, '--format', 'json', '--output', reportPath]
  if (!llm) args.push('--no-llm')
  try {
    run('skillspector', args, { timeout: 1_800_000 })
  } catch (error) {
    // Exit 1 still means the scan completed (risk_score > 50); only other
    // failures are scanner errors.
    if (error?.status !== 1) {
      const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : ''
      throw new Error(`skillspector scan failed${stderr ? `: ${stderr.split('\n').at(-1)}` : ''}`)
    }
  }
  return JSON.parse(readFileSync(reportPath, 'utf8'))
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = GATE_EXIT_CODES[result.gate] ?? GATE_EXIT_CODES.error
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(
      'Usage: security-review.mjs --target <git-url|directory> [--expected-commit <sha>]\n'
      + '                          [--report <path>] [--llm]\n\n'
      + 'Exit codes: 0 allow, 1 confirm (caution), 2 block, 3 fail closed.\n',
    )
    return
  }
  const result = {
    target: options.target,
    targetType: classifyTarget(options.target),
    expectedCommit: options.expectedCommit || null,
    scannedCommit: null,
    reportPath: resolve(options.report),
  }
  if (resolveScannerVersion() === null) {
    emit({
      ...result,
      gate: 'error',
      reason: 'skillspector CLI not found; install it first: uv tool install git+https://github.com/NVIDIA/skillspector.git',
    })
    return
  }
  if (result.targetType === 'remote-archive') {
    emit({ ...result, gate: 'error', reason: 'remote archives cannot be commit-pinned; clone the Git repository or download and scan a local copy' })
    return
  }
  let workDirectory = null
  try {
    let scanPath = options.target
    if (result.targetType === 'remote-git') {
      if (options.expectedCommit === '') throw new Error('--expected-commit is required for remote Git targets')
      workDirectory = mkdtempSync(join(tmpdir(), 'dsh-security-review-'))
      result.scannedCommit = checkoutPinnedCommit(options.target, options.expectedCommit, workDirectory)
      scanPath = workDirectory
    } else {
      if (!existsSync(options.target)) throw new Error(`local target does not exist: ${options.target}`)
      if (options.expectedCommit !== '') result.scannedCommit = verifyLocalCommit(options.target, options.expectedCommit)
    }
    const report = runScan(scanPath, result.reportPath, options.llm)
    emit({ ...result, ...evaluateReport(report, { llmRequested: options.llm }) })
  } catch (error) {
    emit({ ...result, gate: 'error', reason: error instanceof Error ? error.message : String(error) })
  } finally {
    if (workDirectory !== null) rmSync(workDirectory, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`security-review: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = GATE_EXIT_CODES.error
  })
}
