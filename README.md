# safe-find-dsh-plugins

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> | <strong>English</strong>
</p>

A DSH plugin that finds plugins for your task across the entire GitHub
[`dsh-plugin` topic](https://github.com/topics/dsh-plugin), with a security
scan before anything gets installed.

## Install

Send this repository link to DSH and say "install this plugin for me".

To install manually, copy the whole `skills/safe-find-dsh-plugins/` directory
into `$DSH_HOME/skills/`, or into `<project-root>/.agents/skills/` for one
project only. Once it's in place it just works — no other configuration.

## What it does

Given your request, it first pulls every public repository under the topic
(skipping archives and forks), ranks them against what you asked for, takes a
close look at only the best few, works out how each one is meant to be
installed, and hands you a shortlist of at most three candidates.

After you pick one, it doesn't install right away: it pins the candidate's
exact commit, then runs a static security scan over that source — plugin code
is never executed. A clean scan moves ahead; if risks turn up, every finding
is laid out for you and the decision is yours; high-risk results, failed
scans, or a missing scanner never install. What ends up in your environment is
always the exact commit that was scanned — and this step is never skipped,
even when you named the plugin yourself from the start.

The scanner is a separate dependency. Before installing a plugin for you the
first time, it checks whether the scanner is present and hands you the install
command if not.

## Acknowledgements

- Forked from [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins).
- Security scanning is powered by
  [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector):
  `uv tool install git+https://github.com/NVIDIA/skillspector.git`.

## License

MIT © 2026 Jinsong Zhou. See [`LICENSE`](LICENSE).
