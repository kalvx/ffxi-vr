"""Extract short location and role facts from a BG Wiki API revision export.

Input is a JSON mapping of page title to wikitext. The output is deliberately
small and is reviewed before inclusion in the public directory.
"""
import argparse
import html
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()


def clean(value):
    value = re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r"\2", value)
    value = re.sub(r"\[\[([^]]+)\]\]", r"\1", value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value).strip(" ' .")
    return re.sub(r"\s+", " ", value)


facts = {}
for name, source in json.loads(args.source.read_text(encoding="utf-8")).items():
    fields = {key.strip().lower(): value.strip() for key, value in re.findall(r"^\|[ \t]*([^=\n]+?)[ \t]*=[ \t]*([^\n]*)", source, re.M)}
    fact = {}
    description = clean(fields.get("description", ""))
    if description and len(description.split()) <= 24 and len(description) <= 170 and not re.search(r"[{}\[\]|]", description):
        fact["role"] = description + ("" if description.endswith((".", "!", "?")) else ".")
    npc_type = clean(fields.get("type", ""))
    if npc_type and len(npc_type) <= 45 and not re.search(r"[{}\[\]|]", npc_type) and npc_type.lower() not in {"npc", "quest npc", "cutscene npc"}:
        fact["type"] = npc_type
    position = clean(fields.get("position", ""))
    location = clean(fields.get("location", ""))
    if re.fullmatch(r"[A-Z]-\d{1,2}", position) and location and len(location) <= 45 and not re.search(r"[{}\[\]|]", location):
        fact["grid"] = location + " " + position
    if fact:
        facts[name] = fact

output = Path(__file__).resolve().parents[1] / "npcs" / "bg-facts.json"
output.write_text(json.dumps(facts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Saved {len(facts)} referenced NPC facts")
