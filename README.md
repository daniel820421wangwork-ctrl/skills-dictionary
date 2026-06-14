# Skill 字典 🗂️

一個彙整**網路上公開發布的 Agent Skills**（Claude Code / Codex 等通用）的繁體中文查詢網站。

- 資料來源：[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)（官方＋社群精選，hand-picked）
- 收錄 **182 個** skill（官方 165、社群 17），來自 **68 個發布者**（Anthropic、OpenAI、Google、Vercel、Stripe、Cloudflare、Figma、NVIDIA…）
- 每個 skill 標上**用途標籤**（28 種：身分驗證、金流、資料庫、前端、AI/ML、DevOps…）
- 支援**對話式搜尋**：用自然語言描述任務，推薦對應的 skill
- 每個 skill 有**繁中概述**＋**保留英文原始說明**＋**原始來源連結**

> 註：為兼顧涵蓋度與品質，每個發布者/分類做了取樣（官方每組最多 3、社群每組最多 1、NVIDIA 基礎設施每組 1）。想收錄更多可調整 `scripts/select_volt.py` 的 `cap_for()`。

## 資料儲存（IndexedDB）

網站採「種子 + 瀏覽器端資料庫」架構：

1. `web/data/skills.js` 是**種子資料**（`window.SKILLS` / `window.TAGS` / `window.DATA_VERSION`），隨站台一起發佈。
2. 首次載入時，[`web/db.js`](web/db.js) 會把種子寫進瀏覽器的 **IndexedDB**（資料庫 `skill-dict`，物件儲存 `skills`）。
3. 之後所有搜尋／篩選都從 IndexedDB 讀取——可離線、重整免重抓。
4. 當資料更新（`DATA_VERSION` 改變）時自動清空並重新匯入。
5. 若瀏覽器不支援 IndexedDB（如部分無痕模式），自動退回直接使用記憶體中的種子資料。

> 在瀏覽器 DevTools → Application → IndexedDB → `skill-dict` 可看到實際存入的 182 筆資料。

頁尾有「↺ 重設本機資料」按鈕，可清空 IndexedDB 並重新匯入種子（資料卡住或想強制更新時用）；旁邊會顯示目前儲存模式、資料版本與匯入時間。

## 黑名單（避免使用的惡意／可疑 skill）

依公開資安通報（Snyk ToxicSkills、cybersecuritywaala 等），網站內建可編輯的黑名單：

- **以「具名的個別惡意 skill」為主，不用 `vendor/*` 整批懷疑整個平台。** 預設 12 筆都是通報中**被點名**的單一惡意 skill（如 `zaycv/clawhud`、`Aslaep123/bybit-agent`、`pepe276/moltbookagent`、`26medias/bob-p2p`、`aztr0nutzs/*` 系列等），每筆附原因與來源。
  - OpenClaw 雖有通報（39 個散播 Atomic macOS Stealer），但**未公開個別名稱**，故不臆測、不整批列入。
- **種子**：[`web/data/blacklist.js`](web/data/blacklist.js)（`window.BLACKLIST`），每筆含 `pattern`、`severity`、`action`、`reason`（為什麼）、`source`（來源連結）。
- **儲存／編輯**：首次載入寫進 IndexedDB 的 `blacklist` store；之後使用者在頁面上的**增刪改都會保留**，不會被種子覆蓋。頁尾／篩選列的「⚠️ 黑名單管理」可新增、刪除、或「↺ 還原預設名單」。
- **比對規則 `pattern`**：`vendor/skill`（單一 skill）或 `vendor`（整個發布者，等同 `vendor/*`）。
- **兩種處置 `action`**：
  - **封鎖（block）**：標紅警告，且**對話式搜尋不推薦**。適合「確認有問題的單一 skill」。
  - **提醒（warn）**：標黃警告，但**仍可使用、仍會被推薦**（結果旁標「⚠️ 來源需審查」）。適合「整個市集／發布者來路需謹慎」——因為通報指出 ClawHub/OpenClaw 是「被大量上傳惡意 skill」，並非平台上每個都有問題，所以不該整批硬擋。
  - 預設 12 筆具名惡意 skill 皆為**封鎖**。`warn`／`vendor` 整體提醒仍保留給你自行使用（例如想對某個來路不明的發布者做整體提醒時）。
