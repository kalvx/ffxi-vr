#!/usr/bin/env python3
"""Refresh only monster sources from a read-only gameplay export and active scripts.

Never runs the historical all-source importer or writes to the game database.
The export schema/command is documented in docs/ItemSourceAudit in the H workspace.
"""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re


def title(name):
    return str(name or '').replace('_', ' ').title().replace(' Ii', ' II').replace(' Iii', ' III')


def table_rates(rows):
    """Base chances per roll, including the group's success roll and item weight."""
    groups = defaultdict(list)
    for row in rows:
        if row['dropType'] == 1:
            groups[row['groupId']].append(row)
    for row in rows:
        if row['dropType'] == 1:
            total = sum(x['itemRate'] for x in groups[row['groupId']])
            chance = row['groupRate'] / 10 * row['itemRate'] / total if total else 0
        else:
            chance = row['itemRate'] / 10
        if chance > 0:
            yield row, round(chance, 4)


def build(snapshot, runtime):
    zones = {x['zoneid']: x for x in snapshot['zones']}
    scripts = {(path.parents[1].name, path.stem): path.read_text(encoding='utf-8-sig')
               for path in (runtime / 'scripts/zones').glob('*/mobs/*.lua')}
    reviewed_loot_scripts = {('Lufaise_Meadows', 'Padfoot'), ('Apollyon', 'Gunpod'), ('Arrapago_Remnants', 'Vile_Wahzil')}
    for key, text in scripts.items():
        if re.search(r'\b(?:loot:add(?:Item|Group)|player:addTreasure)\(', text) and key not in reviewed_loot_scripts:
            raise ValueError(f'Unreviewed scripted monster loot: {key}. Add its conditions before refreshing the index.')
    script_mods = {}
    for key, text in scripts.items():
        for callback in re.finditer(r'entity\.onMob(?:Initialize|Spawn)\s*=\s*function\(mob\)([\s\S]*?)^end\b', text, re.M):
            body = re.sub(r'--[^\n]*', '', callback[1])
            # Only straight-line initialization, never state-dependent callbacks.
            if not re.search(r'\b(if|for|while|function)\b', body):
                for name, value in re.findall(r'mob:setMobMod\(xi\.mobMod\.(NO_DROPS|EXP_BONUS),\s*(-?\d+)\)', body):
                    all_values = set(re.findall(r'mob:setMobMod\(xi\.mobMod\.' + name + r',\s*(-?\d+)\)', text))
                    if len(all_values) == 1:
                        script_mods[(key, 38 if name == 'NO_DROPS' else 28)] = int(value)
    mods = {}
    for kind, key in [('familyMods', 'familyid'), ('poolMods', 'poolid'), ('spawnMods', 'mobid')]:
        mods[kind] = {(x[key], x['modid']): x['value'] for x in snapshot[kind]}

    def mobmod(m, mod):
        value = 0
        for kind, key in [('familyMods', 'familyid'), ('poolMods', 'poolid'), ('spawnMods', 'mobid')]:
            value = mods[kind].get((m[key], mod), value)
        return script_mods.get(((zones[m['zoneid']]['name'], m['mobname']), mod), value)

    def entry(m):
        return dict(monster=(m['polutils_name'] or title(m['mobname'])),
                    zone=title(zones[m['zoneid']]['name']), zoneId=m['zoneid'],
                    levelMin=m['minLevel'], levelMax=m['maxLevel'])

    tables = defaultdict(list)
    for row in snapshot['drops']:
        tables[row['dropId']].append(row)
    rated = {did: list(table_rates(rows)) for did, rows in tables.items()}
    drops, seen, shared = defaultdict(list), defaultdict(set), {}

    def add(iid, row):
        key = json.dumps(row, sort_keys=True)
        if key not in seen[iid]:
            seen[iid].add(key)
            drops[iid].append(row)

    spawned = {(m['zoneid'], m['groupid']) for m in snapshot['monsters']}
    unplaced = [dict(m, mobid=0, polutils_name='', spawnRecorded=False) for m in snapshot['groups']
                if (m['zoneid'], m['groupid']) not in spawned]
    for m in snapshot['monsters'] + unplaced:
        if not mobmod(m, 38):
            for row, rate in rated.get(m['dropid'], []):
                result = entry(m)
                result.update(rate=rate, rateLabel='Base chance per loot roll', source='table')
                if row['dropType'] in (2, 4):
                    result['note'] = ('Also recorded in the monster’s ' + ('Steal' if row['dropType'] == 2 else 'Despoil') + ' table.')
                if not m.get('spawnRecorded', True):
                    result['note'] = 'Loot table recorded for this monster; its spawn availability is not recorded in the current server data.'
                add(row['itemId'], result)
        if (m.get('spawnRecorded', True) and not mobmod(m, 38) and mobmod(m, 28) > -100 and not m['mobType'] & 16
                and not zones[m['zoneid']]['zonetype'] & 128 and m['maxLevel'] > 0):
            result = entry(m)
            result['element'] = int(m['Element'] or 0)
            shared[json.dumps(result, sort_keys=True)] = result

    # These listeners and the socket reward are separate from SQL droplists.
    constants = {name: int(iid) for name, iid in re.findall(r'^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*,',
                 (runtime / 'scripts/enum/item.lua').read_text(encoding='utf-8-sig'), re.M)}

    def script_drop(zone, mob, iid, note, direct_reward=False):
        for m in snapshot['monsters']:
            if (zones[m['zoneid']]['name'] == zone and m['mobname'] == mob
                    and (direct_reward or not mobmod(m, 38))):
                result = entry(m)
                result.update(source='script', note=note)
                add(iid, result)

    for const, note in {
        'ASSAILANTS_RING': 'Real Padfoot only: one of its two weighted ring/earring rewards.',
        'ASTRAL_EARRING': 'Real Padfoot only: one of its two weighted ring/earring rewards.',
        'SHEEPSKIN': 'Impostor Padfoot only; a separate sheepskin roll.',
        'LANOLIN_CUBE': 'Impostor Padfoot only; its guaranteed lanolin reward.',
    }.items():
        script_drop('Lufaise_Meadows', 'Padfoot', constants[const], note)
    gunpod = (runtime / 'scripts/zones/Apollyon/mobs/Gunpod.lua').read_text(encoding='utf-8')
    for const in set(re.findall(r'xi\.item\.([A-Z0-9_]+)', gunpod)):
        script_drop('Apollyon', 'Gunpod', constants[const],
                    'Gunpod randomly selects a chip, crafting-material, AF-upgrade-material or Ancient Beastcoin reward group. Only the selected group is awarded.')
    for family, const, note in [
        ('marid', 'MARID_TUSK', 'Critical hits can break tusks (20% per critical hit, up to two). Each broken tusk adds a tusk to the loot.'),
        ('orobon', 'OROBON_LURE', 'Critical hits can break the eyestalks (10% per critical hit). A lure is added only when the eyestalks have broken.'),
    ]:
        for (zone, mob), text in scripts.items():
            if f"scripts/mixins/families/{family}" in text:
                script_drop(zone, mob, constants[const], note)
    socket = (runtime / 'scripts/zones/Arrapago_Remnants/npcs/Socket.lua').read_text(encoding='utf-8')
    first = int(re.search(r'local incusCell\s*=\s*(\d+)', socket)[1])
    last = int(re.search(r'local spissatusCell\s*=\s*(\d+)', socket)[1])
    for iid in range(first, last + 1):
        script_drop('Arrapago_Remnants', 'Vile_Wahzil', iid,
                    'Trade 1–5 of this cell type to the second-floor Socket to spawn Vile Wahzil. Defeating it returns twice the number of that same cell traded.', direct_reward=True)

    main = (runtime / 'settings/main.lua').read_text(encoding='utf-8-sig')
    abyssea = re.search(r'^\s*ENABLE_ABYSSEA\s*=\s*1\s*,?', main, re.M) is not None
    rules = {}
    common = 'The monster must not check Too Weak to the highest-level participant. Battlefield monsters, Dynamis and monsters with no-loot/no-experience restrictions do not qualify.'
    for iid, minimum in [(1126, 1), (1127, 50)] + ([(2955, 70), (2956, 75)] if abyssea else []):
        rules[iid] = [dict(kind='seal', minimumLevel=minimum,
                          description=f'Shared seal drop from eligible monsters at level {minimum} or above. {common}',
                          rateNote=('20% chance for one seal/crest, then an equal choice among the types unlocked by the monster’s level. '
                                    + ('Below level 50: Beastmen’s Seal; 50–69: two types; 70–74: three types; 75+: four types. ' if abyssea else 'Below level 50: Beastmen’s Seal; 50+: two types. ')
                                    + 'The party treasure pool has a shared five-minute seal cooldown.'))]
    elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Lightning', 'Water', 'Light', 'Dark']
    for i, element in enumerate(elements):
        weather = f'{element} weather selects this element; without elemental weather, the matching Vana’diel day selects it. Weather takes priority over day.'
        rules[3297+i] = [dict(kind='geode', minimumLevel=50,
                             description=f'Eligible level-50+ monsters can drop this geode. {weather} {common}', rateNote='20% geode roll; only the selected element can drop.')]
        rules[3520+i] = [dict(kind='avatarite', minimumLevel=80,
                             description=f'Eligible level-80+ monsters can drop this avatarite. {weather} {common}', rateNote='A separate 20% roll only after the geode roll fails (16% overall when eligible).')]
        rules[4096+i] = [dict(kind='crystal', minimumLevel=1, element=i+1,
                             description=f'Shared {element.lower()} crystal drop from eligible monsters with the matching elemental affinity. {common}',
                             rateNote='20% roll for each nearby party member with the region’s appropriate Signet, Sanction, Sigil or Ionis effect. Regional control restrictions apply to Signet.')]
    sort = lambda row: (row['zone'], row['monster'], row['levelMin'], row['levelMax'], row.get('note', ''), row.get('rate', -1))
    return {iid: sorted(rows, key=sort) for iid, rows in drops.items()}, rules, sorted(shared.values(), key=sort)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('runtime', type=Path)
    parser.add_argument('--data', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/data')
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8'))
    drops, rules, monsters = build(snapshot, args.runtime)
    dump = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    changed, item_count = [], 0
    for path in sorted((args.data / 'item-sources').glob('*.json')):
        if not path.stem.isdigit():
            continue
        records = json.loads(path.read_text(encoding='utf-8'))
        before = dump(records)
        for iid, record in records.items():
            sources = record.setdefault('sources', {})
            sources['drops'] = drops.get(int(iid), [])
            if int(iid) in rules:
                sources['dropRules'] = rules[int(iid)]
            else:
                sources.pop('dropRules', None)
            item_count += bool(sources['drops'] or sources.get('dropRules'))
        if dump(records) != before:
            path.write_text(dump(records), encoding='utf-8')
            changed.append(path.name)
    meta_path = args.data / 'item-sources/meta.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    meta['dropItems'] = item_count
    meta_path.write_text(dump(meta), encoding='utf-8')
    (args.data / 'shared-monster-drops.json').write_text(dump(dict(monsters=monsters)), encoding='utf-8')
    print(json.dumps(dict(changedShards=len(changed), dropItems=item_count, sharedRuleItems=len(rules), sharedCandidates=len(monsters))))


if __name__ == '__main__':
    main()
