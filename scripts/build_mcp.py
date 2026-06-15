# -*- coding: utf-8 -*-
"""Select a curated set of recognizable MCP servers from mcp_servers.json,
attach zh-TW overviews + tags, and emit web/data/mcps.js.

Mirrors the skills pipeline (parse -> select+build). The awesome-mcp-servers list
is a spam-laden firehose, so unlike skills we DON'T auto-sample — we hand-pick
recognizable servers and pull their real url/description from the parsed data.
"""
import json, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "mcp_servers.json")
OUT = os.path.join(ROOT, "web", "data", "mcps.js")

MCP_TAGS = {
    "version-control": "版本控制", "dev-tools": "開發工具", "database": "資料庫",
    "vector": "向量 / 檢索", "knowledge": "知識 / 記憶", "cloud": "雲端平台",
    "devops": "DevOps / IaC", "observability": "監控 / 可觀測", "communication": "通訊 / 訊息",
    "productivity": "生產力 / 協作", "search": "搜尋 / 擷取", "browser": "瀏覽器自動化",
    "data": "資料平台 / 分析", "ai-ml": "AI / 模型", "design": "設計 / 創意",
    "filesystem": "檔案 / 文件", "location": "地圖 / 位置", "media": "多媒體",
    "payments": "金流 / 支付", "automation": "自動化 / 整合", "misc": "其他",
}

# friendly publisher names by GitHub handle (lowercased)
PRETTY = {
    "modelcontextprotocol": "Model Context Protocol", "github": "GitHub",
    "korotovsky": "korotovsky", "glips": "GLips", "tacticlaunch": "tacticlaunch",
    "getsentry": "Sentry", "grafana": "Grafana", "cloudflare": "Cloudflare",
    "supabase-community": "Supabase (community)", "apify": "Apify",
    "browserbase": "Browserbase", "exa-labs": "Exa", "sooperset": "sooperset",
    "ahujasid": "ahujasid", "microsoft": "Microsoft", "executeautomation": "ExecuteAutomation",
    "chroma-core": "Chroma", "neo4j-contrib": "Neo4j", "qdrant": "Qdrant",
    "snowflake-labs": "Snowflake Labs", "awslabs": "AWS Labs", "redis": "Redis",
    "docker": "Docker", "hashicorp": "HashiCorp", "pulumi": "Pulumi",
    "dbt-labs": "dbt Labs", "pinecone-io": "Pinecone", "vercel": "Vercel",
    "jetbrains": "JetBrains", "dynatrace-oss": "Dynatrace", "pydantic": "Pydantic",
    "translated": "Translated", "integromat": "Make (Integromat)", "mediar-ai": "Mediar AI",
    "posthog": "PostHog", "clickhouse": "ClickHouse", "cr7258": "cr7258",
    "flux159": "Flux159", "furey": "furey", "domdomegg": "domdomegg",
    "tomatio13": "Tomatio13", "ktanaka101": "ktanaka101", "chaindead": "chaindead",
    "saseq": "SaseQ", "kimtaeyoon83": "kimtaeyoon83", "marcelmarais": "marcelmarais",
    "tanigami": "tanigami", "mendableai": "Firecrawl (Mendable)", "stripe": "Stripe",
    "elevenlabs": "ElevenLabs", "makenotion": "Notion",
}

