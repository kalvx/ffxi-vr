"""Build only atlas shards from anonymous H gameplay metadata and reviewed item sources.
Usage: python tools/build-atlas.py SNAPSHOT DIRECTORY_JSON MAPPY_MAPS
Does not change the game, item database, item source shards, or existing maps.
"""
from collections import defaultdict
from pathlib import Path
import hashlib,json,re,sys

SITE=Path(__file__).resolve().parents[1]
snapshot,directory,mappy=map(Path,sys.argv[1:4])
data=json.loads(snapshot.read_text(encoding='utf-8'));old=json.loads(directory.read_text(encoding='utf-8'))
OUT=SITE/'travel/atlas-data';OUT.mkdir(exist_ok=True)
MAP_OUT=SITE/'travel/atlas-maps'
map_files={p.stem.lower():p for p in mappy.iterdir() if p.suffix.lower() in ('.gif','.png')}
norm=lambda s:re.sub('[^a-z0-9]','',str(s).lower())
title=lambda s:str(s).replace('_',' ').title().replace(' Iii',' III').replace(' Ii',' II')
dump=lambda obj:json.dumps(obj,ensure_ascii=False,separators=(',',':'))
write=lambda path,obj:path.write_bytes((dump(obj)+'\n').encode('utf-8'))

map_names={};regions={};images=defaultdict(list);calibration=defaultdict(list);region='Other areas'
for line in (mappy/'map.ini').read_text(encoding='utf-8-sig').splitlines():
    hit=re.match(r';\s*Region 0x[0-9a-fA-F]+/\d+:.*? / (.*?)(?: /|$)',line)
    if hit:region=hit[1].strip().replace("Ra'Kaznarr",'Ra’Kaznar').replace('The Adoulin Islands','Adoulin Islands')
    if line.startswith('; No Region:'):region='Other areas'
    hit=re.match(r'([0-9a-fA-F]+)_ename=(.*)',line)
    if hit:ident=int(hit[1],16);map_names[ident]=hit[2].strip();regions[ident]=region
    hit=re.match(r'([0-9a-fA-F]+)_(\d+)=(.*)',line)
    if hit:
        ident=int(hit[1],16);source=map_files.get(f'{hit[1]}_{hit[2]}'.lower())
        if not source:continue
        filename=source.name
        images[ident].append(filename)
        calibration[ident].append([filename,*map(float,hit[3].split(','))])

zones={z['zoneid']:z for z in data['zones']}
groups=json.loads(json.dumps(old['groups']))
area_rows=[];used=set()
for group in groups:
    for section in group['regions']:
        for name in section['zones']:
            ident=old['maps'][name]['zoneId']
            if name=='Purgonorgo Isle':ident=4
            assert ident in zones,(name,ident)
            used.add(ident)
            area_rows.append(dict(name=name,zoneId=ident,expansion=group['id'],region=old['travel'][name]['region']))
# Keep the user's existing directory. Extra-area preparation is opt-in only.
excluded={0,49,131,133,189,199,210,214,219,229,275,279,286,298}
area_labels={row['name'] for row in area_rows}
for ident,z in zones.items():
    if '--include-extra' not in sys.argv[4:]:continue
    if ident in used or ident in excluded or not images[ident]:continue
    name=map_names.get(ident,title(z['name']))
    if 'Residential' in name or not name:continue
    raw=z['name']
    if name in area_labels:name+=' (Pirates)' if 'Pirates' in raw else f' (Zone {ident})'
    area_labels.add(name)
    if raw.startswith('Dynamis'):exp='dynamis';regions[ident]='Dynamis'
    elif 'Abyssea' in raw or raw=='Provenance':exp='abyssea'
    elif ident>=288 and not raw.startswith('Dynamis'):exp='rhapsodies'
    elif ident>=256:exp='adoulin'
    elif '[S]' in raw or raw.startswith('Walk_of_Echoes'):exp='wotg'
    elif 48<=ident<=79 or ident in (46,47):exp='ahturhgan'
    elif ident in (3,14,39,40,41,42,43,44):exp='promathia'
    elif ident in (205,226):exp='zilart'
    else:exp='original'
    area_rows.append(dict(name=name,zoneId=ident,expansion=exp,region=regions.get(ident,'Other areas')))
    used.add(ident)
    group=next((g for g in groups if g['id']==exp),None)
    if not group:
        group=dict(id=exp,name={'abyssea':'Abyssea','rhapsodies':"Rhapsodies of Vana’diel",'dynamis':'Dynamis'}[exp],regions=[]);groups.append(group)
    group['regions'].append(dict(name=regions.get(ident,'Other areas'),zones=[name]))

