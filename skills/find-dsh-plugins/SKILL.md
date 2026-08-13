---
name: find-dsh-plugins
description: >
  Use when a user wants to discover or install a DeepSeek Harness plugin, asks
  whether a plugin exists for a task, or wants to explore the DSH ecosystem.
  Searches public repositories in GitHub's dsh-plugin topic across all owners,
  ranks candidates against the requirement, asks the user to choose, determines
  the installation type from repository declarations, and verifies activation.
---

# Find and install DSH plugins

Treat GitHub's `dsh-plugin` topic as the primary discovery directory. Never use
one owner or organization as the complete ecosystem. Repository transfers must
resolve to the latest `fullName` and `url` returned by GitHub.

The task is complete only when the selected plugin is available in the user's
DSH installation, or when discovery clearly reports that no suitable plugin is
currently available.

## Step 1: Build the candidate pool

Extract 2–6 functional keywords from the user's requirement. For a non-English
request, retain useful original terms and add their common English ecosystem
terms. Pass the complete query as one argument; never interpolate user text into
shell syntax.

```sh
node <skill-directory>/scripts/search-topic.mjs \
  --query '<requirement and English functional keywords>' --limit 8 \
  > <temporary-directory>/dsh-plugins.json
```

Example: a request meaning "let the agent operate a browser" should use a query
such as `browser control browser automation browser tools` plus useful original
terms.

The script retrieves every public, active, non-fork repository tagged
`dsh-plugin`, follows GitHub pagination, and ranks repositories by term coverage
across name, description, and topics. Freshness and stars are weak secondary
signals and must not replace semantic judgment. CJK text is tokenized into
bigrams; English ecosystem terms improve recall for repositories documented only
in English.

Authentication is optional. The script uses `GITHUB_TOKEN`, then `GH_TOKEN`,
then the current `gh` login token. Without any token it uses GitHub's public API.
If rate-limited, run `gh auth login` and retry. Do not fall back to listing one
organization.

Completion check: `totalDiscovered` is greater than zero. When matches exist,
each candidate includes the current `fullName`, `url`, description, topics,
timestamps, and a `match` object containing score, coverage, and matched terms.
Results are deduplicated by `fullName`.

## Step 2: Inspect and rerank

Semantically rerank the first eight results. Prioritize requirement coverage and
scope, then compatibility, maintenance, and installation risk. Stars alone never
determine the winner. Exclude repositories that merely carry the topic but do
not document a DSH integration.

Inspect the README, `package.json`, and repository tree only for the most
relevant candidates. Classify installation as follows:

- `package.json` declares `dsh.bundle.patch`: `bundle`.
- One or more `SKILL.md` files exist with no bundle declaration: `skill`.
- The README explicitly requires a `cordis.patch.yml` entry with no bundle
  declaration: `cordis`.
- Only legacy `.dsh-plugin` or `repository` metadata exists: `migration needed`;
  do not install it as a current plugin.
- The type remains unclear: `needs verification`; do not invent an install
  command.

If the current account can read `dsh-external/hub/catalog.json`, its `note`,
`category`, and `managers` fields may supplement repository data. Accept a hub
entry only when its `url` exactly matches the current topic-search URL. A missing,
private, or stale hub never blocks discovery and never overrides the repository's
current declarations.

Present no more than three candidates in a table with name, one-line purpose,
last update, and installation type. Follow the table with one sentence explaining
the top recommendation. If nothing is suitable, say so clearly and ask whether
the user wants to create a new plugin instead.

## Step 3: Get the user's choice

Stop and wait for the user to select a candidate. If the user already named a
specific plugin, verify its current repository and installation type in Step 2,
then continue directly to installation.

## Step 4: Install

Open [references/install-methods.md](references/install-methods.md) and follow
the section for the verified installation type. When multiple methods exist,
use the priority documented at the top of that file.

Before changing the environment, read the repository's installation section and
all `package.json` lifecycle scripts. Git and npm dependencies may execute
`preinstall`, `install`, `postinstall`, or `prepare`. If a script performs an
unrelated download, writes outside expected DSH paths, or modifies shell
configuration, show the exact behavior and ask for confirmation first.

Completion check: configuration and dependencies are installed, and all install
commands complete without errors.

## Step 5: Verify activation

Long-running surfaces such as Web watch patch changes and may reload the plugin.
One-shot surfaces pick it up at their next start. Ask the user to confirm that the
expected UI, tool, or skill entry appears.

If it does not appear, inspect `hmr/config-update-failed`, a stale GitHub owner in
the Git spec, ref or path mistakes, and failed `pnpm install` output in the target
profile.

Completion check: the user confirms the plugin works, or receives the concrete
error together with the causes already ruled out.