# curated picks: source-name -> {tags, overview, official?}
# source-name must match a record name in mcp_servers.json (or be a MANUAL entry below)
CURATED = {
 "github/github-mcp-server": (["version-control", "dev-tools"], True,
    "GitHub 官方 MCP：管理儲存庫、PR、Issue 與 GitHub API。"),
 "korotovsky/slack-mcp-server": (["communication"], False,
    "連接 Slack 工作區，讀寫頻道、訊息與對話脈絡。"),
 "GLips/Figma-Context-MCP": (["design", "dev-tools"], False,
    "把 Figma 設計資料直接餵給編碼代理，一次到位實作設計。"),
 "tacticlaunch/mcp-linear": (["productivity"], False,
    "整合 Linear 專案管理：議題、專案與工作流。"),
 "getsentry/sentry-mcp": (["observability", "dev-tools"], True,
    "Sentry.io 整合：錯誤追蹤與效能監控。"),
 "grafana/mcp-grafana": (["observability"], True,
    "搜尋儀表板、調查事件並查詢 Grafana 資料來源。"),
 "cloudflare/mcp-server-cloudflare": (["cloud", "devops"], True,
    "整合 Cloudflare：Workers、KV、R2、D1 等服務。"),
 "supabase-community/supabase-mcp": (["database", "cloud"], True,
    "把 AI 助理直接連到 Supabase 專案，管理資料庫與服務。"),
 "apify/actors-mcp-server": (["search", "automation"], False,
    "用 3,000+ 雲端 Actor 從網站、電商、社群、地圖等擷取資料。"),
 "browserbase/mcp-server-browserbase": (["browser", "cloud"], True,
    "在雲端自動化瀏覽器操作：導覽、擷取資料、填表。"),
 "exa-labs/exa-mcp-server": (["search", "ai-ml"], True,
    "讓 AI 助理用 Exa AI 搜尋 API 做網路搜尋。"),
 "sooperset/mcp-atlassian": (["productivity", "dev-tools"], False,
    "Atlassian 整合：Confluence 與 Jira（Cloud / Server / Data Center）。"),
 "ahujasid/blender-mcp": (["design", "media"], False,
    "操作 Blender 進行 3D 建模與場景控制。"),
 "microsoft/playwright-mcp": (["browser"], True,
    "微軟官方 Playwright MCP：以無障礙樹驅動瀏覽器自動化與測試。"),
 "executeautomation/playwright-mcp-server": (["browser"], False,
    "用 Playwright 做瀏覽器自動化與網頁爬取。"),
 "chroma-core/chroma-mcp": (["vector", "database"], True,
    "存取本機或雲端 Chroma，提供向量檢索能力。"),
 "neo4j-contrib/mcp-neo4j": (["database", "knowledge"], False,
    "Neo4j 圖資料庫：查詢、知識圖譜記憶與 Aura 執行個體管理。"),
 "qdrant/mcp-server-qdrant": (["vector", "database"], False,
    "Qdrant 向量資料庫的官方 MCP，做語意檢索與記憶。"),
 "Snowflake-Labs/mcp": (["data", "database"], False,
    "Snowflake 官方開源 MCP：Cortex 代理、查詢結構化與非結構化資料。"),
 "awslabs/mcp": (["cloud", "devops"], True,
    "AWS Labs 一系列 MCP，無縫整合各項 AWS 服務與資源。"),
 "redis/mcp-redis": (["database"], True,
    "Redis 官方 MCP：管理與搜尋 Redis 中的資料。"),
 "docker/hub-mcp": (["devops", "dev-tools"], True,
    "Docker Hub 官方 MCP：存取儲存庫、搜尋與 Hardened Images。"),
 "hashicorp/terraform-mcp-server": (["devops", "cloud"], True,
    "Terraform 官方 MCP：provider 探索、模組分析與 IaC 工作流。"),
 "pulumi/mcp-server": (["devops", "cloud"], True,
    "透過 Pulumi Automation / Cloud API 操作基礎設施即程式碼。"),
 "dbt-labs/dbt-mcp": (["data"], True,
    "dbt 官方 MCP：整合 dbt Core / Cloud 的資料轉換工作流。"),
 "pinecone-io/assistant-mcp": (["vector", "knowledge"], True,
    "連接 Pinecone Assistant，從知識引擎提供脈絡給代理。"),
 "vercel/next-devtools-mcp": (["dev-tools"], True,
    "Next.js 官方 MCP：執行期診斷、路由檢視、開發伺服器日誌與文件搜尋。"),
 "jetbrains/mcpProxy": (["dev-tools"], True,
    "連接 JetBrains IDE 的官方 MCP Proxy。"),
 "dynatrace-oss/dynatrace-mcp": (["observability"], True,
    "Dynatrace 可觀測性：分析異常、日誌、追蹤、事件與指標。"),
 "pydantic/logfire-mcp": (["observability"], True,
    "透過 Logfire 存取 OpenTelemetry 的追蹤與指標。"),
 "translated/lara-mcp": (["ai-ml"], True,
    "Lara Translate API：語言偵測與脈絡感知的高品質翻譯。"),
 "integromat/make-mcp-server": (["automation"], True,
    "把 Make（Integromat）情境變成 AI 可呼叫的工具。"),
 "mediar-ai/screenpipe": (["ai-ml", "productivity"], True,
    "以螢幕/音訊脈絡打造情境感知 AI 代理（NextJS 外掛生態）。"),
 "microsoft/markitdown": (["filesystem", "data"], True,
    "MarkItDown：把多種檔案格式轉成適合 LLM 的 Markdown。"),
 "posthog/mcp": (["data", "dev-tools"], True,
    "PostHog 分析整合：事件分析、功能旗標與錯誤追蹤。"),
 "ClickHouse/mcp-clickhouse": (["database", "data"], True,
    "ClickHouse 整合：schema 檢視與查詢能力。"),
 "cr7258/elasticsearch-mcp-server": (["database", "search"], False,
    "Elasticsearch 互動：索引查詢與搜尋。"),
 "flux159/mcp-server-kubernetes": (["devops", "cloud"], False,
    "以 TypeScript 操作 Kubernetes 叢集：Pod、Deployment、Service。"),
 "furey/mongodb-lens": (["database"], False,
    "MongoDB Lens：功能完整的 MongoDB 資料庫 MCP。"),
 "domdomegg/airtable-mcp-server": (["database", "productivity"], False,
    "Airtable 整合：schema 檢視與讀寫資料。"),
 "Tomatio13/mcp-server-tavily": (["search", "ai-ml"], False,
    "Tavily AI 搜尋 API 整合，為代理做網路檢索。"),
 "ktanaka101/mcp-server-duckdb": (["database", "data"], False,
    "DuckDB 整合：schema 檢視與分析查詢。"),
 "chaindead/telegram-mcp": (["communication"], False,
    "Telegram 整合：存取使用者資料、管理對話與訊息。"),
 "saseq/discord-mcp": (["communication"], False,
    "Discord 整合：讓 AI 助理收發訊息與管理頻道。"),
 "kimtaeyoon83/mcp-server-youtube-transcript": (["media", "search"], False,
    "擷取 YouTube 字幕與逐字稿供 AI 分析。"),
 "marcelmarais/Spotify": (["media"], False,
    "Spotify 整合：播放控制與音樂資料存取。"),
 "modelcontextprotocol/server-google-maps": (["location"], True,
    "Google Maps 整合：位置服務、路線規劃與地點詳情。"),
 "modelcontextprotocol/server-sqlite": (["database"], True,
    "SQLite 資料庫操作，內建商業智慧分析功能。"),
 "tanigami/mcp-server-perplexity": (["search", "ai-ml"], False,
    "串接 Perplexity API 做帶來源的問答檢索。"),
}