loot=defaultdict(dict);shared={};rules={};item_names={};vendors=defaultdict(list);item_revision=hashlib.sha256()
people=json.loads((SITE/'npcs/quest-index.json').read_text(encoding='utf-8'))
person_index=defaultdict(dict)
for person in people:
    for zone in person.get('zones',[]):person_index[norm(zone)][norm(person['name'])]=person
for shard in sorted((SITE/'assets/data/item-sources').glob('*.json')):
    if not shard.stem.isdigit():continue
    source_text=shard.read_text(encoding='utf-8');item_revision.update(source_text.encode('utf-8'))
    for iid,record in json.loads(source_text).items():
        iid=int(iid);item_names[iid]=record['item']['name']
        for vendor in record['sources'].get('vendors',[]):
            vendors[(norm(vendor['zone']),norm(vendor['name']))].append(dict(id=iid,name=item_names[iid],**{k:vendor[k] for k in ('priceMin','priceMax') if k in vendor}))
        if record['sources'].get('dropRules'):rules[iid]=record['sources']['dropRules'][0]
        for drop in record['sources'].get('drops',[]):
            if not drop.get('zoneId'):continue
            key=(drop['zoneId'],norm(drop['monster']))
            entry=loot[key].setdefault(iid,dict(id=iid,name=item_names[iid],methods=[]))
            method={k:drop[k] for k in ('source','rate','rateLabel','note','levelMin','levelMax') if k in drop}
            if method.get('rate',0)>100:
                method['configuredThreshold']=method['rate'];method['rate']=100
            if method not in entry['methods']:entry['methods'].append(method)
for row in json.loads((SITE/'assets/data/shared-monster-drops.json').read_text(encoding='utf-8'))['monsters']:
    shared.setdefault((row['zoneId'],norm(row['monster'])),[]).append(row)

