# Skill 字典 🗂️

彙整**網路上公開發布的 Agent Skills**（Claude Code / Codex 等通用）的繁體中文查詢站——用問的就能找到你要的 skill。

## 🔗 線上使用

**https://daniel820421wangwork-ctrl.github.io/skills-dictionary/**

## 這個網站能做什麼

- 💬 **對話式搜尋**：用自然語言描述你想做的事（例如「使用者登入驗證」「串接 Stripe 金流」「部署到 Cloudflare」「爬網頁資料」），自動推薦對應的 skill 並說明推薦原因。
- 🧭 **多重篩選**：依**來源**（官方／社群）、**28 種用途標籤**（身分驗證、金流、資料庫、前端、AI/ML、DevOps…）、**關鍵字**即時過濾。
- 📖 **看得懂的說明**：每個 skill 都有**繁體中文概述**、保留**英文原始說明**，並附**原始來源連結**可直接前往。
- ⚠️ **安全黑名單**：標記已知惡意／可疑 skill，命中者不被推薦並顯示原因與通報來源；你也能自行增刪改。
- 🔠 **文字大小**：右上角可調整全站字級（85%–160%），設定會記住。
- 🔒 **純前端、重隱私**：資料存在你自己的瀏覽器（IndexedDB），可離線瀏覽；沒有後端、不收集任何使用者資料。

## 收錄內容

**182 個** skill（官方 165、社群 17），來自 **68 個發布者**（Anthropic、OpenAI、Google、Vercel、Stripe、Cloudflare、Figma、NVIDIA…）。

資料來源：[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)（官方＋社群精選，hand-picked）。

## 安全黑名單

- 預設列出**資安通報中被點名的個別惡意 skill**（如 `zaycv/clawhud`、`26medias/bob-p2p`、`pepe276/moltbookagent` 等），命中即標警告並從推薦中排除。
- 採「**具名封鎖**」而非用 `vendor/*` 整批懷疑整個平台；你可在站上的「⚠️ 黑名單管理」自行新增、刪除、還原預設。
- **責任聲明**：預設**不會**把收錄的官方精選 skill 指控為惡意（因此預設 0 命中是正常的）。要封鎖某個 skill 請附上可查證來源。
- 通報來源：[Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)、[grith 稽核](https://grith.ai/blog/agent-skills-supply-chain)、[OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/)、[Datadog Security Labs](https://securitylabs.datadoghq.com/articles/malicious-skills-supply-chain-risks-in-coding-agents-with-dynamic-context/)。

---

開發、資料更新與部署等技術說明見 [DEVELOPMENT.md](DEVELOPMENT.md)。
