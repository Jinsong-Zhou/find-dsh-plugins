# safe-find-dsh-plugins

<p align="center">
  <strong>简体中文</strong> | <a href="README.md">English</a>
</p>

一个 DSH Skill：在整个 GitHub [`dsh-plugin` topic](https://github.com/topics/dsh-plugin)
范围内为你的任务寻找插件，并在安装前使用
[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) 做安全扫描。

## 安装

1. 把 skill 目录复制到任意一个 DSH 发现目录：

   ```bash
   # 所有项目可用
   cp -r skills/safe-find-dsh-plugins "$DSH_HOME/skills/"

   # 或仅用于当前项目
   cp -r skills/safe-find-dsh-plugins <project-root>/.agents/skills/
   ```

2. 安装 SkillSpector（安装前安全扫描依赖它）：

   ```bash
   uv tool install git+https://github.com/NVIDIA/skillspector.git
   ```

## 怎么用

在 DSH 会话中直接描述需求，例如：

> 帮我找一个能控制浏览器的 DSH 插件。

Skill 会搜索 topic、给出一份排序后的候选短名单，等你选择。在安装你选中的插件之前，
它会自动扫描锁定版本的源码并告诉你结果——安全的继续安装，有风险的会提示或阻止。
如果没装 SkillSpector，它会拒绝安装并告诉你怎么装。

## 致谢

- [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins) ——
  本 Skill fork 自该上游项目。
- [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) ——
  安装门禁背后的安全扫描器。

## 许可证

MIT © 2026 Jinsong Zhou。详见 [`LICENSE`](LICENSE)。
