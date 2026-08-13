# safe-find-dsh-plugins

<p align="center">
  <strong>简体中文</strong> | <a href="README.md">English</a>
</p>

`safe-find-dsh-plugins` 是一个 DSH Skill：它把用户的任务需求转换为一份短而可审查的插件候选清单。它会搜索 GitHub 上所有带有 [`dsh-plugin` topic](https://github.com/topics/dsh-plugin) 的公开仓库，按需求排序，核对候选是否兼容当前 DSH，并在安装之前强制执行安全检查。

## 安全优先

GitHub topic 只是发现信号，不代表官方背书或安全认证。安装任何候选仓库之前，本 Skill 都会使用 [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) 扫描锁定版本的源码。SkillSpector 不会执行被扫描插件；它进行静态安全分析，并可选地增加 LLM 语义审查。

安装门禁按扫描器的机器可读建议执行：

| 建议 | 行为 |
|---|---|
| `SAFE` | 用户确认锁定版本后可以继续安装。 |
| `CAUTION` | 展示报告，并要求用户明确接受风险。 |
| `DO_NOT_INSTALL` | 阻止安装。 |
| 扫描失败或扫描器不可用 | 失败关闭，不安装。 |

扫描报告只对特定源码版本和特定扫描器版本有效。Skill 会锁定通过审查的 commit，不会拿其他版本的报告当作当前版本的安全凭据。SkillSpector 是纵深防御工具，不是沙箱，也不保证插件绝对安全。

## 安装本 Skill

仓库采用 DSH 官方的一层 Skill bundle 结构：

```text
skills/safe-find-dsh-plugins/
├── SKILL.md
├── references/
└── scripts/
```

把完整目录复制到：

```text
$DSH_HOME/skills/safe-find-dsh-plugins/
```

或者仅用于当前项目：

```text
<project-root>/.agents/skills/safe-find-dsh-plugins/
```

它是 Skill 分发仓库，不是 Cordis profile bundle，因此不需要根目录 `package.json`、`dsh.bundle` 或 `cordis.patch.yml`。

## 前置依赖：NVIDIA SkillSpector

在要求本 Skill 安装第三方插件之前，先通过 `uv` 安装 SkillSpector：

```bash
uv tool install git+https://github.com/NVIDIA/skillspector.git
```

仓库内置的门禁脚本会检查 CLI、运行静态扫描，并规范化 JSON 建议：

```bash
node skills/safe-find-dsh-plugins/scripts/security-review.mjs \
  --target https://github.com/owner/plugin \
  --expected-commit <完整-commit-sha> \
  --report ./skillspector-report.json
```

脚本会克隆仓库、检出锁定的 commit、扫描该检出内容,并输出规范化的 JSON 决策。退出码:`0` 放行(`SAFE`)、`1` 需确认(`CAUTION`)、`2` 阻止(`DO_NOT_INSTALL`)、`3` 失败关闭(扫描器缺失、扫描出错或 commit 不匹配)。

仅当配置的 SkillSpector 服务商获准接收插件文件内容时才使用 `--llm`。静态模式在可以访问 OSV.dev 时仍会发送依赖名称和版本，以查询已知漏洞。具体数据外发行为以 SkillSpector 的 trust model 为准。

## 发现命令

搜索脚本也可以单独使用：

```bash
node skills/safe-find-dsh-plugins/scripts/search-topic.mjs \
  --query "浏览器控制 browser automation" --limit 5
```

输出包括发现总数、排序后的仓库、关键词覆盖率和命中词。Skill 随后会读取最相关候选的仓库文件、核对当前 DSH 兼容性、让用户选择、锁定 commit、运行安全门禁，最后才按照确认过的安装方式操作。

## 验证

```bash
node --test skills/safe-find-dsh-plugins/scripts/*.test.mjs
```

## 致谢

本项目基于以下两个仓库的工作：

- [Nagi-ovo/dsh-find-plugins](https://github.com/Nagi-ovo/dsh-find-plugins) ——
  本 Skill fork 自该上游项目，topic 发现流程、排序脚本和安装参考文档均由其奠定。
- [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) ——
  安装门禁背后的安全扫描器，其建议契约（`SAFE` / `CAUTION` / `DO_NOT_INSTALL`）
  和 trust model 塑造了本 Skill 失败关闭的审查步骤。

## 许可证

MIT © 2026 Jinsong Zhou。详见 [`LICENSE`](LICENSE)。
