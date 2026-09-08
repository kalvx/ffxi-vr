#!/usr/bin/env python3
"""Enrich Current Reality game-data.json with server-matched item locations."""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
from collections import defaultdict
from pathlib import Path

SHARD_SIZE = 256


def load_builder(path: Path):
    spec = importlib.util.spec_from_file_location("compendium_builder", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def clean_name(value):
    return str(value or "").replace("_", " ").title().replace(" Ii", " II").replace(" Iii", " III")


def item_constant(name):
    return re.sub(r"[^A-Z0-9]+", "_", str(name).upper()).strip("_")


def parse_sql(builder, sql_dir: Path, table: str, variables=None):
    text = (sql_dir / f"{table}.sql").read_text(encoding="utf-8-sig", errors="replace")
    if variables:
        text = re.sub(r"@[A-Z0-9_]+", lambda m: str(variables.get(m.group()[1:], 0)), text)
    return builder.table_records(text, table)


def ah_variables(item_text):
    values = {}
    paths = {}
    for name, value, comment in re.findall(r"SET\s+@([A-Z0-9_]+)\s*=\s*(\d+)\s*;\s*(?:--\s*(.*))?", item_text):
        values[name] = int(value)
        path = (comment or "").strip()
        paths[int(value)] = [part.strip().replace("&", " & ") for part in path.split("->") if part.strip()]
    paths[0] = ["Not sold through the Auction House"]
    paths[255] = ["Auction House category requires verification"]
    return values, paths


def sql_variables(text):
    return {name: int(value) for name, value in re.findall(r"SET\s+@([A-Z0-9_]+)\s*=\s*(\d+)\s*;", text)}


def npc_positions(builder, sql_dir, zones):
    records = defaultdict(list)
    for npc in parse_sql(builder, sql_dir, "npc_list"):
        npc_id = int(npc["npcid"])
        zone_id = (npc_id >> 12) & 0xFF
        name = clean_name(npc.get("polutils_name") or npc.get("name"))
        records[(zone_id, item_constant(name))].append({
            "name": name,
            "zone": zones.get(zone_id, f"Zone {zone_id}"),
            "x": round(float(npc["pos_x"]), 1),
            "y": round(float(npc["pos_y"]), 1),
            "z": round(float(npc["pos_z"]), 1),
        })
    return records


def script_vendors(zone_root, name_to_id, npc_lookup, zone_ids):
    vendors = defaultdict(list)
    guild_npcs = defaultdict(list)
    pair = re.compile(r"(?:xi\.item\.([A-Z0-9_]+)|(\d{2,5}))\s*,\s*(\d+)")
    guild = re.compile(r"(?:sendGuild|openGuildShop)\s*\(\s*(?:player\s*,\s*)?(\d+)")
    for path in zone_root.glob("*/npcs/*.lua"):
        text = path.read_text(encoding="utf-8", errors="replace")
        if "shop" not in text and "sendGuild" not in text:
            continue
        zone_key = path.parents[1].name
        zone_id = zone_ids.get(zone_key)
        npc_key = item_constant(path.stem)
        npc = (npc_lookup.get((zone_id, npc_key)) or [{"name": clean_name(path.stem), "zone": clean_name(zone_key)}])[0]
        for match in guild.finditer(text):
            guild_npcs[int(match.group(1))].append(npc)
        if "xi.shop.general" not in text:
            continue
        for constant, numeric, price in pair.findall(text):
            iid = name_to_id.get(constant) if constant else int(numeric)
            if iid:
                entry = dict(npc)
                entry["price"] = int(price)
                if entry not in vendors[iid]:
                    vendors[iid].append(entry)
    return vendors, guild_npcs


def quest_references(quest_root, name_to_id):
    references = defaultdict(list)
    pattern = re.compile(r"xi\.item\.([A-Z0-9_]+)")
    for path in quest_root.rglob("*.lua"):
        text = path.read_text(encoding="utf-8", errors="replace")
        quest = clean_name(path.stem)
        area = clean_name(path.parent.name)
        for constant in pattern.findall(text):
            iid = name_to_id.get(constant)
            source = {"quest": quest, "area": area}
            if iid and source not in references[iid]:
                references[iid].append(source)
    return references


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("game_data")
    parser.add_argument("source_root")
    parser.add_argument("output")
    parser.add_argument("--builder", default="tools/build_compendium_data.py")
    parser.add_argument("--shard-dir")
    parser.add_argument("--index")
    args = parser.parse_args()
    game_path = Path(args.game_data)
    root = Path(args.source_root)
    sql_dir = root / "sql"
    builder = load_builder(Path(args.builder))
    data = json.loads(game_path.read_text(encoding="utf-8"))

    item_text = (sql_dir / "item_basic.sql").read_text(encoding="utf-8-sig", errors="replace")
    variables, ah_paths = ah_variables(item_text)
    basics = parse_sql(builder, sql_dir, "item_basic", variables)
    basic_by_id = {int(x["itemid"]): x for x in basics}
    name_to_id = {item_constant(x["name"]): int(x["itemid"]) for x in basics}
    name_to_id.update({
        "CHOCOBO_EGG_FAINTLY_WARM": 2312,
        "CHOCOBO_EGG_SLIGHTLY_WARM": 2314,
        "CHOCOBO_EGG_A_BIT_WARM": 2317,
        "CHOCOBO_EGG_A_LITTLE_WARM": 2318,
        "CHOCOBO_EGG_SOMEWHAT_WARM": 2319,
    })
    zones = {int(x["zoneid"]): clean_name(x["name"]) for x in parse_sql(builder, sql_dir, "zone_settings")}
    zone_ids = {str(x["name"]): int(x["zoneid"]) for x in parse_sql(builder, sql_dir, "zone_settings")}
    npc_lookup = npc_positions(builder, sql_dir, zones)
    vendors, guild_npcs = script_vendors(root / "zones", name_to_id, npc_lookup, zone_ids)

    for shop in parse_sql(builder, sql_dir, "guild_shops"):
        iid, gid = int(shop["itemid"]), int(shop["guildid"])
        for npc in guild_npcs.get(gid, []):
            entry = dict(npc)
            entry.update({"priceMin": int(shop["min_price"]), "priceMax": int(shop["max_price"]), "guild": gid})
            if entry not in vendors[iid]:
                vendors[iid].append(entry)

    drop_rows = defaultdict(list)
    drop_text = (sql_dir / "mob_droplist.sql").read_text(encoding="utf-8-sig", errors="replace")
    for row in parse_sql(builder, sql_dir, "mob_droplist", sql_variables(drop_text)):
        drop_rows[int(row["dropId"])].append(row)
    drops = defaultdict(list)
    for group in parse_sql(builder, sql_dir, "mob_groups"):
        drop_id = int(group["dropid"])
        if not drop_id:
            continue
        zone = zones.get(int(group["zoneid"]), f"Zone {group['zoneid']}")
        mob = clean_name(group["name"])
        for row in drop_rows.get(drop_id, []):
            iid = int(row["itemId"])
            entry = {"monster": mob, "zone": zone, "rate": round(int(row["itemRate"]) / 10, 1), "levelMin": int(group["minLevel"]), "levelMax": int(group["maxLevel"])}
            key = (entry["monster"], entry["zone"], entry["rate"])
            if all((x["monster"], x["zone"], x["rate"]) != key for x in drops[iid]):
                drops[iid].append(entry)

    quest_items = quest_references(root / "quests", name_to_id)
    made_by = defaultdict(list)
    used_in = defaultdict(list)
    for recipe in data.get("recipes", []):
        made_by[int(recipe["result"]["id"])].append(int(recipe["id"]))
        for ingredient in recipe.get("ingredients", []):
            used_in[int(ingredient["id"])].append(int(recipe["id"]))

    for item in data["items"]:
        iid = int(item["id"])
        basic = basic_by_id.get(iid, {})
        ah_id = int(basic.get("aH", 0))
        item["flags"] = int(basic.get("flags", 0))
        item["noSale"] = bool(int(basic.get("NoSale", 0)))
        item["ah"] = {"id": ah_id, "listed": ah_id not in (0, 255), "path": ah_paths.get(ah_id, [f"Auction House category {ah_id}"])}
        item["sources"] = {
            "vendors": vendors.get(iid, []),
            "drops": sorted(drops.get(iid, []), key=lambda x: (x["zone"], x["monster"])),
            "quests": quest_items.get(iid, []),
            "craftedBy": made_by.get(iid, []),
            "usedIn": used_in.get(iid, []),
        }

    data["meta"]["itemSources"] = {
        "auctionPaths": sum(1 for x in data["items"] if x["ah"]["listed"]),
        "vendorItems": sum(1 for x in data["items"] if x["sources"]["vendors"]),
        "dropItems": sum(1 for x in data["items"] if x["sources"]["drops"]),
        "questItems": sum(1 for x in data["items"] if x["sources"]["quests"]),
        "craftedItems": sum(1 for x in data["items"] if x["sources"]["craftedBy"]),
    }
    Path(args.output).write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    if args.shard_dir:
        shard_dir = Path(args.shard_dir)
        shard_dir.mkdir(parents=True, exist_ok=True)
        for stale in shard_dir.glob("*.json"):
            stale.unlink()
        shards = defaultdict(dict)
        for item in data["items"]:
            shards[item["id"] // SHARD_SIZE][str(item["id"])] = {
                "item": {
                    key: item[key]
                    for key in ("id", "name", "kind", "stack", "sell", "equip", "weapon", "usable")
                    if key in item
                },
                "ah": item["ah"], "sources": item["sources"],
                "flags": item["flags"], "noSale": item["noSale"],
            }
        for shard, records in shards.items():
            (shard_dir / f"{shard}.json").write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        (shard_dir / "meta.json").write_text(json.dumps(data["meta"]["itemSources"], separators=(",", ":")), encoding="utf-8")
    if args.index:
        index = {
            str(item["id"]): {
                "group": item["ah"]["path"][0] if item["ah"]["listed"] else item.get("kind", "Item"),
                "type": item["ah"]["path"][-1] if item["ah"]["listed"] else item.get("kind", "Item"),
            }
            for item in data["items"]
        }
        Path(args.index).write_text(json.dumps(index, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(json.dumps(data["meta"]["itemSources"], indent=2))


if __name__ == "__main__":
    main()
