"""Build public region/transport labels from a matching server tree and zone edges.

Usage: python tools/build-route-travel-data.py SERVER_ROOT ZONE_EDGES_JSON MAP_INI
ZONE_EDGES_JSON contains only distinct [fromzone,tozone] pairs, never player data.
"""
from collections import deque
from pathlib import Path
import json
import re
import subprocess
import sys
import unicodedata

SITE = Path(__file__).resolve().parents[1]
SERVER, EDGES, MAP_INI = map(Path, sys.argv[1:4])
zone_header = (SERVER / 'LSB_a89969976e_build/src/map/zone.h').read_text()
zone_source = (SERVER / 'LSB_a89969976e_build/src/map/utils/zoneutils.cpp').read_text()
ids = {key: int(value) for key, value in re.findall(r'\b(ZONE_\w+)\s*=\s*(\d+)', zone_header)}
by_id = {value: key for key, value in ids.items()}
region_map = {}
block = zone_source.split('REGION_TYPE GetCurrentRegion', 1)[1].split('CONTINENT_TYPE GetCurrentContinent', 1)[0]
for match in re.finditer(r'((?:\s*case ZONE_\w+:)+)\s*return REGION_TYPE::(\w+);', block):
    for key in re.findall(r'case (ZONE_\w+):', match[1]):
        region_map[ids[key]] = match[2]

labels = dict(RONFAURE='Ronfaure', ZULKHEIM='Zulkheim', NORVALLEN='Norvallen',
    GUSTABERG='Gustaberg', DERFLAND='Derfland', SARUTABARUTA='Sarutabaruta',
    KOLSHUSHU='Kolshushu', ARAGONEU='Aragoneu', FAUREGANDI='Fauregandi',
    VALDEAUNIA='Valdeaunia', QUFIMISLAND='Qufim', LITELOR="Li’Telor", KUZOTZ='Kuzotz',
    VOLLBOW='Vollbow', ELSHIMOLOWLANDS='Elshimo Lowlands', ELSHIMOUPLANDS='Elshimo Uplands',
    TULIA='Tu’Lia', MOVALPOLOS='Movalpolos', TAVNAZIA='Tavnazian Archipelago',
    TAVNAZIAN_MARQ='Tavnazian Marquisate', SANDORIA='San d’Oria', BASTOK='Bastok',
    WINDURST='Windurst', JEUNO='Jeuno', DYNAMIS='Dynamis', PROMYVION='Promyvion',
    LUMORIA='Lumoria', LIMBUS='Limbus', WEST_AHT_URHGAN='West Aht Urhgan',
    MAMOOL_JA_SAVAGE='Mamool Ja Savagelands', HALVUNG='Halvung Territory',
    ARRAPAGO='Arrapago Islands', ALZADAAL='Ruins of Alzadaal',
    RONFAURE_FRONT='The Ronfaure Front', NORVALLEN_FRONT='The Norvallen Front',
    GUSTABERG_FRONT='The Gustaberg Front', DERFLAND_FRONT='The Derfland Front',
    SARUTA_FRONT='The Sarutabaruta Front', ARAGONEAU_FRONT='The Aragoneu Front',
    FAUREGANDI_FRONT='The Fauregandi Front', VALDEAUNIA_FRONT='The Valdeaunia Front',
    THE_THRESHOLD='The Threshold', ADOULIN_ISLANDS='Adoulin Islands', EAST_ULBUKA='East Ulbuka Territory')

# Newer areas absent from the old server region switch use the installed atlas.
atlas_regions = {}
region = None
for line in MAP_INI.read_text(encoding='utf-8-sig').splitlines():
    if re.match(r';\s*No Region:', line):
        region = None
    match = re.match(r';\s*Region 0x[0-9A-Fa-f]+/\d+:.*? / (.*?)(?: /|$)', line)
    if match:
        region = match[1].strip().replace("Ra'Kaznarr", 'Ra’Kaznar').replace('The Adoulin Islands', 'Adoulin Islands')
    match = re.match(r';\s*Area 0x[0-9A-Fa-f]+/(\d+):', line)
    if match:
        atlas_regions[int(match[1])] = region

script = """const fs=require('fs'),vm=require('vm'),c={window:{}};
for(const f of ['zone-routes-data.js','map-index.js','zone-connections-data.js'])vm.runInNewContext(fs.readFileSync('travel/'+f,'utf8'),c);
console.log(JSON.stringify({rows:c.window.CR_WORLD_ROUTES.flatMap(g=>g.regions.flatMap(r=>r.zones.map(zone=>({zone,expansion:g.id,id:c.window.CR_ZONE_MAPS[zone].zoneId})))),exits:c.window.CR_ZONE_EXITS}));"""
directory = json.loads(subprocess.check_output(['node', '-e', script], cwd=SITE, encoding='utf-8'))
rows = directory['rows']
names = {row['id']: row['zone'] for row in rows}
names.update({104: 'Jugner Forest', 126: 'Qufim Island'})

def domain(zone_id):
    if zone_id == 14: # Hall of Transference has disconnected halls for three crags.
        return 'portal_halls'
    key = region_map.get(zone_id, '')
    if key.endswith('_FRONT') or key == 'THE_THRESHOLD':
        return 'past'
    if 50 <= zone_id <= 79 or zone_id in (48, 49):
        return 'ahturhgan'
    if zone_id >= 256:
        return 'adoulin'
    if key in ('DYNAMIS', 'ABDHALJS', 'ABYSSEA'):
        return 'other'
    if re.search(r'AIRSHIP|SHIP_|_SHIP|FERRY|MANACLIPPER|PHANAUET_CHANNEL|CHOCOBO_CIRCUIT', by_id.get(zone_id, '')):
        return 'transport'
    return 'middlelands'

