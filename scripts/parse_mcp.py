# -*- coding: utf-8 -*-
"""Parse MCP server lists (awesome-mcp-servers + official servers repo) into structured entries.

Outputs scripts/mcp_servers.json — one record per server with:
  name, url, desc, category, flags{official,langs,scopes}, source
"""
import re, json, sys, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
AWESOME = os.path.join(HERE, "mcp_awesome_readme.md")
OFFICIAL = os.path.join(HERE, "mcp_official_readme.md")
OUT = os.path.join(HERE, "mcp_servers.json")

# ---- emoji legend ----
LANG_EMOJI = {
    "\U0001F40D": "python",      # 🐍
    "\U0001F4C7": "typescript",  # 📇
    "\U0001F3CE️": "go",    # 🏎️
    "\U0001F980": "rust",        # 🦀
    "#️⃣": "csharp",   # #️⃣
    "☕": "java",            # ☕
    "\U0001F30A": "cpp",         # 🌊
    "\U0001F48E": "ruby",        # 💎
}
SCOPE_EMOJI = {
    "☁️": "cloud",   # ☁️
    "\U0001F3E0": "local",     # 🏠
    "\U0001F4DF": "embedded",  # 📟
}
OFFICIAL_EMOJI = "\U0001F396️"  # 🎖️

# section header: ### <emoji?> <a name="..."></a>Title   OR   ### <emoji?> Title
sec_re = re.compile(r'^###\s+(.*?)\s*$')
aname_re = re.compile(r'<a name="[^"]*">\s*</a>')
# entry: - [name](url) ...rest
entry_re = re.compile(r'^\s*[-*]\s+\[(.+?)\]\((https?://[^)]+)\)\s*(.*)$')
# glama/score badge images: [![...](...)](...)  or ![...](...)
badge_re = re.compile(r'!?\[!?\[[^\]]*\]\([^)]*\)\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)')

def clean_section(title):
    title = aname_re.sub('', title)
    # strip leading emoji + spaces
    title = re.sub(r'^[^A-Za-z0-9]+', '', title).strip()
    return title

def parse_flags(rest):
    official = OFFICIAL_EMOJI in rest
    langs = [v for e, v in LANG_EMOJI.items() if e in rest]
    scopes = [v for e, v in SCOPE_EMOJI.items() if e in rest]
    return {"official": official, "langs": langs, "scopes": scopes}

def split_desc(rest):
    rest = badge_re.sub('', rest)
    # description is what follows the first " - " / " – " after flag cluster
    m = re.search(r'\s[-–—]\s+(.*)$', rest)
    desc = m.group(1).strip() if m else ""
    flagpart = rest[:m.start()] if m else rest
    return flagpart, desc

records = []

# ---- awesome list ----
SKIP_SECTIONS = {"Clients", "Tutorials", "Community", "Legend", "Frameworks",
                 "Tips and Tricks", "Tips & Tricks", "What is MCP?", "Star History",
                 "Server Implementations"}
lines = open(AWESOME, encoding="utf-8").read().split("\n")
section = ""
in_servers = False
for ln in lines:
    sm = sec_re.match(ln)
    if sm:
        section = clean_section(sm.group(1))
        continue
    # only parse list entries that look like server rows (have a github-ish url)
    em = entry_re.match(ln)
    if not em or not section or section in SKIP_SECTIONS:
        continue
    name, url, rest = em.group(1).strip(), em.group(2).strip(), em.group(3)
    flagpart, desc = split_desc(rest)
    flags = parse_flags(flagpart + rest)
    records.append({
        "name": name, "url": url, "desc": desc,
        "category": section, "flags": flags, "source": "awesome",
    })

# ---- official reference servers ----
off_lines = open(OFFICIAL, encoding="utf-8").read().split("\n")
off_entry = re.compile(r'^\s*[-*]\s+\*\*\[(.+?)\]\(([^)]+)\)\*\*\s*[-–—]\s*(.+?)\s*$')
in_ref = False
for ln in off_lines:
    if ln.startswith("## "):
        in_ref = ln.strip().endswith("Reference Servers")
        continue
    if ln.startswith("### "):  # Archived subsection -> stop collecting
        in_ref = False
        continue
    if not in_ref:
        continue
    m = off_entry.match(ln)
    if not m:
        continue
    name, path, desc = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
    url = path if path.startswith("http") else "https://github.com/modelcontextprotocol/servers/tree/main/" + path
    records.append({
        "name": name, "url": url, "desc": desc,
        "category": "Reference Servers", "flags": {"official": True, "langs": [], "scopes": []},
        "source": "official",
    })

json.dump(records, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
print("TOTAL", len(records), file=sys.stderr)
cc = Counter(r["category"] for r in records)
print("CATEGORIES", len(cc), file=sys.stderr)
for c, n in cc.most_common():
    print("%4d  %s" % (n, c), file=sys.stderr)
off = sum(1 for r in records if r["flags"]["official"])
print("OFFICIAL-flagged:", off, file=sys.stderr)
