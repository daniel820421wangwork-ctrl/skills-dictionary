# -*- coding: utf-8 -*-
"""Parse VoltAgent awesome-agent-skills README into structured entries."""
import re, json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "volt_readme.md")
OUT = os.path.join(HERE, "volt_skills.json")

lines = open(SRC, encoding="utf-8").read().split("\n")

# only parse the body between the first real section and the Security Notice
entry_re = re.compile(r'^\s*[-*]\s+\*\*\[(.+?)\]\((.+?)\)\*\*\s*[-–—]\s*(.+?)\s*$')
h2_re = re.compile(r'^##\s+(.+?)\s*$')
h3_re = re.compile(r'^###\s+(.+?)\s*$')
# vendor sections rendered as collapsible HTML: <summary><h3 ...>TITLE</h3></summary>
html_h3_re = re.compile(r'<h3[^>]*>(.+?)</h3>', re.I)

STOP = "🔒 Security Notice"
records = []
section = ""
group = ""
started = False
for ln in lines:
    h2 = h2_re.match(ln)
    h3 = h3_re.match(ln)
    if h2:
        title = h2.group(1).strip()
        if STOP in title or title.startswith("Skills Paths") or title.startswith("Skill Quality") or title.startswith("Contributing") or title.startswith("Contributor") or title.startswith("License"):
            break
        section = title
        if title == "Ecosystem Tools":
            group = "Ecosystem Tools"
        continue
    if h3:
        group = h3.group(1).strip()
        if group.startswith("Official Skills by") or group == "Table of Contents":
            group = ""
        continue
    hm = html_h3_re.search(ln)
    if hm:
        group = re.sub(r'\s+', ' ', hm.group(1)).strip().rstrip('.')
        continue
    m = entry_re.match(ln)
    if m and group:
        name, url, desc = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        # skip pure section/toc artifacts
        records.append({"name": name, "url": url, "desc": desc, "group": group, "section": section})

json.dump(records, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# report
from collections import Counter, OrderedDict
print("TOTAL", len(records), file=sys.stderr)
gc = Counter(r["group"] for r in records)
print("GROUPS", len(gc), file=sys.stderr)
for g, c in gc.most_common():
    print("%4d  %s" % (c, g), file=sys.stderr)
