/* Skill 字典 — 公開 Agent Skills 目錄。渲染、篩選、對話式搜尋。資料來自 data/skills.js */
(function () {
  "use strict";
  var SKILLS = [];   // 「目前類型」的項目（skill 或 mcp）；由 IndexedDB 載入
  var TAGS = {};     // 「目前類型」的標籤字典
  var BLACKLIST = [];  // 由 IndexedDB 載入（種子來自 data/blacklist.js），使用者可編輯

  // 兩種類型的資料各放一份，切換時換成 active
  var COLLECTIONS = {
    skill: { items: [], tags: {}, noun: "skill", emptyText: "找不到符合條件的 skill，試試別的關鍵字或清除篩選。",
             statLabel: "公開技能",
             source: '資料來源：<a href="https://github.com/VoltAgent/awesome-agent-skills" target="_blank" rel="noopener">VoltAgent/awesome-agent-skills</a>（官方＋社群精選）' },
    mcp:   { items: [], tags: {}, noun: "MCP server", emptyText: "找不到符合條件的 MCP 伺服器，試試別的關鍵字或清除篩選。",
             statLabel: "MCP 伺服器",
             source: '資料來源：<a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener">官方 reference servers</a> + <a href="https://github.com/punkpeye/awesome-mcp-servers" target="_blank" rel="noopener">awesome-mcp-servers</a>（精選）' }
  };
  var MODE = "skill";   // "skill" | "mcp"
  // 在中文句子裡用的類型名詞（skill / MCP 伺服器）
  function zhNoun() { return MODE === "mcp" ? "MCP 伺服器" : "skill"; }

  var SEV = {
    malware:    { label: "惡意程式", cls: "sev-malware" },
    injection:  { label: "提示注入", cls: "sev-injection" },
    suspicious: { label: "可疑",     cls: "sev-suspicious" },
    demo:       { label: "示範",     cls: "sev-demo" }
  };

  var state = { source: "all", tag: "all", keyword: "", hideBlacklist: false };
  var $ = function (id) { return document.getElementById(id); };
  var grid = $("grid"), empty = $("empty"), resultCount = $("result-count");

  // 黑名單項目的處置：block（封鎖、不推薦）或 warn（提醒、仍推薦）
  function blAction(entry) {
    if (!entry) return null;
    if (entry.action === "block" || entry.action === "warn") return entry.action;
    return (entry.severity === "malware" || entry.severity === "injection") ? "block" : "warn";
  }

  // 回傳命中該 skill 的黑名單項目（或 null）
  function blMatch(s) {
    if (!BLACKLIST.length) return null;
    var id = (s.id || "").toLowerCase();
    var full = (s.fullName || "").toLowerCase();
    var handle = full.split("/")[0];
    var vend = (s.vendor || "").toLowerCase();
    for (var i = 0; i < BLACKLIST.length; i++) {
      var p = (BLACKLIST[i].pattern || "").trim().toLowerCase();
      if (!p) continue;
      if (p === id || p === full) return BLACKLIST[i];
      var vp = p.replace(/\/\*$/, "");   // "vendor/*" -> "vendor"
      if (vp && vp.indexOf("/") < 0 && (vp === handle || vp === vend)) return BLACKLIST[i];
    }
    return null;
  }

  // ===================================================================
  // 對話式搜尋：自然語言 -> 同義詞對應到標籤 -> 加權排序
  // ===================================================================
  var SYNONYMS = {
    "ai-ml": ["ai", "llm", "模型", "機器學習", "agent", "代理", "rag", "embedding", "推論", "生成", "gemini", "openai", "向量"],
    "typescript": ["typescript", "javascript", "js", "node", "next.js", "nextjs", "react", "前端框架"],
    "python": ["python", "fastapi", "django", "pandas", "pydantic"],
    "java": ["java", "spring", "jvm"],
    "dotnet": [".net", "c#", "asp.net", "dotnet"],
    "rust": ["rust", "cargo"],
    "frontend": ["前端", "frontend", "ui", "介面", "畫面", "元件", "component", "網頁", "css", "動畫", "angular", "react", "vue"],
    "backend": ["後端", "backend", "api", "伺服器", "server", "graphql", "rest", "端點"],
    "database": ["資料庫", "database", "sql", "postgres", "mysql", "mongodb", "redis", "查詢", "schema", "duckdb", "clickhouse"],
    "auth": ["登入", "驗證", "身分", "auth", "oauth", "授權", "帳號", "2fa", "jwt", "認證", "sso"],
    "payments": ["金流", "付款", "支付", "stripe", "payment", "訂閱", "收款", "billing", "結帳"],
    "devops": ["部署", "deploy", "ci", "cd", "docker", "kubernetes", "terraform", "infra", "基礎設施", "vercel", "netlify", "cloudflare"],
    "cloud": ["雲端", "cloud", "aws", "gcp", "azure", "google cloud", "vertex", "firebase", "serverless", "無伺服器"],
    "gpu": ["gpu", "cuda", "nvidia", "高效能", "kernel", "訓練", "tensorrt", "量子"],
    "mobile": ["手機", "行動", "mobile", "react native", "expo", "flutter", "ios", "android", "app"],
    "testing": ["測試", "test", "e2e", "cypress", "playwright", "單元測試", "覆蓋率"],
    "security": ["資安", "安全", "security", "漏洞", "cve", "稽核", "弱點"],
    "data": ["資料", "data", "分析", "etl", "報表", "試算表", "csv", "excel", "數據", "pipeline"],
    "docs": ["文件", "docs", "word", "pdf", "簡報", "ppt", "投影片", "寫作", "報告", "文書", "文案", "markdown"],
    "automation": ["自動化", "automation", "通知", "排程", "schedule", "email", "郵件", "簡訊", "工作流", "n8n", "webhook"],
    "observability": ["監控", "observability", "logging", "log", "sentry", "datadog", "追蹤", "指標", "可觀測"],
    "search": ["搜尋", "search", "爬", "爬蟲", "scrape", "crawl", "firecrawl", "瀏覽器", "browser", "抓取"],
    "web3": ["web3", "crypto", "加密貨幣", "區塊鏈", "blockchain", "錢包", "wallet", "binance", "coinbase", "幣"],
    "design": ["設計", "design", "figma", "canva", "視覺", "美術", "logo", "品牌", "art", "畫"],
    "marketing": ["行銷", "marketing", "seo", "廣告", "文案", "social", "社群", "成長", "growth", "ab test", "a/b"],
    "product": ["產品", "product", "pm", "roadmap", "prd", "需求", "優先級"],
    "notion": ["notion", "筆記", "知識", "文件管理", "會議", "工作區"],
    "misc": ["工具", "其他"],
    // MCP 專屬標籤
    "version-control": ["git", "github", "gitlab", "版本控制", "儲存庫", "repo", "pr", "commit"],
    "dev-tools": ["開發工具", "ide", "jetbrains", "vscode", "除錯", "diagnostics", "devtools"],
    "vector": ["向量", "vector", "embedding", "語意搜尋", "qdrant", "chroma", "pinecone", "檢索"],
    "knowledge": ["知識", "記憶", "memory", "知識圖譜", "knowledge graph", "筆記", "notion"],
    "devops": ["devops", "iac", "terraform", "pulumi", "kubernetes", "k8s", "docker", "部署", "基礎設施"],
    "communication": ["通訊", "訊息", "slack", "discord", "telegram", "聊天", "message", "通知"],
    "productivity": ["生產力", "協作", "linear", "jira", "notion", "airtable", "專案管理", "工作流"],
    "browser": ["瀏覽器", "browser", "playwright", "puppeteer", "爬", "自動化操作", "網頁自動化"],
    "filesystem": ["檔案", "filesystem", "file", "文件轉換", "markdown", "讀檔"],
    "location": ["地圖", "位置", "map", "location", "google maps", "路線"],
    "media": ["多媒體", "影片", "音訊", "語音", "youtube", "spotify", "tts", "音樂"],
  };

  function nm(s) { return (s || "").toLowerCase(); }

  function scoreSkill(s, query) {
    var q = nm(query);
    if (!q) return { score: 0, reasons: [] };
    var tokens = q.split(/[\s,，、。；;]+/).filter(Boolean);
    var score = 0, reasons = [];

    if (nm(s.name).indexOf(q) >= 0 || nm(s.vendor).indexOf(q) >= 0) { score += 35; reasons.push("名稱／廠商相符"); }

    var hitTags = {};
    s.tags.forEach(function (t) {
      (SYNONYMS[t] || []).forEach(function (w) {
        if (q.indexOf(nm(w)) >= 0 && !hitTags[t]) {
          hitTags[t] = true; score += 18;
          reasons.push("符合「" + (TAGS[t] || t) + "」");
        }
      });
    });

    var hay = nm(s.overview + " " + s.rawDescription + " " + s.fullName + " " + s.vendor);
    tokens.forEach(function (tok) { if (tok.length >= 2 && hay.indexOf(tok) >= 0) score += 5; });
    if (s.official) score += 1; // 官方略優先（同分排序）
    return { score: score, reasons: reasons.slice(0, 2) };
  }

  function runChat(query) {
    var scored = SKILLS.map(function (s) {
      var r = scoreSkill(s, query);
      return { skill: s, score: r.score, reasons: r.reasons };
    }).filter(function (x) { return x.score > 0; });

    // 只有「封鎖(block)」的項目不推薦；「提醒(warn)」仍會推薦但會標註
    var total = scored.length;
    scored = scored.filter(function (x) {
      var e = blMatch(x.skill);
      return !(e && blAction(e) === "block");
    });
    var excluded = total - scored.length;
    var ranked = scored.sort(function (a, b) { return b.score - a.score; }).slice(0, 6);

    var box = $("chat-answer");
    box.hidden = false;
    if (!ranked.length) {
      box.innerHTML = '<p class="lead">沒找到明顯相關的 skill 😅 換個說法，或用下方標籤／關鍵字過濾。</p>' +
        (excluded ? '<p class="lead" style="color:var(--danger)">⚠️ 已排除 ' + excluded + ' 個黑名單項目。</p>' : '');
      return;
    }
    var top = ranked[0].skill;
    var html = '<p class="lead">針對「<b>' + esc(query) + '</b>」，最推薦 <b>' + esc(top.fullName) +
      '</b>。相關度前 ' + ranked.length + ' 名：' +
      (excluded ? '<span style="color:var(--danger)">（已排除 ' + excluded + ' 個黑名單項目）</span>' : '') +
      '</p><div class="match-list">';
    ranked.forEach(function (x, i) {
      var s = x.skill;
      var why = x.reasons.length ? x.reasons.join("、") : "內容關鍵字相符";
      var warn = blMatch(s); // 能進到這裡的都不是 block，只可能是 warn
      var warnTag = warn ? '<span class="m-eco sev-suspicious">⚠️ 來源需審查</span>' : "";
      html += '<div class="match" data-id="' + esc(s.id) + '"><span class="rank">' + (i + 1) + '</span>' +
        '<div><div><span class="m-name">' + esc(s.fullName) + '</span>' +
        '<span class="m-eco eco-' + (s.official ? 'official' : 'community') + '">' + (s.official ? '官方' : '社群') + '</span>' + warnTag + '</div>' +
        '<div class="m-why">' + esc(s.overview) + '</div>' +
        '<div class="m-why">↳ ' + esc(why) + '</div></div></div>';
    });
    html += '</div>';
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll(".match"), function (el) {
      el.addEventListener("click", function () { openModal(el.getAttribute("data-id")); });
    });
  }

  // ===================================================================
  // 篩選 + 卡片
  // ===================================================================
  function passes(s) {
    if (state.source === "official" && !s.official) return false;
    if (state.source === "community" && s.official) return false;
    if (state.hideBlacklist && blMatch(s)) return false;
    if (state.tag !== "all" && s.tags.indexOf(state.tag) < 0) return false;
    if (state.keyword) {
      var k = nm(state.keyword);
      var hay = nm(s.fullName + " " + s.vendor + " " + s.overview + " " + s.rawDescription + " " +
        s.tags.map(function (t) { return TAGS[t] || t; }).join(" "));
      if (hay.indexOf(k) < 0) return false;
    }
    return true;
  }

  function render() {
    var list = SKILLS.filter(passes);
    grid.innerHTML = "";
    empty.hidden = list.length > 0;
    resultCount.textContent = "顯示 " + list.length + " / " + SKILLS.length + " 個 " + COLLECTIONS[MODE].noun;
    var frag = document.createDocumentFragment();
    list.forEach(function (s) {
      var bl = blMatch(s);
      var act = blAction(bl);
      var card = document.createElement("div");
      card.className = "card" + (bl ? (act === "block" ? " card-blacklisted" : " card-warned") : "");
      card.setAttribute("data-id", s.id);
      var tagHtml = s.tags.map(function (t) {
        return '<span class="tagchip">' + esc(TAGS[t] || t) + '</span>';
      }).join("");
      var sev = bl ? (SEV[bl.severity] || { label: bl.severity, cls: "sev-suspicious" }) : null;
      var blHtml = bl ? '<div class="bl-warning ' + sev.cls + '" title="' + esc(bl.reason) + '">⚠️ ' +
        (act === "block" ? "封鎖" : "注意") + "・" + esc(sev.label) + '</div>' : "";
      card.innerHTML =
        '<div class="card-top"><span class="card-name">' + esc(s.name) + '</span>' +
        '<span class="eco-badge eco-' + (s.official ? 'official' : 'community') + '">' +
          (s.official ? '官方' : '社群') + '</span></div>' +
        blHtml +
        '<div class="card-vendor">🏷️ ' + esc(s.vendor) + '</div>' +
        '<div class="card-overview">' + esc(s.overview) + '</div>' +
        '<div class="card-tags">' + tagHtml + '</div>';
      card.addEventListener("click", function () { openModal(s.id); });
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  // ===================================================================
  // 詳細 modal
  // ===================================================================
  function openModal(id) {
    var s = SKILLS.find(function (x) { return x.id === id; });
    if (!s) return;
    var tagHtml = s.tags.map(function (t) {
      return '<span class="tagchip">' + esc(TAGS[t] || t) + '</span>';
    }).join("");
    var bl = blMatch(s);
    var blHtml = "";
    if (bl) {
      var sev = SEV[bl.severity] || { label: bl.severity, cls: "sev-suspicious" };
      var act = blAction(bl);
      var headTxt = act === "block"
        ? "⚠️ 此 " + zhNoun() + " 已被封鎖・" + sev.label + "（不會被推薦）"
        : "⚠️ 此來源被標記為需注意・" + sev.label + "（仍可使用，建議先審查原始碼與權限）";
      blHtml = '<div class="m-bl ' + sev.cls + '">' +
        '<div class="m-bl-head">' + esc(headTxt) + '</div>' +
        '<p class="m-bl-reason">' + esc(bl.reason) + '</p>' +
        (bl.source ? '<a class="m-bl-src" href="' + esc(bl.source) + '" target="_blank" rel="noopener">來源／通報 ↗</a>' : '') +
        '<div class="m-bl-rule">比對規則：<code>' + esc(bl.pattern) + '</code>（' +
          (act === "block" ? "封鎖" : "提醒") + '）</div></div>';
    }
    $("modal-body").innerHTML =
      '<div class="m-head"><h2>' + esc(s.name) + '</h2>' +
      '<span class="eco-badge eco-' + (s.official ? 'official' : 'community') + '">' +
        (s.official ? '官方' : '社群') + '</span></div>' +
      blHtml +
      '<div class="m-vendor">🏷️ 發布者：<b>' + esc(s.vendor) + '</b> · <code>' + esc(s.fullName) + '</code></div>' +
      '<div class="m-tags">' + tagHtml + '</div>' +
      mcpMeta(s) +
      '<div class="m-section"><h3>概述（繁中）</h3><p class="m-overview">' + esc(s.overview) + '</p></div>' +
      '<div class="m-section"><h3>原始說明（English）</h3><div class="m-raw">' + esc(s.rawDescription) + '</div></div>' +
      '<div class="m-section"><h3>取得 / 原始來源</h3>' +
        '<a class="m-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">在新分頁開啟原始 skill ↗</a>' +
        '<p class="m-path"><code>' + esc(s.url) + '</code></p></div>';
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() { $("modal").hidden = true; document.body.style.overflow = ""; }

  // MCP 專屬：語言 + 連線範圍（scopes/langs 存在時才顯示）
  var LANG_LABEL = { python: "Python", typescript: "TypeScript", go: "Go", rust: "Rust",
                     csharp: "C#", java: "Java", cpp: "C/C++", ruby: "Ruby" };
  var SCOPE_LABEL = { cloud: "☁️ 雲端 / 遠端", local: "🏠 本機", embedded: "📟 嵌入式" };
  function mcpMeta(s) {
    var bits = [];
    (s.scopes || []).forEach(function (sc) { if (SCOPE_LABEL[sc]) bits.push(SCOPE_LABEL[sc]); });
    (s.langs || []).forEach(function (l) { if (LANG_LABEL[l]) bits.push("💻 " + LANG_LABEL[l]); });
    if (!bits.length) return "";
    return '<div class="m-meta">' + bits.map(function (b) {
      return '<span class="meta-chip">' + esc(b) + '</span>';
    }).join("") + '</div>';
  }

  // ===================================================================
  // 篩選列
  // ===================================================================
  function buildFilters() {
    var off = SKILLS.filter(function (s) { return s.official; }).length;
    var ecoWrap = $("eco-filter");
    ecoWrap.innerHTML = "";
    [["all", "全部", SKILLS.length], ["official", "官方", off], ["community", "社群", SKILLS.length - off]].forEach(function (p) {
      var pill = mkPill(p[1], p[2], p[0] === state.source);
      pill.addEventListener("click", function () { state.source = p[0]; setActive(ecoWrap, pill); render(); });
      ecoWrap.appendChild(pill);
    });

    var tagCounts = {};
    SKILLS.forEach(function (s) { s.tags.forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
    var tagWrap = $("tag-filter");
    tagWrap.innerHTML = "";
    var allPill = mkPill("全部用途", SKILLS.length, true);
    allPill.addEventListener("click", function () { state.tag = "all"; setActive(tagWrap, allPill); render(); });
    tagWrap.appendChild(allPill);
    Object.keys(TAGS).filter(function (t) { return tagCounts[t]; })
      .sort(function (a, b) { return tagCounts[b] - tagCounts[a]; })
      .forEach(function (t) {
        var pill = mkPill(TAGS[t], tagCounts[t], false);
        pill.addEventListener("click", function () { state.tag = t; setActive(tagWrap, pill); render(); });
        tagWrap.appendChild(pill);
      });
  }
  function mkPill(label, count, active) {
    var el = document.createElement("button");
    el.className = "pill" + (active ? " active" : "");
    el.type = "button";
    el.innerHTML = esc(label) + '<span class="pcount">' + count + '</span>';
    return el;
  }
  function setActive(wrap, el) {
    Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("active"); });
    el.classList.add("active");
  }

  var SUGGEST = {
    skill: ["使用者登入驗證", "串接 Stripe 金流", "部署到 Cloudflare", "爬網頁資料",
      "寫 Next.js 前端", "操作 PostgreSQL", "做 A/B 測試", "生成圖片影片", "寫 E2E 測試", "整理 Notion 文件"],
    mcp: ["連接 GitHub 儲存庫", "查詢 PostgreSQL 資料庫", "自動化瀏覽器", "搜尋網路資料",
      "操作 Slack 訊息", "向量語意檢索", "監控 Grafana 儀表板", "管理 Notion 頁面", "存取檔案系統", "操作 Kubernetes 叢集"]
  };
  function buildSuggestChips() {
    var ex = SUGGEST[MODE] || SUGGEST.skill;
    var row = $("suggest-chips");
    row.innerHTML = "";
    ex.forEach(function (e) {
      var c = document.createElement("button");
      c.className = "chip"; c.type = "button"; c.textContent = e;
      c.addEventListener("click", function () { $("chat-input").value = e; runChat(e); });
      row.appendChild(c);
    });
  }

  // ===================================================================
  // 黑名單：控制列 + 管理 modal
  // ===================================================================
  function blacklistedCount() {
    return SKILLS.filter(function (s) { return blMatch(s); }).length;
  }

  function buildBlControls() {
    var wrap = $("bl-controls");
    if (!wrap) return;
    wrap.innerHTML = "";
    var n = blacklistedCount();
    var manageBtn = document.createElement("button");
    manageBtn.type = "button";
    manageBtn.className = "pill bl-manage";
    manageBtn.innerHTML = "⚠️ 黑名單管理<span class='pcount'>" + BLACKLIST.length + "</span>";
    manageBtn.addEventListener("click", openBlModal);
    wrap.appendChild(manageBtn);

    var hidePill = document.createElement("button");
    hidePill.type = "button";
    hidePill.className = "pill" + (state.hideBlacklist ? " active" : "");
    hidePill.innerHTML = "隱藏黑名單<span class='pcount'>" + n + "</span>";
    hidePill.addEventListener("click", function () {
      state.hideBlacklist = !state.hideBlacklist;
      hidePill.classList.toggle("active", state.hideBlacklist);
      render();
    });
    wrap.appendChild(hidePill);
  }

  function openBlModal() { renderBlModal(); $("bl-modal").hidden = false; document.body.style.overflow = "hidden"; }
  function closeBlModal() { $("bl-modal").hidden = true; document.body.style.overflow = ""; }

  function renderBlModal() {
    var rows = BLACKLIST.slice().sort(function (a, b) {
      return (a.pattern || "").localeCompare(b.pattern || "");
    }).map(function (e) {
      var sev = SEV[e.severity] || { label: e.severity || "可疑", cls: "sev-suspicious" };
      var act = blAction(e);
      var actTag = '<span class="bl-act bl-act-' + act + '">' + (act === "block" ? "封鎖" : "提醒") + '</span>';
      return '<div class="bl-row">' +
        '<div class="bl-row-main">' +
          '<div><code class="bl-pat">' + esc(e.pattern) + '</code> ' +
            '<span class="bl-sev ' + sev.cls + '">' + esc(sev.label) + '</span> ' + actTag + '</div>' +
          '<div class="bl-reason">' + esc(e.reason || "") + '</div>' +
          (e.source ? '<a class="bl-src" href="' + esc(e.source) + '" target="_blank" rel="noopener">來源 ↗</a>' : '') +
        '</div>' +
        '<button class="bl-del" type="button" data-pat="' + esc(e.pattern) + '">刪除</button>' +
      '</div>';
    }).join("") || '<p class="bl-empty">目前黑名單是空的。</p>';

    var sevOptions = Object.keys(SEV).map(function (k) {
      return '<option value="' + k + '">' + esc(SEV[k].label) + '</option>';
    }).join("");

    var noun = zhNoun();
    var defaultsNote = MODE === "mcp"
      ? "本清單<b>預設為空</b>（MCP 供應鏈風險可自行加入）；"
      : "預設項目取自公開資安通報，";
    $("bl-body").innerHTML =
      '<div class="m-head"><h2 id="bl-title">⚠️ ' + noun + ' 黑名單管理</h2></div>' +
      '<p class="bl-note">命中黑名單的 ' + noun + ' 會在卡片/詳情標警告，且<b>不會被對話式搜尋推薦</b>。' +
        '清單存在你瀏覽器的 IndexedDB，<b>可自行增刪改</b>，不會上傳。' + defaultsNote +
        '請依實際情況維護；新增時務必附上可查證的來源。</p>' +
      '<div class="bl-list">' + rows + '</div>' +
      '<h3 class="bl-add-title">新增項目</h3>' +
      '<div class="bl-form">' +
        '<input id="bl-in-pat" class="bl-in" type="text" placeholder="比對規則：vendor/' +
          (MODE === "mcp" ? "server" : "skill") + '（單一）或 vendor（整個發布者）">' +
        '<div class="bl-form-row">' +
          '<select id="bl-in-sev" class="bl-in" title="嚴重度">' + sevOptions + '</select>' +
          '<select id="bl-in-act" class="bl-in" title="處置">' +
            '<option value="block">封鎖（不推薦，適合單一確認有問題的 skill）</option>' +
            '<option value="warn">提醒（仍推薦，適合整個發布者來源提醒）</option>' +
          '</select>' +
        '</div>' +
        '<textarea id="bl-in-reason" class="bl-in" rows="2" placeholder="原因：為什麼列入名單"></textarea>' +
        '<input id="bl-in-src" class="bl-in" type="url" placeholder="來源網址（建議填，方便查證）">' +
        '<div class="bl-form-actions">' +
          '<button id="bl-add" class="chat-send" type="button">新增</button>' +
          '<button id="bl-reset" class="reset-btn" type="button">↺ 還原預設名單</button>' +
        '</div>' +
        '<p id="bl-err" class="bl-err" hidden></p>' +
      '</div>';

    Array.prototype.forEach.call($("bl-body").querySelectorAll(".bl-del"), function (b) {
      b.addEventListener("click", function () {
        SkillDB.removeBlacklist(MODE, b.getAttribute("data-pat")).then(refreshBlacklist).then(renderBlModal);
      });
    });
    $("bl-add").addEventListener("click", onBlAdd);
    $("bl-reset").addEventListener("click", function () {
      if (!window.confirm("還原成預設黑名單？你目前的自訂內容會被覆蓋。")) return;
      SkillDB.resetBlacklist(MODE).then(refreshBlacklist).then(renderBlModal);
    });
  }

  function onBlAdd() {
    var pat = $("bl-in-pat").value.trim();
    var err = $("bl-err");
    if (!pat) { err.hidden = false; err.textContent = "請填寫比對規則（vendor/skill 或 vendor）。"; return; }
    var entry = {
      pattern: pat,
      severity: $("bl-in-sev").value || "suspicious",
      action: $("bl-in-act").value || "block",
      reason: $("bl-in-reason").value.trim(),
      source: $("bl-in-src").value.trim(),
      addedAt: new Date().toISOString().slice(0, 10)
    };
    SkillDB.putBlacklist(MODE, entry).then(refreshBlacklist).then(renderBlModal);
  }

  // 重新讀取黑名單並更新整個畫面
  function refreshBlacklist() {
    return SkillDB.getBlacklist(MODE).then(function (list) {
      BLACKLIST = list || [];
      buildBlControls();
      render();
    });
  }

  // ===================================================================
  // 文字大小（縮放）— 存在 localStorage，重整後保留
  // ===================================================================
  var FS_KEY = "skilldict.fontScale";
  var FS_STEPS = [0.85, 0.92, 1, 1.1, 1.25, 1.4, 1.6];

  function getScale() {
    var v = parseFloat(localStorage.getItem(FS_KEY));
    return (v && FS_STEPS.indexOf(v) >= 0) ? v : 1;
  }
  function applyScale(scale) {
    document.body.style.zoom = scale;            // 等比縮放整體（Chromium/Safari/新版 FF 支援）
    try { localStorage.setItem(FS_KEY, String(scale)); } catch (e) { /* ignore */ }
    var lbl = $("fs-label");
    if (lbl) lbl.textContent = Math.round(scale * 100) + "%";
    if ($("fs-dec")) $("fs-dec").disabled = scale <= FS_STEPS[0];
    if ($("fs-inc")) $("fs-inc").disabled = scale >= FS_STEPS[FS_STEPS.length - 1];
  }
  function stepScale(dir) {
    var i = FS_STEPS.indexOf(getScale());
    if (i < 0) i = FS_STEPS.indexOf(1);
    i = Math.max(0, Math.min(FS_STEPS.length - 1, i + dir));
    applyScale(FS_STEPS[i]);
  }
  function initFontSize() {
    applyScale(getScale());
    if ($("fs-dec")) $("fs-dec").addEventListener("click", function () { stepScale(-1); });
    if ($("fs-inc")) $("fs-inc").addEventListener("click", function () { stepScale(1); });
    if ($("fs-reset")) $("fs-reset").addEventListener("click", function () { applyScale(1); });
  }

  function buildStats() {
    var off = SKILLS.filter(function (s) { return s.official; }).length;
    var vendors = {};
    SKILLS.forEach(function (s) { vendors[s.vendor] = 1; });
    $("stats").innerHTML =
      '<div class="stat"><span class="num">' + SKILLS.length + '</span><span class="lbl">' + esc(COLLECTIONS[MODE].statLabel) + '</span></div>' +
      '<div class="stat"><span class="num">' + off + '</span><span class="lbl">官方</span></div>' +
      '<div class="stat"><span class="num">' + Object.keys(vendors).length + '</span><span class="lbl">發布者</span></div>';
    var fs = $("foot-source");
    if (fs) fs.innerHTML = '共收錄 <strong>' + SKILLS.length + '</strong> 個公開 ' + esc(COLLECTIONS[MODE].noun) +
      ' · ' + COLLECTIONS[MODE].source + ' · 由 Skill 字典自動彙整';
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // 依目前 MODE 重建可變動的 UI（統計、篩選、建議、卡片）。切換類型時呼叫。
  function buildMode() {
    empty.textContent = COLLECTIONS[MODE].emptyText;
    buildStats();
    buildFilters();
    buildBlControls();
    buildSuggestChips();
    render();
  }

  // 切換 Skill / MCP
  function setMode(mode) {
    if (mode === MODE || !COLLECTIONS[mode]) return;
    MODE = mode;
    SKILLS = sortSkills(COLLECTIONS[mode].items.slice());
    TAGS = COLLECTIONS[mode].tags;
    state.source = "all"; state.tag = "all"; state.keyword = "";
    if ($("keyword")) $("keyword").value = "";
    if ($("chat-input")) $("chat-input").value = "";
    var ca = $("chat-answer"); if (ca) { ca.hidden = true; ca.innerHTML = ""; }
    ["skill", "mcp"].forEach(function (m) {
      var btn = $("mode-" + m);
      if (btn) { btn.classList.toggle("active", m === mode); btn.setAttribute("aria-selected", m === mode); }
    });
    // 載入該類型專屬的黑名單後再重建 UI
    SkillDB.getBlacklist(mode).then(function (list) {
      BLACKLIST = list || [];
      buildMode();
    });
  }

  function buildUI() {
    initFontSize();
    buildMode();
    $("mode-skill").addEventListener("click", function () { setMode("skill"); });
    $("mode-mcp").addEventListener("click", function () { setMode("mcp"); });
    $("chat-form").addEventListener("submit", function (e) { e.preventDefault(); runChat($("chat-input").value.trim()); });
    $("keyword").addEventListener("input", function (e) { state.keyword = e.target.value.trim(); render(); });
    $("modal-close").addEventListener("click", closeModal);
    $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeModal(); });
    $("bl-close").addEventListener("click", closeBlModal);
    $("bl-modal").addEventListener("click", function (e) { if (e.target === $("bl-modal")) closeBlModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(); closeBlModal(); } });

    var resetBtn = $("reset-data");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!window.confirm("確定要清空本機 IndexedDB 並重新匯入資料嗎？")) return;
        resetBtn.disabled = true;
        resetBtn.textContent = "重設中…";
        SkillDB.reset().then(function () { location.reload(); });
      });
    }
    updateDbStatus();
  }

  function updateDbStatus() {
    var el = $("db-status");
    if (!el || !SkillDB.info) return;
    SkillDB.info().then(function (i) {
      var mode = i.mode === "indexeddb" ? "IndexedDB" : "記憶體（IndexedDB 不可用）";
      var when = i.seededAt ? "，匯入於 " + new Date(i.seededAt).toLocaleString() : "";
      el.textContent = "儲存：" + mode + " · 資料版本 " + (i.version || "?") + when;
    });
  }

  function sortSkills(arr) {
    // 維持與建置時相同的排序（官方優先 → 廠商 → 名稱）
    arr.sort(function (a, b) {
      if (a.official !== b.official) return a.official ? -1 : 1;
      var av = (a.vendor || "").toLowerCase(), bv = (b.vendor || "").toLowerCase();
      if (av !== bv) return av < bv ? -1 : 1;
      return (a.name || "").toLowerCase() < (b.name || "").toLowerCase() ? -1 : 1;
    });
    return arr;
  }

  // 啟動：優先從 IndexedDB 讀取；但畫面絕不被 IndexedDB 卡住——
  // 最多等 1.5 秒就先用種子資料（window.SKILLS）渲染，IndexedDB 在背景照常建立。
  function init() {
    applyScale(getScale());   // 盡早套用，避免載入時字體閃動
    var built = false;
    function buildOnce(skills, tags, mcps, mcpTags) {
      if (built) return;
      built = true;
      COLLECTIONS.skill.items = (skills && skills.length ? skills : (window.SKILLS || [])).slice();
      COLLECTIONS.skill.tags = tags && Object.keys(tags).length ? tags : (window.TAGS || {});
      COLLECTIONS.mcp.items = (mcps && mcps.length ? mcps : (window.MCPS || [])).slice();
      COLLECTIONS.mcp.tags = mcpTags && Object.keys(mcpTags).length ? mcpTags : (window.MCP_TAGS || {});
      if (!BLACKLIST.length) BLACKLIST = (window.BLACKLIST || []).slice();
      // 預設先顯示 skill
      SKILLS = sortSkills(COLLECTIONS.skill.items.slice());
      TAGS = COLLECTIONS.skill.tags;
      buildUI();
    }

    var timer = setTimeout(function () {
      console.warn("[SkillDB] 逾時，先用種子資料渲染");
      buildOnce(window.SKILLS, window.TAGS, window.MCPS, window.MCP_TAGS);
    }, 1500);

    SkillDB.init()
      .then(function () {
        return Promise.all([SkillDB.getAllSkills(), SkillDB.getTags(), SkillDB.getBlacklist("skill"),
          SkillDB.getAllMcps(), SkillDB.getMcpTags()]);
      })
      .then(function (res) {
        clearTimeout(timer);
        BLACKLIST = res[2] || [];
        buildOnce(res[0], res[1], res[3], res[4]);
        SkillDB.info().then(function (i) { console.log("[SkillDB]", i); });
      })
      .catch(function (err) {
        clearTimeout(timer);
        console.error("[SkillDB] 載入失敗，改用記憶體資料：", err);
        buildOnce(window.SKILLS, window.TAGS, window.MCPS, window.MCP_TAGS);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
