# -*- coding: utf-8 -*-
"""Curate the VoltAgent entries into a balanced ~150-220 set, infer tags+vendor."""
import json, re, sys, os
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "volt_skills.json")
OUT = os.path.join(HERE, "curated_raw.json")

recs = json.load(open(SRC, encoding="utf-8"))

# ---- per-group cap via rules ----
NVIDIA_INFRA = {
    "video-search-and-summarization","Megatron-Bridge","Megatron-Core","TensorRT-LLM",
    "NemoClaw","NeMo-RL","NeMo-Gym","NeMo-Evaluator","NeMo-Evaluator-Launcher",
    "Model-Optimizer","cuopt","TileGym","CUDA-Q","DALI","deepstream",
    "nemotron-voice-agent","rag",
}
def cap_for(group):
    if group in NVIDIA_INFRA:
        return 1
    if group.startswith("Skills by ") or group in ("Official Claude Skills", "Core Skills", "Ecosystem Tools"):
        return 3             # official vendor/team sections
    return 1                 # community / individual / language / domain buckets
CAP = {}
DEFAULT_CAP = 8

# ---- tag inference rules: tag -> keywords (matched on name+desc+group, lowercase) ----
TAG_RULES = OrderedDict([
    ("frontend",   ["angular","react","vue","svelte","frontend","ui ","css","tailwind","component","gsap","animation","remotion","web design","stitch"]),
    ("backend",    ["backend","server","api ","rest","graphql","endpoint","microservice","fastapi","express","nestjs"]),
    ("database",   ["postgres","sql","database","clickhouse","duckdb","mongodb","redis","neon","supabase","tinybird","query","schema","prisma","drizzle"]),
    ("auth",       ["auth","authentication","oauth","login","2fa","two-factor","better auth","auth0","identity","session","jwt"]),
    ("payments",   ["stripe","payment","billing","invoice","checkout","subscription","coinbase","binance"]),
    ("devops",     ["terraform","docker","kubernetes","k8s","ci/cd","deploy","infrastructure","hashicorp","netlify","vercel","cloudflare","provision","pipeline"]),
    ("cloud",      ["aws","gcp","azure","google cloud","vertex","firebase","cloud run","s3","lambda","serverless"]),
    ("ai-ml",      ["llm","model","gemini","openai","embedding","rag","fine-tun","agent","ml ","machine learning","inference","prompt","nemo","megatron","tensorrt","training","replicate","hugging face","fal.ai","minimax","voice agent"]),
    ("gpu",        ["cuda","gpu","tensorrt","megatron","nvidia","kernel","triton","tilegym"]),
    ("mobile",     ["react native","expo","flutter","ios","android","mobile"]),
    ("testing",    ["test","testing","jest","vitest","pytest","e2e","playwright","coverage"]),
    ("security",   ["security","vulnerab","audit","trail of bits","secure","exploit","sast"]),
    ("data",       ["data ","analytics","etl","dataframe","pandas","spreadsheet","csv","pipeline","tinybird","duckdb"]),
    ("docs",       ["docs","documentation","markdown","readme","reference","guide","pdf","pptx","docx","powerpoint","slide","presentation","spreadsheet","xlsx","word document","writing","prose","copywrit","editor","report"]),
    ("automation", ["automation","workflow","schedule","cron","ci ","notification","courier","resend","email","sms","push","trigger"]),
    ("observability",["observability","monitoring","logging","sentry","datadog","metrics","trace","telemetry"]),
    ("search",     ["search","crawl","scrape","firecrawl","browser","browserbase","index"]),
    ("web3",       ["web3","crypto","blockchain","binance","coinbase","onchain","solidity","wallet"]),
    ("design",     ["design","figma","canva","brand","logo","stitch","ui kit","visual","art","creative","animation","aesthetic"]),
    ("marketing",  ["marketing","seo","advertis","copywriting","typefully","social media","growth","campaign"]),
    ("product",    ["product manager","product management","roadmap","prd","user stor","prioriti"]),
    ("notion",     ["notion","workspace","note"]),
    ("python",     ["python","fastapi","django","pydantic","pytest","pandas"]),
    ("typescript", ["typescript","javascript","node","ts ","tsx","npm"]),
    ("java",       ["java ","spring","jvm","maven","gradle","kotlin"]),
    ("dotnet",     [".net","c#","dotnet","asp.net","nuget","blazor"]),
    ("rust",       ["rust","cargo","tokio"]),
])

