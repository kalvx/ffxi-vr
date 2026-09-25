#!/usr/bin/env python3
"""Add server-backed equipment, food, and usable effects to item reference data."""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

SHARD_SIZE = 256

DISPLAY_NAMES = {
    "def": "DEF", "hp": "HP", "hpp": "HP", "mp": "MP", "mpp": "MP",
    "str": "STR", "dex": "DEX", "vit": "VIT", "agi": "AGI", "int": "INT",
    "mnd": "MND", "chr": "CHR", "att": "Attack", "ratt": "Ranged Attack",
    "acc": "Accuracy", "racc": "Ranged Accuracy", "eva": "Evasion",
    "macc": "Magic Accuracy", "meva": "Magic Evasion", "matt": "Magic Attack Bonus",
    "mdef": "Magic Defense Bonus", "haste_gear": "Haste", "storetp": "Store TP",
    "subtle_blow": "Subtle Blow", "double_attack": "Double Attack",
    "triple_attack": "Triple Attack", "quad_attack": "Quadruple Attack",
    "crit_hit_rate": "Critical hit rate", "crit_dmg_increase": "Critical damage",
    "refresh": "Refresh", "regen": "Regen", "regain": "Regain",
    "enmity": "Enmity", "fastcast": "Fast Cast", "conserve_mp": "Conserve MP",
    "magic_damage": "Magic Damage", "dmg": "Damage taken", "dmgphys": "Physical damage taken",
    "dmgphys_ii": "Physical damage taken II", "dmgmagic": "Magic damage taken",
    "dmgmagic_ii": "Magic damage taken II", "dmgbreath": "Breath damage taken",
    "dmgrange": "Ranged damage taken",
    "food_hp": "HP", "food_mp": "MP", "food_hpp": "HP", "food_mpp": "MP",
    "food_attp": "Attack", "food_rattp": "Ranged Attack", "food_accp": "Accuracy",
    "food_raccp": "Ranged Accuracy", "food_defp": "Defense", "food_eva": "Evasion",
    "food_maccp": "Magic Accuracy", "food_matp": "Magic Attack Bonus",
    "hpheal": "HP recovered while healing", "mpheal": "MP recovered while healing",
}

PERCENT_MODS = {
    "hpp", "mpp", "haste_gear", "double_attack", "triple_attack", "quad_attack",
    "crit_hit_rate", "crit_dmg_increase", "dmg", "dmgphys", "dmgphys_ii", "dmgmagic",
    "dmgmagic_ii", "dmgbreath", "dmgrange",
    "food_hpp", "food_mpp", "food_attp", "food_rattp", "food_accp", "food_raccp",
    "food_defp", "food_maccp", "food_matp",
}

CAP_NAMES = {
    "food_hp_cap": "HP cap", "food_mp_cap": "MP cap", "food_att_cap": "Attack cap",
    "food_ratt_cap": "Ranged Attack cap", "food_acc_cap": "Accuracy cap",
    "food_racc_cap": "Ranged Accuracy cap", "food_def_cap": "Defense cap",
    "food_macc_cap": "Magic Accuracy cap", "food_mat_cap": "Magic Attack Bonus cap",
}


def enum_names(path: Path):
    names = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = re.match(r"^\s{2}([a-z][a-z0-9_]*):\s+(-?\d+)\b", line)
        if match:
            names[int(match.group(2))] = match.group(1)
    return names


def pretty_name(name: str):
    if name in DISPLAY_NAMES:
        return DISPLAY_NAMES[name]
    if name in CAP_NAMES:
        return CAP_NAMES[name]
    return name.replace("_", " ").title().replace(" Tp", " TP").replace(" Hp", " HP").replace(" Mp", " MP")


def modifier_entry(name: str, value: int):
    if name == "haste_gear":
        value = value / 100
    return {
        "name": pretty_name(name),
        "value": value,
        "percent": name in PERCENT_MODS,
        "cap": name in CAP_NAMES,
        "code": name.upper(),
    }


