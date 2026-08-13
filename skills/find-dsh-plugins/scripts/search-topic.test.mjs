import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchRepositories, rankRepositories, tokenize } from './search-topic.mjs'

test('tokenize handles Latin and CJK requirements', () => {
  assert.deepEqual(tokenize('Browser automation'), ['browser', 'automation'])
  const chinese = tokenize('有没有 DSH 插件能够浏览器自动化')
  assert.ok(chinese.includes('浏览'))
  assert.ok(chinese.includes('自动'))
  assert.ok(!chinese.includes('dsh'))
  assert.ok(!chinese.includes('插件'))
  assert.ok(!chinese.includes('有没有dsh插件能够浏览器自动化'))
})

test('rankRepositories favors semantic coverage over popularity', () => {
  const now = Date.parse('2026-08-14T00:00:00Z')
  const ranked = rankRepositories([
    {
      fullName: 'example/browser', name: 'dsh-browser', description: 'Browser automation tools',
      topics: ['dsh-plugin', 'browser-tools', 'automation'], pushedAt: '2026-08-13T00:00:00Z', stars: 2,
    },
    {
      fullName: 'example/theme', name: 'popular-theme', description: 'A colorful web theme',
      topics: ['dsh-plugin', 'theme'], pushedAt: '2026-08-13T00:00:00Z', stars: 10_000,
    },
  ], 'browser automation', now)
  assert.equal(ranked[0].fullName, 'example/browser')
  assert.deepEqual(ranked[0].match.matchedTerms, ['browser', 'automation'])
  assert.equal(ranked.length, 1)
})

test('fetchRepositories paginates, filters, and deduplicates', async () => {
  const pages = [
    {
      total_count: 101,
      items: Array.from({ length: 100 }, (_, index) => ({
        full_name: `owner/repo-${index}`,
        name: `repo-${index}`,
        html_url: `https://github.com/owner/repo-${index}`,
        topics: ['dsh-plugin'],
        archived: index === 0,
        disabled: false,
        fork: index === 1,
        description: '', language: null, pushed_at: '2026-08-13', updated_at: '2026-08-13',
        default_branch: 'main', stargazers_count: 0,
      })),
    },
    {
      total_count: 101,
      items: [
        {
          full_name: 'owner/repo-2', name: 'repo-2', html_url: 'https://github.com/owner/repo-2',
          topics: ['dsh-plugin'], archived: false, disabled: false, fork: false,
          description: '', language: null, pushed_at: '2026-08-13', updated_at: '2026-08-13',
          default_branch: 'main', stargazers_count: 0,
        },
        {
          full_name: 'owner/final', name: 'final', html_url: 'https://github.com/owner/final',
          topics: ['dsh-plugin'], archived: false, disabled: false, fork: false,
          description: '', language: null, pushed_at: '2026-08-13', updated_at: '2026-08-13',
          default_branch: 'main', stargazers_count: 0,
        },
      ],
    },
  ]
  let calls = 0
  const fetchImpl = async () => ({
    ok: true,
    json: async () => pages[calls++],
    headers: { get: () => null },
  })
  const repositories = await fetchRepositories({ token: '', fetchImpl })
  assert.equal(calls, 2)
  assert.equal(repositories.length, 99)
  assert.equal(repositories.at(-1).fullName, 'owner/final')
})