monsters=defaultdict(list);npcs=defaultdict(list)
for m in data['monsters']:monsters[m['zoneid']].append(m)
for n in data['npcs']:npcs[(n['npcid']>>12)&4095].append(n)
hnm={'Absolute Virtue','Adamantoise','Aspidochelone','Behemoth','King Behemoth','Fafnir','Nidhogg','Roc','Simurgh','Serket','King Arthro','Capricious Cassie','Lord of Onzozo','Charybdis','Tiamat','Jormungand','Vrtra','Khimaira','Cerberus','Hydra','Sandworm','Dark Ixion'}
detect_names={1:'Sight',2:'Sound',4:'Low HP',32:'Magic',64:'Weapon skills',128:'Job abilities',256:'Scent tracking'}
spawn_names={1:'Night',2:'Evening',4:'Weather-dependent',8:'Fog-dependent',16:'Moon-dependent',32:'Lottery',64:'Windowed',128:'Scripted / conditional'}
bestiary=defaultdict(list);index={};spawn_total=0
area_names={row['zoneId']:row['name'] for row in area_rows if row['name']!='Purgonorgo Isle'}
for area in area_rows:
    ident=area['zoneId'];name=area['name'];isle=name=='Purgonorgo Isle';bay=name=='Bibiki Bay'
    grouped={}
    for m in monsters[ident]:
        if (isle and m['pos_z']>=0) or (bay and m['pos_z']<0):continue
        display=m['polutils_name'] or title(m['mobname']);key=norm(display)
        entry=grouped.setdefault(key,dict(key=key,name=display,levelMin=999,levelMax=0,families=set(),
             nm=False,hnm=display in hnm,aggressive=False,trueDetection=False,links=False,detects=set(),
             spawnTypes=set(),respawns=set(),points=[],drops=list(loot[(ident,key)].values()),shared=[]))
        entry['levelMin']=min(entry['levelMin'],m['minLevel']);entry['levelMax']=max(entry['levelMax'],m['maxLevel'])
        entry['families'].add(title(m['family'] or 'Unknown'));entry['nm']|=bool(m['mobType']&2)
        entry['aggressive']|=bool(m['aggro']);entry['trueDetection']|=bool(m['true_detection']);entry['links']|=bool(m['links'])
        entry['detects'].update(label for bit,label in detect_names.items() if (m['detects'] or 0)&bit)
        entry['spawnTypes'].update(label for bit,label in spawn_names.items() if m['spawntype']&bit)
        entry['respawns'].add(m['respawntime'])
        # Keep every entity record. Placeholder origin/fished positions are explicit.
        xyz=[round(float(m['pos_'+axis]),3) for axis in 'xyz']
        placeholder=xyz in ([0,0,0],[1,1,1])
        entry['points'].append([m['mobid'],*xyz,'Scripted / placeholder' if placeholder else 'Recorded point'])
    records=[]
    for entry in grouped.values():
        candidates=shared.get((ident,entry['key']),[])
        for iid,rule in rules.items():
            if any(row['levelMax']>=rule['minimumLevel'] and (not rule.get('element') or rule['element']==row['element']) for row in candidates):
                entry['shared'].append(iid)
        for key in ('families','detects','spawnTypes','respawns'):entry[key]=sorted(entry[key])
        entry['spawnCount']=len(entry['points']);entry['mappedCount']=sum(point[4]=='Recorded point' for point in entry['points'])
        entry['locationCount']=len({tuple(point[1:4]) for point in entry['points'] if point[4]=='Recorded point'})
        entry['level']=str(entry['levelMin']) if entry['levelMin']==entry['levelMax'] else f"{entry['levelMin']}–{entry['levelMax']}"
        entry['detect']=' · '.join((['Aggressive'] if entry['aggressive'] else ['Normally non-aggressive'])+entry['detects']+(['True detection'] if entry['trueDetection'] else [])+(['Links'] if entry['links'] else []))
        entry['spawn']=' · '.join([f"{entry['spawnCount']} spawn records",*entry['spawnTypes']])
        first=next((point for point in entry['points'] if point[4]=='Recorded point'),None)
        entry['pos']=f'X {first[1]}, Y {first[2]}, Z {first[3]}' if first else 'Scripted / unplaced coordinates'
        records.append(entry);spawn_total+=entry['spawnCount']
        bestiary[entry['key']].append(dict(zone=name,zoneId=ident,count=entry['spawnCount'],level=entry['level']))
    npc_rows={}
    for n in npcs[ident]:
        if (isle and n['pos_z']>=0) or (bay and n['pos_z']<0):continue
        display=n['polutils_name'] or title(n['name'])
        if not display or display in ('','blank','Blank') or display.startswith('NPC['):continue
        key=norm(display)
        npc=npc_rows.setdefault(key,dict(name=display,points=[]))
        npc['points'].append([n['npcid'],*[round(float(n['pos_'+axis]),3) for axis in 'xyz']])
    # Reuse the compendium's reviewed story/service records, including scripted NPCs.
    stories={}
    for key,person in person_index[norm(name)].items():
        if key not in npc_rows and (person.get('quests') or person.get('activities')):
            npc_rows[key]=dict(name=person['name'],points=[],pos=' · '.join(person.get('locations',[])),indexedOnly=True)
        n=npc_rows.get(key)
        if not n:continue
        n['quests']=[{k:q[k] for k in ('title','url','role','requirements') if k in q} for q in person.get('quests',[])]
        n['activities']=list(dict.fromkeys(person.get('activities',[])+person.get('notes',[])+[line for q in person.get('quests',[]) if q.get('role')=='Current Reality service' for line in q.get('interactions',[])]))
        for q in n['quests']:stories[q['url']]=q
    for key,n in npc_rows.items():
        if n['points']:n['pos']=' · '.join(f'{a.upper()} {v}' for a,v in zip('xyz',n['points'][0][1:]))
        n['count']=len(n['points']);n['wares']=vendors[(norm(name),key)]
    records.sort(key=lambda m:m['name'].lower())
    result=dict(version=1,zone=name,zoneId=ident,mobs=[m for m in records if not m['nm'] and not m['hnm']],
                nms=[m for m in records if m['nm'] and not m['hnm']],hnms=[m for m in records if m['hnm']],
                npcs=sorted(npc_rows.values(),key=lambda n:n['name'].lower()),
                stories=sorted(stories.values(),key=lambda q:q['title'].lower()),
                sourceNote='Current Reality server records. Spawn records are potential entity slots, not a live population count. Scripted locations, timers and availability may vary.')
    encoded=dump(result)+'\n';filename=str(ident)+('-isle' if isle else '')+'.json'
    (OUT/filename).write_bytes(encoded.encode('utf-8'))
    area.update(file=filename,hash=hashlib.sha256(encoded.encode()).hexdigest()[:16],mobCount=len(records),spawnCount=sum(m['spawnCount'] for m in records),npcCount=len(npc_rows))
    terms={m['name'] for m in records}|{n['name'] for n in npc_rows.values()}|{q['title'] for q in stories.values()}
    terms.update(d['name'] for m in records for d in m['drops'])
    terms.update(item_names[i] for m in records for i in m['shared'])
    terms.update(d['name'] for n in npc_rows.values() for d in n['wares'])
    area['search']=' | '.join(sorted(terms)).lower()
    area['exits']=sorted({area_names.get(edge['tozone'],title(zones.get(edge['tozone'],{}).get('name',''))) for edge in data.get('edges',[]) if edge['fromzone']==ident})
    if isle:area['exits']=[] # Bibiki's mainland zoneline is not walkable from the island.
    if name in old['maps']:
        area['maps']=old['maps'][name]
    else:
        from PIL import Image
        MAP_OUT.mkdir(exist_ok=True)
        urls=[]
        for file in images[ident]:
            source=mappy/file;target=MAP_OUT/(source.stem.lower()+'.webp')
            if not target.exists() or target.stat().st_mtime<source.stat().st_mtime:
                with Image.open(source) as image:image.convert('RGBA').save(target,format='WEBP',quality=92,method=4)
            urls.append('atlas-maps/'+target.name)
        area['maps']=dict(zoneId=ident,hex=f'{ident:x}',maps=urls,source='Installed Mappy atlas')
    # Purgonorgo is the southern subarea of zone 4, not arena zone 44.
    if isle:area['maps']=dict(zoneId=4,hex='04',maps=['https://cdn.jsdelivr.net/gh/khoa002/ffxi-mappy@master/Maps/04_1.gif'],source='Bibiki Bay · Purgonorgo Isle')
    index[name]=area

version=hashlib.sha256((dump(index)+dump(rules)+item_revision.hexdigest()).encode()).hexdigest()[:16]
payload=dict(version=version,areas=index,groups=groups,rules={iid:dict(name=item_names[iid],**rule) for iid,rule in rules.items()},
             stats=dict(areas=len(index),mobRecords=sum(a['mobCount'] for a in area_rows),spawnRecords=spawn_total,missingGameplay=[]))
(SITE/'travel/atlas-index.js').write_text('window.CR_ATLAS_INDEX='+dump(payload)+';\n',encoding='utf-8')
write(OUT/'bestiary-index.json',bestiary)
print(dump(dict(version=version,areas=len(index),added=len(index)-210,mobs=payload['stats']['mobRecords'],spawns=spawn_total,bytes=sum(p.stat().st_size for p in OUT.glob('*.json')))))
