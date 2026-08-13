# safe-find-dsh-plugins

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> | <strong>English</strong>
</p>

A DSH Skill that finds plugins for your task across the entire GitHub
[`dsh-plugin` topic](https://github.com/topics/dsh-plugin), and runs a
[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) security scan
before installing anything.

## Install

1. Copy the skill directory into one DSH discovery root:

   ```bash
   # for all projects
   cp -r skills/safe-find-dsh-plugins "$DSH_HOME/skills/"

   # or for one project only
   cp -r skills/safe-find-dsh-plugins <project-root>/.agents/skills/
   ```

2. Install SkillSpector, which powers the pre-install security scan:

   ```bash
   uv tool install git+https://github.com/NVIDIA/skillspector.git
   ```

## How to use

Describe what you need in a DSH session, for example:

> Find me a DSH plugin that can control a browser.

The Skill searches the topic, shows you a short ranked shortlist, and waits for
your choice. Before installing the plugin you picked, it automatically scans
the pinned source and walks you through the result — safe sources proceed,
risky ones are flagged or blocked. Without SkillSpector installed, it refuses
to install and tells you what to do.

## Acknowledgements

- [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins) —
  the upstream project this Skill is forked from.
- [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) — the security
  scanner behind the install gate.

## License

MIT © 2026 Jinsong Zhou. See [`LICENSE`](LICENSE).
