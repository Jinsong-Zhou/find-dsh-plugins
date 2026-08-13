import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyTarget, evaluateReport, parseArgs } from './security-review.mjs'

test('parseArgs requires a target and validates the pinned commit', () => {
  assert.throws(() => parseArgs([]), /--target is required/)
  assert.throws(() => parseArgs(['--target', 'https://github.com/o/r', '--expected-commit', 'abc123']), /full 40-character/)
  const sha = 'a'.repeat(40)
  const options = parseArgs(['--target', 'https://github.com/o/r', '--expected-commit', sha.toUpperCase(), '--report', 'out.json', '--llm'])
  assert.deepEqual(options, { target: 'https://github.com/o/r', expectedCommit: sha, report: 'out.json', llm: true })
})

test('classifyTarget separates git remotes, remote archives, and local paths', () => {
  assert.equal(classifyTarget('https://github.com/owner/plugin'), 'remote-git')
  assert.equal(classifyTarget('git@github.com:owner/plugin.git'), 'remote-git')
  assert.equal(classifyTarget('https://example.com/plugin.zip'), 'remote-archive')
  assert.equal(classifyTarget('./candidates/plugin'), 'local')
})

test('evaluateReport maps recommendations to gate decisions', () => {
  const report = (recommendation) => ({
    risk_assessment: { score: 42, severity: 'MEDIUM', recommendation },
    metadata: { skillspector_version: '2.0.0', llm_requested: false },
  })
  assert.equal(evaluateReport(report('SAFE')).gate, 'allow')
  assert.equal(evaluateReport(report('CAUTION')).gate, 'confirm')
  assert.equal(evaluateReport(report('DO_NOT_INSTALL')).gate, 'block')
  assert.equal(evaluateReport(report('SOMETHING_NEW')).gate, 'error')
  assert.equal(evaluateReport(null).gate, 'error')
  assert.equal(evaluateReport(report('CAUTION')).riskScore, 42)
  assert.equal(evaluateReport(report('CAUTION')).scanMode, 'static')
})

test('evaluateReport fails closed when requested LLM analysis did not run', () => {
  const degraded = {
    risk_assessment: { score: 0, severity: 'LOW', recommendation: 'SAFE' },
    metadata: { llm_requested: true, llm_available: false, llm_error: 'no credentials' },
  }
  const result = evaluateReport(degraded, { llmRequested: true })
  assert.equal(result.gate, 'error')
  assert.match(result.reason, /no credentials/)

  const full = {
    risk_assessment: { score: 0, severity: 'LOW', recommendation: 'SAFE' },
    metadata: { llm_requested: true, llm_available: true },
  }
  const ok = evaluateReport(full, { llmRequested: true })
  assert.equal(ok.gate, 'allow')
  assert.equal(ok.scanMode, 'llm')
})
