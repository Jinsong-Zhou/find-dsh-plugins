# safe-find-dsh-plugins

<p align="center">
  <strong>简体中文</strong> | <a href="README.md">English</a>
</p>

一个 DSH 插件：在整个 GitHub
[`dsh-plugin` topic](https://github.com/topics/dsh-plugin)
里为你的任务找插件，装之前先做一次安全扫描。

## 安装

把本仓库链接发给 DSH，说一句「帮我装上这个插件」就行。

手动安装时，把 `skills/safe-find-dsh-plugins/` 整个目录复制到
`$DSH_HOME/skills/`；只想给当前项目使用，则复制到
`<项目根>/.agents/skills/`。放好即生效，不需要其他配置。

## 它会怎么做

收到需求后，它会先把 topic 下的公开仓库全量拉一遍（归档和 fork
除外），按需求排序，只细看最匹配的几个，弄清各自该按哪种方式安装，
最后给你一份不超过三个候选的短名单。

你选定之后，它不会立刻动手：先锁定候选的具体 commit，再对这份源码做一次
静态安全扫描，全程不执行插件代码。扫描干净就继续；查出风险，它会把发现
逐条列给你，装不装由你决定；高危、扫描失败或扫描器缺失，一律不装。
最终进入你环境的，永远是被扫描过的那个 commit——即使你一开始就点名了
某个插件，这一步也不会跳过。

扫描器是一个独立依赖。第一次帮你装插件前，它会检查扫描器在不在，缺了会把
安装命令直接给你。

## 致谢

- fork 自 [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins)。
- 安全扫描由 [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)
  提供：`uv tool install git+https://github.com/NVIDIA/skillspector.git`。

## 许可证

MIT © 2026 Jinsong Zhou。详见 [`LICENSE`](LICENSE)。