def normalize(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value).lower())

lookup = {normalize(key.removeprefix('ZONE_')): value for key, value in ids.items()}
lookup.update({normalize(row['zone']): row['id'] for row in rows})
lookup[normalize('Purgonorgo Isle')] = 4
connections = {tuple(pair) for pair in json.loads(EDGES.read_text())}
for source, exits in directory['exits'].items():
    start = lookup.get(normalize(source))
    for raw in exits:
        target = re.split(r'\s+(?=(?:Map\d+:\s*)?\[)', raw)[0].strip()
        end = lookup.get(normalize(target))
        if start is not None and end is not None:
            connections.add((start, end))
# The three Promyvion entrances go through separate halls inside zone 14;
# collapse each own entrance, rather than invent a cross-crag shortcut.
connections.update({(102, 16), (108, 18), (117, 20), (9, 22), (158, 179),
    (102, 33), (108, 33), (117, 33)}) # Mission-gated entrances / Dimensional Portals.
graph = {}
for start, end in connections:
    if domain(start) == domain(end) == 'middlelands':
        graph.setdefault(start, set()).add(end)

# Directed BFS from each arrival point: no reverse-only exits or ship/past links.
def reachable(start):
    result, queue = {start: 0}, deque([start])
    while queue:
        current = queue.popleft()
        for end in graph.get(current, ()):
            if end not in result:
                result[end] = result[current] + 1
                queue.append(end)
    return result

crystals = [dict(name=name, zoneId=zone_id, zone=names[zone_id]) for name, zone_id in
    [('Holla', 102), ('Dem', 108), ('Mea', 117), ('Altep', 114), ('Yhoat', 124), ('Vahzl', 112)]]
crystal_paths = {entry['name']: reachable(entry['zoneId']) for entry in crystals}
teleports = (SERVER / 'VR_recovery_test/scripts/globals/teleports.lua').read_text(encoding='utf-8-sig')
outpost_block = teleports.split('local outpostDestinations =', 1)[1].split('xi.teleport.toOutpost', 1)[0]
outposts = {}
for key, values in re.findall(r'\[xi\.region\.(\w+)\]\s*=\s*\{([^}]+)\}', outpost_block):
    zone_id = int(values.split(',')[-1].strip())
    canonical = 'TAVNAZIA' if key == 'TAVNAZIANARCH' else key
    outposts[canonical] = dict(region=labels[canonical], zoneId=zone_id, zone=names[zone_id])

output = {}
for row in rows:
    zone_id = row['id']
    key = region_map.get(zone_id)
    region = labels.get(key) or atlas_regions.get(zone_id)
    # Purgonorgo is an island within Bibiki Bay; its legacy map alias uses the
    # Abdhaljs arena map ID. Do not label the island as the arena's region.
    if row['zone'] == 'Purgonorgo Isle':
        key, region, zone_id = 'KOLSHUSHU', 'Kolshushu', 4
    assert region, f'Missing region: {row}'
    item = dict(zoneId=row['id'], region=region, outpost=None, crystals=[])
    if key in outposts:
        item['outpost'] = outposts[key]
    elif key in ('SANDORIA', 'BASTOK', 'WINDURST', 'TAVNAZIAN_MARQ'):
        item['outpost'] = outposts[dict(SANDORIA='RONFAURE', BASTOK='GUSTABERG', WINDURST='SARUTABARUTA', TAVNAZIAN_MARQ='TAVNAZIA')[key]]
        item['outpostNearby'] = True
    approaches = [(crystal_paths[c['name']][zone_id], c) for c in crystals if zone_id in crystal_paths[c['name']]]
    if row['zone'] == 'Phanauet Channel':
        approaches = [(crystal_paths[c['name']][2], c) for c in crystals if 2 in crystal_paths[c['name']]]
        item['approachNote'] = 'Board the ferry at Carpenters’ Landing.'
    if region in ('Promyvion', 'Lumoria', 'Limbus') or row['zone'] == 'Stellar Fulcrum':
        item['approachNote'] = 'Mission and entry requirements apply; crystal travel does not bypass them.'
    if approaches:
        minimum = min(hops for hops, _ in approaches)
        item['crystals'] = [dict(c, hops=hops) for hops, c in approaches if hops == minimum]
    else:
        item['crystalNote'] = ('No classic crystal in the past — use Recall, a maw or Campaign travel.' if row['expansion'] == 'wotg' else
            'No direct classic-crystal approach — use a runic portal, home point or ferry.' if row['expansion'] == 'ahturhgan' else
            'No classic crystal in Ulbuka — use a waypoint or home point.' if row['expansion'] == 'adoulin' else
            'No direct crystal route — follow the area’s access route.')
    output[row['zone']] = item

target = SITE / 'travel/zone-travel-data.js'
target.write_text('// Region labels: server region switch + installed atlas. Crystal approach: fewest directed land-zone connections.\n'
    '// Transport, time travel and expansion-access requirements are not implied to be unlocked.\n'
    'window.CR_ZONE_TRAVEL = ' + json.dumps(output, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'Built region/outpost/crystal metadata for all {len(output)} areas.')