# reference servers (official, vendor = Model Context Protocol)
REFERENCE = {
 "Everything": ("https://github.com/modelcontextprotocol/servers/tree/main/src/everything",
    ["dev-tools"], "參考 / 測試伺服器，示範 prompts、resources 與 tools。"),
 "Fetch": ("https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    ["search", "browser"], "擷取網頁內容並轉換成適合 LLM 使用的格式。"),
 "Filesystem": ("https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    ["filesystem"], "具可設定存取控制的安全檔案操作。"),
 "Git": ("https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    ["version-control", "dev-tools"], "讀取、搜尋與操作 Git 儲存庫的工具。"),
 "Memory": ("https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    ["knowledge"], "以知識圖譜為基礎的持久記憶系統。"),
 "Sequential Thinking": ("https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
    ["ai-ml"], "透過思考序列做動態、反思式的問題解決。"),
 "Time": ("https://github.com/modelcontextprotocol/servers/tree/main/src/time",
    ["misc"], "時間與時區轉換能力。"),
}

# manual entries not present in the awesome list (verified live, 200 OK)
MANUAL = {
 "mendableai/firecrawl-mcp-server": ("https://github.com/mendableai/firecrawl-mcp-server",
    ["search", "browser"], True, ["typescript"], ["cloud"],
    "Firecrawl 官方 MCP：網頁搜尋、爬取、擷取與瀏覽器互動。"),
 "stripe/agent-toolkit": ("https://github.com/stripe/agent-toolkit",
    ["payments"], True, ["typescript", "python"], ["cloud"],
    "Stripe 官方 Agent Toolkit：讓代理透過 MCP 操作金流與計費。"),
 "elevenlabs/elevenlabs-mcp": ("https://github.com/elevenlabs/elevenlabs-mcp",
    ["media", "ai-ml"], True, ["python"], ["cloud"],
    "ElevenLabs 官方 MCP：文字轉語音、語音複製與音訊生成。"),
 "makenotion/notion-mcp-server": ("https://github.com/makenotion/notion-mcp-server",
    ["productivity", "knowledge"], True, ["typescript"], ["cloud"],
    "Notion 官方 MCP：讀寫頁面、資料庫與工作區內容。"),
}


def vendor_of(handle):
    return PRETTY.get(handle.lower(), handle)


def main():
    recs = {r["name"]: r for r in json.load(open(SRC, encoding="utf-8"))}
    out = []
    missing = []

    # curated from upstream data
    for name, (tags, official, ov) in CURATED.items():
        r = recs.get(name)
        if not r:
            missing.append(name)
            continue
        handle = name.split("/")[0]
        out.append({
            "id": name,
            "name": name.split("/")[-1],
            "fullName": name,
            "vendor": vendor_of(handle),
            "official": official or r["flags"]["official"],
            "url": r["url"],
            "tags": tags,
            "langs": r["flags"]["langs"],
            "scopes": r["flags"]["scopes"],
            "overview": ov,
            "rawDescription": r["desc"],
        })

    # reference servers
    for name, (url, tags, ov) in REFERENCE.items():
        out.append({
            "id": "modelcontextprotocol/" + name.lower().replace(" ", "-"),
            "name": name,
            "fullName": "modelcontextprotocol/" + name.lower().replace(" ", "-"),
            "vendor": "Model Context Protocol",
            "official": True,
            "url": url,
            "tags": tags,
            "langs": [],
            "scopes": ["local"],
            "overview": ov,
            "rawDescription": "Official MCP reference server maintained by the MCP steering group.",
        })

    # manual entries
    for name, (url, tags, official, langs, scopes, ov) in MANUAL.items():
        handle = name.split("/")[0]
        out.append({
            "id": name,
            "name": name.split("/")[-1],
            "fullName": name,
            "vendor": vendor_of(handle),
            "official": official,
            "url": url,
            "tags": tags,
            "langs": langs,
            "scopes": scopes,
            "overview": ov,
            "rawDescription": "",
        })

    out.sort(key=lambda s: (not s["official"], s["vendor"].lower(), s["name"].lower()))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tags_json = json.dumps(MCP_TAGS, ensure_ascii=False, indent=1)
    mcps_json = json.dumps(out, ensure_ascii=False, indent=1)
    ver = hashlib.md5((tags_json + mcps_json).encode("utf-8")).hexdigest()[:12]
    payload = ('window.MCP_DATA_VERSION = "%s";\nwindow.MCP_TAGS = %s;\nwindow.MCPS = %s;\n'
               % (ver, tags_json, mcps_json))
    open(OUT, "w", encoding="utf-8").write(payload)

    off = sum(1 for s in out if s["official"])
    vendors = len(set(s["vendor"] for s in out))
    print("WROTE %d MCP servers (official %d, community %d, %d vendors) v%s -> %s"
          % (len(out), off, len(out) - off, vendors, ver, OUT), file=sys.stderr)
    if missing:
        print("MISSING from upstream (%d): %s" % (len(missing), ", ".join(missing)), file=sys.stderr)


if __name__ == "__main__":
    main()
