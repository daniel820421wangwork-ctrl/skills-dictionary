# 開發與維護說明

本檔放技術細節（本地運行、資料更新、部署、架構）。一般使用者只需看 [README.md](README.md)。

## 本地運行

純靜態網站，兩種方式皆可：

1. **直接開檔**：用瀏覽器開啟 `web/index.html`（不需伺服器）。
2. **本機伺服器**：
   ```powershell
   python -m http.server 8765 --directory web
   # 瀏覽器開 http://localhost:8765
   ```

## 資料儲存（IndexedDB）

「種子 + 瀏覽器端資料庫」架構：

1. `web/data/skills.js` 是**種子資料**（`window.SKILLS` / `window.TAGS` / `window.DATA_VERSION`），隨站台一起發佈。
2. 首次載入時 `web/db.js` 把種子寫進瀏覽器的 **IndexedDB**（資料庫 `skill-dict`，物件儲存 `skills`、`blacklist`）。
3. 之後搜尋／篩選都從 IndexedDB 讀取——可離線、重整免重抓。
4. `DATA_VERSION` 改變時自動清空並重新匯入。
5. 不支援 IndexedDB 時（如部分無痕模式）自動退回記憶體中的種子資料。

頁尾「↺ 重設本機資料」可清空 IndexedDB 並重新匯入種子；旁邊顯示儲存模式、資料版本與匯入時間。
DevTools → Application → IndexedDB → `skill-dict` 可看到實際存入的資料。

## 黑名單資料

- 種子：`web/data/blacklist.js`（`window.BLACKLIST`），每筆含 `pattern`、`severity`、`action`、`reason`、`source`。
- 首次載入寫進 IndexedDB 的 `blacklist` store；使用者增刪改會保留、不被種子覆蓋。想取得新版預設請按管理視窗的「↺ 還原預設名單」。
- `pattern`：`vendor/skill`（單一）或 `vendor`（整個發布者，等同 `vendor/*`）。
- `action`：`block`（標紅、不推薦，給確認有問題的單一 skill）／`warn`（標黃、仍推薦但標「來源需審查」，給整個市集／發布者來源提醒）。

## 更新資料（重新抓取線上 skill）

```powershell
# 1. 抓取 VoltAgent README（PowerShell 請用 curl.exe）
curl.exe -L -o scripts/volt_readme.md https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md

# 2. 解析 → 篩選取樣 → 合併繁中說明 → 輸出網站資料
python scripts/parse_volt.py      # README → scripts/volt_skills.json（全部 1100+ 筆）
python scripts/select_volt.py     # 取樣/標籤/發布者 → scripts/curated_raw.json（182 筆）
python scripts/build_online.py    # 合併繁中概述 → web/data/skills.js
```

- `parse_volt.py`：解析 README 的 `- **[name](url)** - desc` 條目，依 `### / <summary><h3>` 標題歸屬發布者。
- `select_volt.py`：依 `cap_for()` 取樣（官方每組 3、社群 1、NVIDIA 1 → 182 筆）、用關鍵字規則推論用途標籤、由 GitHub org 前綴推得發布者、標記是否官方。想收錄更多就調 `cap_for()`。
- `build_online.py`：把英文條目與手寫的**繁中概述**（`OV` 字典，以 skill 全名為鍵）合併輸出，並產生 `DATA_VERSION` 內容戳記。新增 skill 後在 `OV` 補一行即可；缺漏會在執行時列出。

改完資料後 commit 並 push，GitHub Pages 會自動重新部署。

## 部署（GitHub Pages）

內建 GitHub Actions 工作流（`.github/workflows/pages.yml`）會把 `web/` 目錄發佈成 Pages：

1. 專案推上 GitHub（branch `main`）。
2. repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 推送到 `main` 後 Actions 自動建置並部署；網址在 Action 的 `deploy` 步驟與 Settings → Pages 顯示。

只發佈 `web/`（站台本體＋種子資料），`scripts/` 與中繼檔不會上線。IndexedDB 在使用者瀏覽器端建立，不需任何伺服器或資料庫。

## 目錄結構

```
SkillDictionary/
├─ .github/workflows/pages.yml  # 自動部署到 GitHub Pages
├─ web/                # 網站本體（GitHub Pages 發佈這個目錄）
│  ├─ index.html
│  ├─ styles.css
│  ├─ db.js            # IndexedDB 儲存層（skills + blacklist）
│  ├─ app.js           # 篩選、卡片、對話式搜尋、黑名單、文字大小
│  ├─ .nojekyll
│  └─ data/
│     ├─ skills.js     # skill 種子，由 build_online.py 產生
│     └─ blacklist.js  # 黑名單種子（可在網站上編輯，存 IndexedDB）
├─ scripts/
│  ├─ parse_volt.py    # 解析 README
│  ├─ select_volt.py   # 取樣 + 標籤 + 發布者
│  ├─ build_online.py  # 繁中概述 + 輸出
│  └─ *.json / *.md    # 中繼檔（gitignore，可由腳本重新產生）
├─ README.md           # 服務說明
└─ DEVELOPMENT.md      # 本檔
```
