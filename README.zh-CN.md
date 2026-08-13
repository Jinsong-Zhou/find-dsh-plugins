# find-dsh-plugins

<p align="center">
  <strong>简体中文</strong> | <a href="README.md">English</a>
</p>

对 DSH 说一句「有没有插件能……」，它就会从全 GitHub 的 [`dsh-plugin` topic](https://github.com/topics/dsh-plugin) 里找出候选，解释差别，等你选好以后再安装和验证。

仓库属于个人还是组织并不重要。只要是公开仓库并带有 `dsh-plugin` topic，转移仓库后仍然能被发现。

## 安装

把本仓库链接发给 DSH，说一句「帮我装这个技能」。

手动安装时，把 `skills/find-dsh-plugins/` 整个目录复制到 `$DSH_HOME/skills/`；只想给当前项目使用，则复制到 `<项目根>/.agents/skills/`。目录 watcher 会让它立即生效。

## 它会怎么做

Skill 会把你的原始需求交给自带脚本，获取所有公开、未归档、非 fork 的 `dsh-plugin` 仓库，再按仓库名、描述和 topics 的覆盖度初排；更新时间和 stars 只作为弱排序信号。它只检查最匹配的少量候选，并从 README、`package.json` 和仓库文件判断应该按 bundle、Cordis 插件还是 skill 安装。涉及 lifecycle scripts 或可疑的额外写入时，它会停下来让你确认。

也可以单独运行检索器：`node skills/find-dsh-plugins/scripts/search-topic.mjs --query '浏览器自动化 browser automation' --limit 5`。中文需求附上英文生态关键词通常更准。输出 JSON 包含总发现数、匹配数，以及每个候选的分数、覆盖率和命中词。

比如「想把数据和流程画出来」可以找到 [dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize)；「想给 Web UI 加点 2005 年互联网味道」可能会找到 [dsh-ads](https://github.com/Nagi-ovo/dsh-ads)。检索命中纯属巧合。

[dsh-external/hub](https://github.com/dsh-external/hub) 在当前账号可访问时可以补充分类和安装信息，但 GitHub topic 才是主目录。灵感来自 vercel-labs/skills 的 find-skills。

## 许可证

MIT © 2026 Jinsong Zhou。详见 [`LICENSE`](LICENSE)。