- **隱藏切換**：「隱藏黑名單」可把所有被標記（封鎖＋提醒）的項目從列表藏起來。
- **責任聲明**：預設只收錄有出處的通報與一筆標示清楚的「示範」項目，**不會把收錄的官方精選 skill 指控為惡意**（預設因此 0 命中是正常的）。要封鎖某個 skill，請在管理介面新增並附上可查證來源。
- **既有使用者更新預設**：因使用者編輯會保留不被覆蓋，若想取得新版預設名單，請按管理視窗的「↺ 還原預設名單」。

> 來源參考：[Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)、[grith 稽核](https://grith.ai/blog/agent-skills-supply-chain)、[OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/)、[Datadog Security Labs](https://securitylabs.datadoghq.com/articles/malicious-skills-supply-chain-risks-in-coding-agents-with-dynamic-context/)。

## 開啟網站

兩種方式皆可：

1. **直接開檔**：用瀏覽器開啟 [`web/index.html`](web/index.html)（不需伺服器）。
2. **本機伺服器**：
   ```powershell
   python -m http.server 8765 --directory web
   # 瀏覽器開 http://localhost:8765
   ```

## 部署到 GitHub Pages

已內建 GitHub Actions 工作流（[`.github/workflows/pages.yml`](.github/workflows/pages.yml)），會把 `web/` 目錄發佈成 Pages：

1. 把整個專案推上 GitHub（branch 預設 `main`）。
2. GitHub repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 推送到 `main` 後，Actions 會自動建置並部署，網址在 Action 的 `deploy` 步驟與 Settings → Pages 顯示。

只發佈 `web/`（站台本體＋種子資料），`scripts/` 與中繼檔不會上線。IndexedDB 在使用者瀏覽器端建立，不需任何伺服器或資料庫。

## 更新資料（重新抓取線上 skill）

```powershell
# 1. 抓取 VoltAgent README
curl -L -o scripts/volt_readme.md https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md

# 2. 解析 → 篩選取樣 → 合併繁中說明 → 輸出網站資料
python scripts/parse_volt.py      # README → scripts/volt_skills.json（全部 1100+ 筆）
python scripts/select_volt.py     # 取樣/標籤/發布者 → scripts/curated_raw.json（182 筆）
python scripts/build_online.py    # 合併繁中概述 → web/data/skills.js
```

- `parse_volt.py`：解析 README 的 `- **[name](url)** - desc` 條目，依 `### / <summary><h3>` 標題歸屬發布者。
- `select_volt.py`：依 `cap_for()` 取樣、用關鍵字規則推論用途標籤、由 GitHub org 前綴推得發布者、標記是否官方。
- `build_online.py`：把英文條目與手寫的**繁體中文概述**（`OV` 字典，以 skill 全名為鍵）合併輸出。新增 skill 後在 `OV` 補一行即可；缺漏會在執行時列出。

## 目錄結構

```
SkillDictionary/
├─ .github/workflows/pages.yml  # 自動部署到 GitHub Pages
├─ web/                # 網站本體（GitHub Pages 發佈這個目錄）
│  ├─ index.html
│  ├─ styles.css
│  ├─ db.js            # IndexedDB 儲存層（skills + blacklist）
│  ├─ app.js           # 篩選、卡片、對話式搜尋、黑名單
│  ├─ .nojekyll
│  └─ data/
│     ├─ skills.js     # skill 種子，由 build_online.py 產生
│     └─ blacklist.js  # 黑名單種子（可在網站上編輯，存 IndexedDB）
├─ scripts/
│  ├─ parse_volt.py    # 解析 README
│  ├─ select_volt.py   # 取樣 + 標籤 + 發布者
│  ├─ build_online.py  # 繁中概述 + 輸出
│  └─ *.json           # 中繼檔
└─ README.md
```

## 文字大小

右上角有 **A− / A+ / ↺** 可調整全站文字大小（85%–160%，等比縮放），選擇會存在 `localStorage`，重整與下次造訪都會保留。

## 篩選與搜尋

- **來源**：全部 / 官方 / 社群
- **用途標籤**：28 種，依數量排序，點擊即時過濾
- **關鍵字**：比對名稱、發布者、概述、英文說明、標籤
- **對話式搜尋**：自然語言 → 同義詞對應到標籤 → 加權排序，列出前 6 名與推薦原因