def parse_item_mods(path: Path, names):
    grouped = defaultdict(list)
    pattern = re.compile(r"INSERT INTO `item_mods` VALUES \((\d+),(\d+),(-?\d+)\)")
    for iid, mid, value in pattern.findall(path.read_text(encoding="utf-8", errors="replace")):
        mod_name = names.get(int(mid), f"modifier_{mid}")
        grouped[int(iid)].append(modifier_entry(mod_name, int(value)))
    return grouped


def item_source_names(path: Path):
    pattern = re.compile(r"INSERT INTO `item_basic` VALUES \((\d+),\d+,'([^']+)'", re.M)
    return {int(iid): name for iid, name in pattern.findall(path.read_text(encoding="utf-8", errors="replace"))}


def parse_item_scripts(root: Path, items, enum_by_code, source_names):
    effects = {}
    numeric = r"(-?\d+(?:\.\d+)?)"
    for item in items:
        source_name = source_names.get(int(item["id"]))
        if not source_name:
            continue
        path = root / "scripts" / "items" / f"{source_name}.lua"
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        is_food = "xi.effect.FOOD" in text and "effect:addMod" in text
        rows = []
        for code, value in re.findall(rf"effect:addMod\(xi\.mod\.([A-Z0-9_]+),\s*{numeric}\s*\)", text):
            rows.append(modifier_entry(enum_by_code.get(code, code.lower()), int(float(value))))
        use = []
        for code, power, duration in re.findall(rf"target:addStatusEffect\(xi\.effect\.([A-Z0-9_]+),\s*\{{[^}}]*?power\s*=\s*{numeric}[^}}]*?duration\s*=\s*{numeric}", text, re.S):
            use.append({"effect": code.replace("_", " ").title(), "power": int(float(power)), "duration": int(float(duration))})
        duration_match = re.search(r"xi\.effect\.FOOD,\s*\{[^}]*duration\s*=\s*(\d+)", text, re.S)
        if rows or use or duration_match:
            effects[item["id"]] = {
                "food": is_food,
                "duration": int(duration_match.group(1)) if duration_match else None,
                "modifiers": rows,
                "use": use,
            }
    return effects


def write_shards(data, shard_dir: Path, all_effects):
    shards = defaultdict(dict)
    for item in data["items"]:
        iid = int(item["id"])
        path = shard_dir / f"{iid // SHARD_SIZE}.json"
        if not shards[iid // SHARD_SIZE] and path.exists():
            shards[iid // SHARD_SIZE] = json.loads(path.read_text(encoding="utf-8"))
        record = shards[iid // SHARD_SIZE].get(str(iid))
        if record is not None:
            if all_effects.get(iid):
                record["item"]["effects"] = all_effects[iid]
            else:
                record["item"].pop("effects", None)
    for shard, records in shards.items():
        (shard_dir / f"{shard}.json").write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("game_data")
    parser.add_argument("source_root")
    parser.add_argument("--shard-dir", required=True)
    args = parser.parse_args()
    game_path, source_root = Path(args.game_data), Path(args.source_root)
    data = json.loads(game_path.read_text(encoding="utf-8"))
    names = enum_names(source_root / "data" / "enums" / "mod.yaml")
    enum_by_code = {name.upper(): name for name in names.values()}
    equipment = parse_item_mods(source_root / "sql" / "item_mods.sql", names)
    source_names = item_source_names(source_root / "sql" / "item_basic.sql")
    scripts = parse_item_scripts(source_root, data["items"], enum_by_code, source_names)
    all_effects = {}
    for item in data["items"]:
        iid = int(item["id"])
        effect = scripts.get(iid, {})
        modifiers = equipment.get(iid, [])
        if modifiers or effect:
            all_effects[iid] = {
                "food": bool(effect.get("food")),
                "duration": effect.get("duration"),
                "modifiers": effect.get("modifiers") or modifiers,
                "use": effect.get("use", []),
            }
        item.pop("effects", None)
    data.setdefault("meta", {}).pop("itemEffects", None)
    game_path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    write_shards(data, Path(args.shard_dir), all_effects)
    print(json.dumps({"itemsWithEffects": len(all_effects)}, indent=2))


if __name__ == "__main__":
    main()
