# safe-find-dsh-plugins

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> | <strong>English</strong>
</p>

`safe-find-dsh-plugins` is a DSH Skill that turns a task description into a short,
inspectable plugin shortlist. It searches every public repository carrying the
GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin), ranks likely
matches, verifies how each candidate integrates with current DSH, and places a
security gate in front of installation.

## Safety before convenience

A GitHub topic is a discovery signal, not a trust mark. Before this Skill installs
any selected repository, it runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)
against the pinned candidate source. SkillSpector performs static security
analysis without executing the scanned plugin and can optionally add semantic
LLM review.

The install gate follows the scanner's machine-readable recommendation:

| Recommendation | Action |
|---|---|
| `SAFE` | Installation may proceed after the user confirms the pinned source. |
| `CAUTION` | Show the report and require explicit risk acceptance. |
| `DO_NOT_INSTALL` | Block installation. |
| Scan error or unavailable scanner | Fail closed; do not install. |

A scan is evidence for one source revision and one scanner version. The Skill
pins the reviewed commit and refuses to treat a report for another revision as
approval. SkillSpector is defense in depth, not a sandbox or a guarantee that a
plugin is harmless.

## Install this Skill

The repository uses DSH's one-level Skill bundle layout:

```text
skills/safe-find-dsh-plugins/
├── SKILL.md
├── references/
└── scripts/
```

Copy that complete directory into one DSH discovery root:

```text
$DSH_HOME/skills/safe-find-dsh-plugins/
```

or, for one project only:

```text
<project-root>/.agents/skills/safe-find-dsh-plugins/
```

This is a Skill distribution rather than a Cordis profile bundle, so the
repository does not need a root `package.json`, `dsh.bundle`, or
`cordis.patch.yml`.

## Prerequisite: NVIDIA SkillSpector

Install SkillSpector with `uv` before asking the Skill to install third-party
plugins:

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

The bundled gate script checks for the CLI, runs a static scan, and normalizes the
JSON recommendation:

```bash
node skills/safe-find-dsh-plugins/scripts/security-review.mjs \
  --target https://github.com/owner/plugin \
  --expected-commit <full-commit-sha> \
  --report ./skillspector-report.json
```

The script clones the repository, checks out the pinned commit, scans that
checkout, and prints a normalized JSON decision. Exit codes: `0` allow (`SAFE`),
`1` confirm (`CAUTION`), `2` block (`DO_NOT_INSTALL`), `3` fail closed (scanner
missing, scan error, or commit mismatch).

Use `--llm` only when the configured SkillSpector provider is approved to receive
plugin file contents. Static mode still sends declared dependency coordinates to
OSV.dev when live vulnerability lookup is available. See SkillSpector's trust
model for the exact data-egress behavior.

## Discovery CLI

The search helper can be used independently:

```bash
node skills/safe-find-dsh-plugins/scripts/search-topic.mjs \
  --query "browser control browser automation" --limit 5
```

It returns JSON with discovery totals, ranked repositories, term coverage, and
matched terms. The Skill then reads the strongest candidates' repository files,
checks current DSH compatibility, asks the user to select one, pins a commit,
runs the security gate, and only then follows the verified installation method.

## Verification

```bash
node --test skills/safe-find-dsh-plugins/scripts/*.test.mjs
```

## Acknowledgements

This project builds on the work of two repositories:

- [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins) —
  the upstream project this Skill is forked from; it established the
  topic-based discovery workflow, the ranking script, and the installation
  reference.
- [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) — the security
  scanner behind the install gate; its recommendation contract (`SAFE` /
  `CAUTION` / `DO_NOT_INSTALL`) and trust model shaped the fail-closed review
  step in this Skill.

## License

MIT © 2026 Jinsong Zhou. See [`LICENSE`](LICENSE).
