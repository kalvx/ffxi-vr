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
for path in sorted([*(ROOT / "quests").rglob("*.html"), *(ROOT / "missions").rglob("*.html")]):
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
    guides.append(dict(npc=npc, title=plain(title.group(1)), url="../" + path.relative_to(ROOT).as_posix(), zone=field(source, "Starting zone"), coordinates=field(source, "Coordinates"), requirements=plain((re.search(r'<h2>Required items and key items</h2>(.*?)</section>', source, re.S) or ["", ""])[1]), steps=steps, kind="Mission" if "missions" in path.parts else "Quest"))

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
        people[name]["quests"].append({k: guide[k] for k in ("title", "url", "requirements")} | {"role": guide["kind"] + (" starts here" if name == guide["npc"] else " walkthrough"), "interactions": interactions[:5]})

parser = argparse.ArgumentParser()
parser.add_argument("--zones", type=Path)
parser.add_argument("--scripts", type=Path)
parser.add_argument("--story-scripts", type=Path, help="LandSandBoat scripts directory containing quests and missions")
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

if args.scripts:
    names_by_key = defaultdict(list)
    for known_name in people:
        names_by_key[re.sub(r"[^a-z0-9]", "", known_name.lower())].append(known_name)
    for path in sorted(args.scripts.glob("*/npcs/*.lua")):
        source = path.read_text(encoding="utf-8", errors="replace")
        header = source.split("-----------------------------------", 2)[1] if "-----------------------------------" in source else ""
        npc_match = re.search(r"^--\s+NPC:\s*(.+)$", header, re.M)
        if not npc_match:
            continue
        name = npc_match.group(1).strip()
        if name not in people:
            candidates = names_by_key.get(re.sub(r"[^a-z0-9]", "", name.lower()), [])
            if len(candidates) != 1:
                continue
            name = candidates[0]
        entry = people[name]
        activities = entry.setdefault("activities", [])
        def add(message):
            if message not in activities:
                activities.append(message)

        for label, comment in re.findall(r"^--\s*(Type|Starts? and Finishes? Quest|Starts? Quest|Involved in quest|Guild Merchant NPC):\s*(.+)$", header, re.M | re.I):
            comment = comment.strip().rstrip('.')
            if len(comment) <= 110 and not comment.startswith('!'):
                add(('Quest connections: ' if 'quest' in label.lower() else '') + comment)
        if "guildMasterOnTrigger" in source:
            add("Guild master: handles craft enrollment, rank advancement, and required item trades.")
        elif "guildShops.onTrigger" in source or "xi.shop.generalGuild" in source:
            add("Guild shop: speak to this NPC to browse guild stock; availability may change.")
        elif re.search(r"xi\.shop\.(?:general|nation|standard|generalGuild|sell|bartender)", source):
            add("Merchant: speak to this NPC to browse their shop stock.")
        if "advancedSynthesisImageSupport" in source or "advancedSupport" in source:
            add("Provides advanced synthesis image support for crafting.")
        elif "synthesisImageSupport" in source:
            add("Provides synthesis image support for crafting.")
        if re.search(r"player:setPos\(|xi\.teleport\.", source):
            add("Travel interaction: can move the player after its conditions are met.")
        if "entity.onTrade" in source and not any('trade' in a.lower() for a in activities):
            add("Accepts an item trade; check the related quest or service before trading.")
        if not activities and "pathNodes" in source:
            add("Moves along a set route in this area.")
        if not activities and "entity.onTrigger" in source:
            add("Speak to this NPC for dialogue or a conditional scene.")

    for path in sorted(args.scripts.glob("*/DefaultActions.lua")):
        for script_name, action in re.findall(r"\['([^']+)'\]\s*=\s*\{([^}]+)\}", path.read_text(encoding="utf-8", errors="replace")):
            candidates = names_by_key.get(re.sub(r"[^a-z0-9]", "", script_name.lower()), [])
            if len(candidates) != 1:
                continue
            entry = people[candidates[0]]
            activities = entry.setdefault("activities", [])
            if "text =" in action:
                code = re.search(r"text\s*=\s*ID\.text\.([A-Z0-9_]+)", action)
                description = "Dialogue: " + code.group(1).replace("_", " ").capitalize() + "." if code else "Speak to this NPC for dialogue."
            elif "event =" in action:
                description = "Speak to this NPC for local dialogue or a scene."
            elif "messageSpecial =" in action or "messageName =" in action:
                description = "Examine this world object for an area message."
            else:
                continue
            if not activities:
                activities.append(description)

if args.story_scripts:
    guide_by_title = {re.sub(r"[^a-z0-9]", "", guide["title"].lower()): guide for guide in guides}
    for kind in ("quests", "missions"):
        for path in sorted((args.story_scripts / kind).rglob("*.lua")):
            source = path.read_text(encoding="utf-8", errors="replace")
            title = path.stem.replace("_", " ")
            if not re.search(r"(?:Quest:new|Mission:new|xi\.quest|xi\.mission)", source):
                continue
            for name in set(re.findall(r"\[\s*['\"]([^'\"]+)['\"]\s*\]\s*=\s*\{", source)):
                name = name.replace("_", " ")
                if name not in people:
                    continue
                entry = people[name]
                label = ("Quest: " if kind == "quests" else "Mission: ") + title
                connections = entry.setdefault("connections", [])
                if label not in connections:
                    connections.append(label)
                guide = guide_by_title.get(re.sub(r"[^a-z0-9]", "", title.lower()))
                if guide and not any(q["url"] == guide["url"] for q in entry["quests"]):
                    entry["quests"].append({"title": guide["title"], "url": guide["url"], "requirements": "", "role": "Server " + ("quest" if kind == "quests" else "mission") + " connection", "interactions": []})

if "Ranpi-Monpi" in people:
    people["Ranpi-Monpi"]["notes"] = [
        "Apple Vinegar is mentioned in the A Crisis in the Making scene: it spoiled the Yagudo offering. Next, go to Giddeus, retrieve the Off offering key item from the altar on the lower level at G-6, and return to Ranpi-Monpi. The quest does not ask you to trade a bottle of Apple Vinegar.",
        "The Dawn of Delectability involves a different Ranpi-Monpi in past Windurst Waters (S); its walkthrough is not yet in this Compendium."
    ]

out = [{"name": name, **data} for name, data in sorted(people.items())]
(ROOT / "npcs").mkdir(exist_ok=True)
(ROOT / "npcs" / "quest-index.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Indexed {len(out)} NPC names across {len(guides)} quest guides")
