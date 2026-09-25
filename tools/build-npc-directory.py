"""Build NPC search data from LSB zone spawns and Compendium quest guides.

Run with --zones PATH pointing at LandSandBoat/server data/zones. The checked-in
JSON remains available for the static site without a runtime data dependency.
"""
import argparse
import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAG = re.compile(r"<[^>]+>")


def plain(value):
    return re.sub(r"\s+", " ", html.unescape(TAG.sub(" ", value))).strip()


def field(source, label):
    match = re.search(r"<tr><th>" + re.escape(label) + r"</th><td>(.*?)</td></tr>", source, re.S)
    return plain(match.group(1)) if match else ""


guides = []
for path in sorted((ROOT / "quests").rglob("*.html")):
    if path.name == "index.html":
        continue
    source = path.read_text(encoding="utf-8")
    npc = field(source, "Start NPC")
    if not npc or len(npc) > 65 or npc.lower() in {"none", "various", "multiple"}:
        continue
    title = re.search(r"<h1[^>]*>(.*?)</h1>", source, re.S)
    if not title:
        continue
    section = re.search(r'<ol class="guide-steps">(.*?)</ol>', source, re.S)
    steps = [plain(step) for step in re.findall(r"<li(?:\s[^>]*)?>(.*?)</li>", section.group(1), re.S)] if section else []
    guides.append(dict(npc=npc, title=plain(title.group(1)), url="../" + path.relative_to(ROOT).as_posix(), zone=field(source, "Starting zone"), coordinates=field(source, "Coordinates"), requirements=plain((re.search(r'<h2>Required items and key items</h2>(.*?)</section>', source, re.S) or ["", ""])[1]), steps=steps))

people = defaultdict(lambda: {"locations": [], "zones": [], "quests": []})
for guide in guides:
    person = people[guide["npc"]]
    where = " ".join(part for part in (guide["zone"], guide["coordinates"]) if part)
    if where and where not in person["locations"]:
        person["locations"].append(where)
    zone = re.sub(r"\s+(?:North|South)$", "", guide["zone"])
    if zone and zone not in person["zones"]:
        person["zones"].append(zone)

names = sorted(people, key=len, reverse=True)
for guide in guides:
    text = " ".join(guide["steps"])
    for name in names:
        if guide["npc"] != name and not re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", text, re.I):
            continue
        interactions = []
        for index, step in enumerate(guide["steps"]):
            if re.search(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", step, re.I):
                interactions.append(step)
                if re.search(r"\b(receive|obtain|gives? you)\b", step, re.I) and index + 1 < len(guide["steps"]):
                    interactions.append("Next: " + guide["steps"][index + 1])
        if not interactions and guide["steps"]:
            interactions = [guide["steps"][0]]
        people[name]["quests"].append({k: guide[k] for k in ("title", "url", "requirements")} | {"role": "Starts here" if name == guide["npc"] else "Appears in walkthrough", "interactions": interactions[:5]})

parser = argparse.ArgumentParser()
parser.add_argument("--zones", type=Path)
args = parser.parse_args()
if args.zones:
    ignored = {"???", "DIRECTOR", "PRODUCER", "NPC", "Dummy", "none"}
    for path in sorted(args.zones.glob("*/npcs.yaml")):
        zone = path.parent.name.replace("_", " ").title().replace("D Oraguille", "d'Oraguille")
        for block in re.split(r"(?=^  \d+:)", path.read_text(encoding="utf-8"), flags=re.M)[1:]:
            name_match = re.search(r"^    display_name:\s*(.+)$", block, re.M)
            if not name_match or not re.search(r"^    status:\s*normal\s*$", block, re.M):
                continue
            name = name_match.group(1).strip().strip('"\'')
            if name in ignored or re.match(r"^(?:warp|door|passage|target|placeholder)\d+$", name, re.I) or not re.search(r"[A-Za-z]", name):
                continue
            if name.isupper() and len(name) > 12:
                continue
            entry = people[name]
            if zone not in entry["locations"]:
                entry["locations"].append(zone)
            if zone not in entry["zones"]:
                entry["zones"].append(zone)

if "Ranpi-Monpi" in people:
    people["Ranpi-Monpi"]["notes"] = [
        "Apple Vinegar is mentioned in the A Crisis in the Making scene: it spoiled the Yagudo offering. Next, go to Giddeus, retrieve the Off offering key item from the altar on the lower level at G-6, and return to Ranpi-Monpi. The quest does not ask you to trade a bottle of Apple Vinegar.",
        "The Dawn of Delectability involves a different Ranpi-Monpi in past Windurst Waters (S); its walkthrough is not yet in this Compendium."
    ]

out = [{"name": name, **data} for name, data in sorted(people.items())]
(ROOT / "npcs").mkdir(exist_ok=True)
(ROOT / "npcs" / "quest-index.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Indexed {len(out)} NPC names across {len(guides)} quest guides")
