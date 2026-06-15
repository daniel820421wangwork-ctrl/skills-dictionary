/* MCP 伺服器黑名單種子資料（與 skill 黑名單各自獨立）。
 *
 * 預設為空：只在有「公開出處、被點名」的個別惡意 MCP server 時才加入，
 * 不臆測、不用 vendor/* 把整個平台一起懷疑。原則與 data/blacklist.js 相同。
 *
 * entry 欄位：
 *   pattern   "vendor/server"（單一；建議）或 "vendor"（整個發布者，較不建議）
 *   severity  malware（惡意程式）/ injection（提示注入）/ suspicious（可疑）/ demo（示範）
 *   action    "block"（標紅、不推薦）/ "warn"（標黃、仍推薦，僅來源提醒）
 *   reason    為什麼列入
 *   source    可查證的來源連結
 *
 * MCP 供應鏈風險（惡意 npm 套件、工具投毒 tool-poisoning、後門）比 skill 更受關注，
 * 使用者可在 MCP 模式的「⚠️ 黑名單管理」自行新增，內容存 IndexedDB、不會被種子覆蓋。
 */
window.MCP_BLACKLIST_VERSION = "2026-06-15a";
window.MCP_BLACKLIST = [];