def infer_tags(name, desc, group):
    hay = (" " + name + " " + desc + " " + group + " ").lower()
    tags = []
    for tag, kws in TAG_RULES.items():
        for kw in kws:
            if kw in hay:
                tags.append(tag); break
    return tags[:4] if tags else ["misc"]

# GitHub org/handle prefix -> friendly publisher name
PRETTY = {
    "anthropics": "Anthropic", "voltagent": "VoltAgent", "angular": "Angular",
    "composiohq": "Composio", "supabase": "Supabase", "google-gemini": "Google Gemini",
    "stripe": "Stripe", "trycourier": "Courier", "callstackincubator": "CallStack",
    "better-auth": "Better Auth", "tinybirdco": "Tinybird", "hashicorp": "HashiCorp",
    "sanity-io": "Sanity", "firecrawl": "Firecrawl", "neondatabase": "Neon",
    "clickhouse": "ClickHouse", "remotion-dev": "Remotion", "replicate": "Replicate",
    "typefully": "Typefully", "veniceai": "Venice.ai", "vercel-labs": "Vercel",
    "cloudflare": "Cloudflare", "netlify": "Netlify", "google-labs-code": "Google Labs (Stitch)",
    "googleworkspace": "Google Workspace", "expo": "Expo", "huggingface": "Hugging Face",
    "trailofbits": "Trail of Bits", "getsentry": "Sentry", "microsoft": "Microsoft",
    "fal-ai-community": "fal.ai", "WordPress": "WordPress", "openai": "OpenAI",
    "figma": "Figma", "coreyhaines31": "Corey Haines", "realkimbarrett": "Kim Barrett",
    "binance": "Binance", "apollographql": "Apollo GraphQL", "auth0": "Auth0",
    "brave": "Brave", "browserbase": "Browserbase", "coderabbitai": "CodeRabbit",
    "coinbase": "Coinbase", "datadog-labs": "Datadog Labs", "firebase": "Firebase",
    "flutter": "Flutter", "deanpeters": "Dean Peters", "phuryn": "Paweł Huryn",
    "MiniMax-AI": "MiniMax", "duckdb": "DuckDB", "greensock": "GSAP (GreenSock)",
    "garrytan": "Garry Tan", "makenotion": "Notion", "resend": "Resend",
    "addyosmani": "Addy Osmani", "mongodb": "MongoDB", "redis": "Redis",
    "NVIDIA": "NVIDIA", "google": "Google Cloud", "redhat": "Red Hat",
    "cypress-io": "Cypress", "qdrant": "Qdrant", "BrianRWagner": "Brian R. Wagner",
    "PSPDFKit-labs": "Nutrient (PSPDFKit)", "robzolkos": "Rob Zolkos",
    "muratcankoylan": "Murat Can Koylan", "transloadit": "Transloadit",
    "czlonkowski": "czlonkowski",
}
def vendor_of(name, group):
    handle = name.split("/")[0]
    return PRETTY.get(handle, handle)

# dedupe by name (first wins), apply caps
seen = set()
counts = Counter()
out = []
for r in recs:
    nm = r["name"]
    if nm in seen:
        continue
    g = r["group"]
    cap = cap_for(g)
    if counts[g] >= cap:
        continue
    seen.add(nm)
    counts[g] += 1
    tags = infer_tags(r["name"], r["desc"], g)
    official = (g.startswith("Skills by ") or g in ("Official Claude Skills", "Core Skills", "Ecosystem Tools") or g in NVIDIA_INFRA)
    out.append({
        "name": nm,
        "url": r["url"],
        "rawDescription": r["desc"],
        "vendor": vendor_of(nm, g),
        "group": g,
        "section": r["section"],
        "tags": tags,
        "official": official,
    })

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("SELECTED", len(out), file=sys.stderr)
tg = Counter(t for r in out for t in r["tags"])
print("tag distribution:", dict(tg.most_common()), file=sys.stderr)
notag = [r["name"] for r in out if not r["tags"]]
print("no-tag count:", len(notag), file=sys.stderr)
print("sample no-tag:", notag[:15], file=sys.stderr)
