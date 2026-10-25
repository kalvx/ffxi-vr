"""Build zone activities from an anonymous fishing export and installed HELM data.
Usage: python tools/build-atlas-activities.py FISHING_SNAPSHOT RUNTIME OUTPUT_JSON
No database access or writes to the supplied runtime.
"""
from collections import defaultdict
from pathlib import Path
import json,re,sys

snapshot,runtime,output=map(Path,sys.argv[1:4])
site=Path(__file__).resolve().parents[1]
fishing=json.loads(snapshot.read_text(encoding='utf-8'))
def constants(path):return {k:int(v) for k,v in re.findall(r'^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*,',path.read_text(encoding='utf-8-sig'),re.M)}
items=constants(runtime/'scripts/enum/item.lua');zones=constants(runtime/'scripts/enum/zone.lua')
key_names={v:k.replace('_',' ').title() for k,v in constants(runtime/'scripts/enum/key_item.lua').items()}
names={}
for p in (site/'assets/data/item-sources').glob('*.json'):
    if p.stem.isdigit():names.update({int(k):v['item']['name'] for k,v in json.loads(p.read_text(encoding='utf-8')).items()})
activities=defaultdict(lambda:dict(gathering=[],fishing=[]))
text=(runtime/'scripts/globals/helm.lua').read_text(encoding='utf-8-sig')
text=re.sub(r'--[^\n]*','',text)
def block(source,start):
    begin=source.index('{',start);depth=0
    for i in range(begin,len(source)):
        if source[i]=='{':depth+=1
        elif source[i]=='}':
            depth-=1
            if not depth:return source[begin+1:i]
    raise ValueError('Unclosed Lua table')
types=list(re.finditer(r'^    \[xi\.helmType\.([A-Z]+)\]\s*=',text,re.M))
assert len(types)==4
for hit in types:
    section=block(text,hit.end());tool=items[re.search(r'tool\s*=\s*xi.item.([A-Z0-9_]+)',section)[1]]
    for zone in re.finditer(r'^            \[xi.zone.([A-Z0-9_]+)\]\s*=',section,re.M):
        body=block(section,zone.end());drops=block(body,body.index('drops'));points=block(body,body.index('points'))
        rows=[]
        for row in re.finditer(r'\{\s*(\d+)\s*,\s*xi.item.([A-Z0-9_]+)\s*\}',drops):
            iid=items[row[2]];rows.append(dict(id=iid,name=names.get(iid,row[2].replace('_',' ').title()),weight=int(row[1]),dayElement=row[2]=='RED_ROCK'))
        assert not re.sub(r'[\s,]','',re.sub(r'\{\s*\d+\s*,\s*xi.item.[A-Z0-9_]+\s*\}','',drops)),'Unsupported gathering reward expression'
        xyz=[]
        for row in re.finditer(r'\{\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\}',points):xyz.append([float(row[i]) for i in (1,2,3)])
        assert not re.sub(r'[\s,]','',re.sub(r'\{\s*[-\d.]+\s*,\s*[-\d.]+\s*,\s*[-\d.]+\s*\}','',points)),'Unsupported gathering point expression'
        activities[zones[zone[1]]]['gathering'].append(dict(kind=hit[1].title(),tool=dict(id=tool,name=names[tool]),items=rows,points=xyz))
baits=defaultdict(list)
for bait in fishing['baits']:
    if bait['baitid'] in names:baits[bait['fishid']].append(dict(id=bait['baitid'],name=names[bait['baitid']],affinity=bait['power']))
catches=defaultdict(list)
patterns=[{1:'Night / morning / afternoon',2:'High tide',3:'Low tide',4:'Night',5:'Morning / afternoon',6:'Day / night',7:'Day'},
          {1:'New / full moon',2:'New / full moon penalty',3:'Toward new moon',4:'Full moon',5:'New moon'},
          {1:'Spring / summer',2:'Spring / winter',3:'Summer',4:'Winter / summer',5:'Summer / autumn',6:'Late spring / late autumn'}]
for row in fishing['catches']:
    if row['disabled']:continue
    preferences=[pattern[row[key]] for pattern,key in zip(patterns,('hour_pattern','moon_pattern','month_pattern')) if row[key] in pattern]
    catches[row['zoneid'],row['areaid']].append(dict(id=row['fishid'],name=names.get(row['fishid'],row['name'].replace('_',' ').title()),skill=row['skill_level'],weight=row['rarity'],water={1:'Freshwater',2:'Saltwater'}.get(row['water_type'],'Any water type'),keyItem=key_names.get(row['required_keyitem'],'Key item '+str(row['required_keyitem'])) if row['required_keyitem'] else '',questOnly=bool(row['quest_only']),preferences=preferences,baits=baits[row['fishid']]))
for water in fishing['waters']:
    rows=catches[water['zoneid'],water['areaid']]
    if not rows:continue
    activities[water['zoneid']]['fishing'].append(dict(areaId=water['areaid'],name=water['name'],center=[water['center_'+axis] for axis in 'xyz'],radius=water['bound_radius'],items=rows))
dig=(site/'crafting/chocobo-digging-data.js').read_text(encoding='utf-8').strip()
dig=json.loads(dig.removeprefix('window.CR_CHOCOBO_DIGGING_DATA=').removesuffix(';'))
digging=defaultdict(list)
for z,method,item,weight,rank in dig['d']:
    digging[dig['z'][z]].append(dict(name=dig['i'][item],method=dig['l'][method].title(),weight=weight,rank=dig['r'][rank]))
result=dict(zones=activities,digging=digging,source='Installed HELM configuration, read-only native fishing metadata, and existing reviewed digging index. Weights are not catch/drop percentages.')
output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(dict(gathering=sum(len(a['gathering']) for a in activities.values()),points=sum(len(g['points']) for a in activities.values() for g in a['gathering']),waters=sum(len(a['fishing']) for a in activities.values()),diggingAreas=len(digging))))
