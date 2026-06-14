/* 黑名單種子資料。
 * 原則：只逐一列出「有公開出處、被點名」的個別惡意 skill，
 *       不用 vendor/* 把整個平台所有 skill 一起懷疑或封鎖。
 *
 * entry 欄位：
 *   pattern   "vendor/skill"（單一 skill；建議用這個）或 "vendor"（整個發布者，較不建議）
 *   severity  malware（惡意程式）/ injection（提示注入）/ suspicious（可疑）/ demo（示範）
 *   action    "block"（標紅、不推薦，給確認有問題的單一 skill）/ "warn"（標黃、仍推薦，僅來源提醒）
 *   reason    為什麼列入
 *   source    可查證的來源連結
 *
 * 註：以下 ClawHub/GitHub 上的惡意 skill 名稱取自公開資安通報（見各 source）。
 *     OpenClaw 雖有通報（39 個散播 Atomic macOS Stealer），但未公開個別名稱，故不臆測、不整批列入。
 *     這些項目預設不會命中本站收錄的 182 個（它們不在此清單中）；此名單是「已知惡意 skill 登錄表」，
 *     若日後出現同名項目即會被標記。使用者的增刪改存在 IndexedDB，不會被這份種子覆蓋。
 */
window.BLACKLIST_VERSION = "2026-06-14c";
window.BLACKLIST = [
  {
    pattern: "zaycv/clawhud",
    severity: "malware", action: "block",
    reason: "ClawHub 上的惡意 skill，屬於一波程式化（自動大量上架）的惡意攻擊活動。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "zaycv/clawhub1",
    severity: "malware", action: "block",
    reason: "同 zaycv/clawhud，屬於程式化大量上架的惡意攻擊活動。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "Aslaep123/polymarket-traiding-bot",
    severity: "malware", action: "block",
    reason: "仿冒（typosquat，名稱故意拼錯）的交易機器人 skill，誘使使用者誤裝。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "Aslaep123/base-agent",
    severity: "malware", action: "block",
    reason: "偽裝成通用 agent 的惡意外殼 skill。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "Aslaep123/bybit-agent",
    severity: "malware", action: "block",
    reason: "鎖定加密貨幣交易所（Bybit）的惡意 skill。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "moonshine-100rze/moltbook-lm8",
    severity: "malware", action: "block",
    reason: "ClawHub 上被通報的惡意 skill。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "pepe276/moltbookagent",
    severity: "injection", action: "block",
    reason: "夾帶 Unicode 隱藏字元注入與 DAN 式越獄提示，企圖操控 AI 代理。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "pepe276/publish-dist",
    severity: "injection", action: "block",
    reason: "與 pepe276/moltbookagent 類似的提示注入／越獄手法。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "26medias/bob-p2p",
    severity: "malware", action: "block",
    reason: "誘導 AI 把加密貨幣私鑰以明文儲存、從受害者錢包購入無價值的 $BOB 代幣，並將付款導向攻擊者伺服器（其他平台別名 BobVonNeumann/bob-p2p）。",
    source: "https://cybersecuritywaala.com/blog/71-malicious-claude-skills-found/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "aztr0nutzs/whatsapp-mgv",
    severity: "malware", action: "block",
    reason: "惡意攻擊者 aztr0nutzs 的 GitHub 儲存庫（NET_NiNjA.v1.2）中的惡意 skill（尚未上架 ClawHub，仍應避免）。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "aztr0nutzs/coding-agent-1gx",
    severity: "malware", action: "block",
    reason: "同上，aztr0nutzs 惡意 repo 中的 skill。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  },
  {
    pattern: "aztr0nutzs/google-qx4",
    severity: "malware", action: "block",
    reason: "同上，aztr0nutzs 惡意 repo 中、偽裝為 google 相關的惡意 skill。",
    source: "https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/",
    addedAt: "2026-06-14"
  }
];
