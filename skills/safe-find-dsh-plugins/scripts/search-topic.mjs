#!/usr/bin/env node

/** Discover `dsh-plugin` repositories and optionally rank them by requirement. */

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const TOPIC = 'dsh-plugin'
const PAGE_SIZE = 100
const MAX_PAGES = 10
const DEFAULT_LIMIT = 5
const EXCLUDED_REPOSITORIES = new Set(['deepseek-ai/deepseek-harness'])
const STOP_WORDS = new Set([
  'dsh', 'plugin', 'plugins', 'deepseek', 'harness',
  '插件', '有没有', '帮我', '想要', '需要', '可以', '能够',
])

function parseArgs(argv) {
  const options = { query: '', limit: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--query' || arg === '-q') {
      const value = argv[index + 1]
      if (value === undefined) throw new Error(`${arg} requires a value`)
      options.query = value.trim()
      if (options.query === '') throw new Error(`${arg} cannot be empty`)
      index += 1
    } else if (arg === '--limit' || arg === '-n') {
      const value = Number(argv[index + 1])
      if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new Error(`${arg} must be an integer from 1 to 100`)
      options.limit = value
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  return options
}

function cjkBigrams(value) {
  const chunks = value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu) ?? []
  return chunks.flatMap((chunk) => chunk.length <= 2
    ? [chunk]
    : Array.from({ length: chunk.length - 1 }, (_, index) => chunk.slice(index, index + 2)))
}

export function tokenize(value) {
  const normalized = value.toLocaleLowerCase().normalize('NFKC')
  const words = normalized.match(/[\p{Script=Latin}\p{N}][\p{Script=Latin}\p{N}._+-]*/gu) ?? []
  return [...new Set([...words, ...cjkBigrams(normalized)]
    .filter((token) => token.length > 1 && token !== TOPIC && !STOP_WORDS.has(token)))]
}

function daysSince(date, now) {
  const timestamp = Date.parse(date)
  return Number.isFinite(timestamp) ? Math.max(0, (now - timestamp) / 86_400_000) : Number.POSITIVE_INFINITY
}

export function rankRepositories(repositories, query, now = Date.now()) {
  const normalizedQuery = query.toLocaleLowerCase().normalize('NFKC').trim()
  const queryTokens = tokenize(query)
  return repositories
    .map((repository) => {
      const name = String(repository.name ?? '').toLocaleLowerCase().normalize('NFKC')
      const description = String(repository.description ?? '').toLocaleLowerCase().normalize('NFKC')
      const topics = Array.isArray(repository.topics)
        ? repository.topics.map((topic) => String(topic).toLocaleLowerCase().normalize('NFKC'))
        : []
      const searchable = `${name} ${description} ${topics.join(' ')}`
      let relevance = normalizedQuery !== '' && searchable.includes(normalizedQuery) ? 16 : 0
      const matchedTerms = []
      for (const token of queryTokens) {
        let tokenScore = 0
        if (name === token) tokenScore += 10
        else if (name.includes(token)) tokenScore += 7
        if (topics.some((topic) => topic === token)) tokenScore += 6
        else if (topics.some((topic) => topic.includes(token))) tokenScore += 3
        if (description.includes(token)) tokenScore += 4
        if (tokenScore > 0) matchedTerms.push(token)
        relevance += tokenScore
      }
      const coverage = queryTokens.length === 0 ? 0 : matchedTerms.length / queryTokens.length
      relevance += coverage * 12
      const score = relevance
        + Math.max(0, 3 - daysSince(repository.pushedAt, now) / 180)
        + Math.min(3, Math.log10(Math.max(0, Number(repository.stars) || 0) + 1))
      return {
        ...repository,
        match: {
          score: Number(score.toFixed(3)),
          relevance: Number(relevance.toFixed(3)),
          coverage: Number(coverage.toFixed(3)),
          matchedTerms,
        },
      }
    })
    .filter((repository) => normalizedQuery === '' || repository.match.relevance > 0)
    .sort((left, right) => right.match.score - left.match.score
      || Date.parse(right.pushedAt) - Date.parse(left.pushedAt)
      || String(left.fullName).localeCompare(String(right.fullName)))
}

function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 5_000 }).trim()
  } catch {
    return ''
  }
}

export async function fetchRepositories({ token = resolveToken(), fetchImpl = fetch } = {}) {
  const repositories = []
  const seen = new Set()
  const query = `topic:${TOPIC} is:public archived:false fork:false`
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL('https://api.github.com/search/repositories')
    url.searchParams.set('q', query)
    url.searchParams.set('sort', 'updated')
    url.searchParams.set('order', 'desc')
    url.searchParams.set('per_page', String(PAGE_SIZE))
    url.searchParams.set('page', String(page))
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'safe-find-dsh-plugins',
      'x-github-api-version': '2022-11-28',
    }
    if (token !== '') headers.authorization = `Bearer ${token}`
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) {
      const hint = response.headers?.get?.('x-ratelimit-remaining') === '0'
        ? ' GitHub rate limit reached; run gh auth login or set GH_TOKEN and retry.'
        : ''
      throw new Error(`GitHub topic search failed (${response.status}).${hint}`)
    }
    const body = await response.json()
    if (!Array.isArray(body.items)) throw new Error('GitHub topic search returned no items array')
    for (const repo of body.items) {
      if (repo?.archived === true || repo?.disabled === true || repo?.fork === true) continue
      if (!Array.isArray(repo?.topics) || !repo.topics.includes(TOPIC)) continue
      if (typeof repo?.full_name !== 'string') continue
      const normalizedFullName = repo.full_name.toLowerCase()
      if (EXCLUDED_REPOSITORIES.has(normalizedFullName) || seen.has(normalizedFullName)) continue
      seen.add(normalizedFullName)
      repositories.push({
        fullName: repo.full_name,
        name: repo.name,
        url: repo.html_url,
        description: repo.description ?? '',
        topics: repo.topics,
        language: repo.language,
        pushedAt: repo.pushed_at,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
        stars: repo.stargazers_count,
      })
    }
    const total = typeof body.total_count === 'number' ? body.total_count : body.items.length
    if (page * PAGE_SIZE >= total || body.items.length < PAGE_SIZE) break
  }
  return repositories
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    process.stdout.write('Usage: search-topic.mjs [--query <requirement>] [--limit <1-100>]\n')
    return
  }
  const repositories = await fetchRepositories()
  const ranked = options.query === '' ? repositories : rankRepositories(repositories, options.query)
  const selected = options.limit === undefined
    ? (options.query === '' ? ranked : ranked.slice(0, DEFAULT_LIMIT))
    : ranked.slice(0, options.limit)
  process.stdout.write(`${JSON.stringify({
    topic: TOPIC,
    query: options.query || null,
    totalDiscovered: repositories.length,
    matched: ranked.length,
    repositories: selected,
  }, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`safe-find-dsh-plugins: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
