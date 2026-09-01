#!/usr/bin/env python3
"""Convert a safe LandSandBoat gameplay-only SQL dump into compact public JSON."""
from __future__ import annotations
import argparse, json, re
from collections import Counter, defaultdict
from pathlib import Path

JOB_CODES = ['WAR','MNK','WHM','BLM','RDM','THF','PLD','DRK','BST','BRD','RNG','SAM','NIN','DRG','SMN','BLU','COR','PUP','DNC','SCH','GEO','RUN']
ELEMENTS = ['Fire','Ice','Wind','Earth','Lightning','Water','Light','Dark','None']
WEAPONS = {1:'Hand-to-Hand',2:'Dagger',3:'Sword',4:'Great Sword',5:'Axe',6:'Great Axe',7:'Scythe',8:'Polearm',9:'Katana',10:'Great Katana',11:'Club',12:'Staff',25:'Archery',26:'Marksmanship',27:'Throwing',28:'Guarding',29:'Evasion',30:'Shield',31:'Parrying'}
SKILLCHAINS = {0:'',1:'Transfixion',2:'Compression',3:'Liquefaction',4:'Scission',5:'Reverberation',6:'Detonation',7:'Induration',8:'Impaction',9:'Gravitation',10:'Fragmentation',11:'Distortion',12:'Fusion',13:'Light',14:'Darkness'}
CRAFTS = [('Wood','Woodworking'),('Smith','Smithing'),('Gold','Goldsmithing'),('Cloth','Clothcraft'),('Leather','Leathercraft'),('Bone','Bonecraft'),('Alchemy','Alchemy'),('Cook','Cooking')]

def columns_for(text: str, table: str):
    m = re.search(rf"CREATE TABLE `{re.escape(table)}` \((.*?)\) ENGINE=", text, re.S)
    if not m: return []
    return re.findall(r"^\s*`([^`]+)`\s", m.group(1), re.M)

def unescape_sql(s: str):
    out=[]; i=0; escapes={'0':'\0','n':'\n','r':'\r','t':'\t','b':'\b','Z':'\x1a'}
    while i<len(s):
        if s[i]=='\\' and i+1<len(s): out.append(escapes.get(s[i+1],s[i+1])); i+=2
        else: out.append(s[i]); i+=1
    return ''.join(out)

def parse_value(src: str, i: int):
    if src[i]=="'":
        i+=1; raw=[]
        while i<len(src):
            if src[i]=='\\' and i+1<len(src): raw.extend([src[i],src[i+1]]); i+=2; continue
            if src[i]=="'": return unescape_sql(''.join(raw)),i+1
            raw.append(src[i]); i+=1
        raise ValueError('unterminated SQL string')
    j=i
    while j<len(src) and src[j] not in ',)': j+=1
    raw=src[i:j].strip()
    if raw.upper()=='NULL': return None,j
    try: return (float(raw) if any(c in raw for c in '.eE') else int(raw)),j
    except ValueError: return raw,j

def parse_insert_rows(text: str, table: str):
    marker=f"INSERT INTO `{table}` VALUES"
    rows=[]; pos=0
    while True:
        start=text.find(marker,pos)
        if start<0: break
        i=start+len(marker)
        while i<len(text):
            while i<len(text) and (text[i].isspace() or text[i]==','): i+=1
            if i>=len(text) or text[i]==';': pos=i+1; break
            if text[i]!='(': raise ValueError(f'{table}: expected row at {i}')
            i+=1; row=[]
            while True:
                while text[i].isspace(): i+=1
                value,i=parse_value(text,i); row.append(value)
                while text[i].isspace(): i+=1
                if text[i]==',': i+=1; continue
                if text[i]==')': i+=1; break
                raise ValueError(f'{table}: expected delimiter at {i}')
            rows.append(row)
    return rows

def table_records(text, table):
    cols=columns_for(text,table)
    return [dict(zip(cols,row)) for row in parse_insert_rows(text,table)]

def title(name):
    return str(name or '').replace('_',' ').title().replace('Ii','II').replace('Iii','III').replace('Iv','IV')

def binary_levels(value):
    value=value or ''
    return [ord(value[i]) if i<len(value) else 0 for i in range(22)]

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('sql'); ap.add_argument('output'); args=ap.parse_args()
    text=Path(args.sql).read_text(encoding='utf-8-sig',errors='replace')
    needed=['jobs','abilities','job_abilities','weapon_skills','spell_list','skill_ranks','item_basic','item_equipment','item_weapon','item_usable','synth_recipes','guild_item_points']
    db={name:table_records(text,name) for name in needed}
    item_names={int(x['itemid']):title(x['name']) for x in db['item_basic']}
    equipment={int(x['itemId']):x for x in db['item_equipment']}; weapons={int(x['itemId']):x for x in db['item_weapon']}; usable={int(x['itemid']):x for x in db['item_usable']}
    jobs=[{'id':int(j['job_id']),'code':JOB_CODES[int(j['job_id'])-1],'name':j['job_name']} for j in db['jobs'] if 1<=int(j['job_id'])<=22]
    abilities=[{'id':int(a['abilityId']),'name':title(a['name']),'job':JOB_CODES[int(a['job'])-1] if 1<=int(a['job'])<=22 else 'ALL','level':int(a['level']),'recast':int(a['recastTime']),'target':int(a['validTarget']),'aoe':bool(a['isAOE']),'content':a['content_tag']} for a in db['abilities']]
    spells=[]
    for s in db['spell_list']:
        levels=binary_levels(s['jobs']); job_levels={JOB_CODES[i]:lv for i,lv in enumerate(levels) if lv}
        spells.append({'id':int(s['spellid']),'name':title(s['name']),'jobs':job_levels,'group':int(s['group']),'family':int(s['family']),'element':ELEMENTS[int(s['element'])] if 0<=int(s['element'])<len(ELEMENTS) else str(s['element']),'skill':int(s['skill']),'mp':int(s['mpCost']),'cast':int(s['castTime']),'recast':int(s['recastTime']),'aoe':bool(s['AOE']),'content':s['content_tag']})
    weapon_skills=[]
    for w in db['weapon_skills']:
        flags=binary_levels(w['jobs']); available=[JOB_CODES[i] for i,v in enumerate(flags) if v]
        sc=[SKILLCHAINS.get(int(w[k]),str(w[k])) for k in ('primary_sc','secondary_sc','tertiary_sc') if int(w[k])]
        weapon_skills.append({'id':int(w['weaponskillid']),'name':title(w['name']),'jobs':available,'weapon':WEAPONS.get(int(w['type']),f"Skill {w['type']}"),'skill':int(w['skilllevel']),'sc':sc,'aoe':bool(w['aoe']),'mainOnly':bool(w['main_only'])})
    skill_ranks=[]
    for r in db['skill_ranks']:
        ranks={code:int(r[code.lower()]) for code in JOB_CODES if code.lower() in r and int(r[code.lower()])}
        skill_ranks.append({'id':int(r['skillid']),'name':title(r['name']),'jobs':ranks})
    items=[]
    for b in db['item_basic']:
        iid=int(b['itemid']); e=equipment.get(iid); w=weapons.get(iid); u=usable.get(iid)
        kind='Weapon' if w else 'Equipment' if e else 'Usable' if u else 'Item'
        entry={'id':iid,'name':title(b['name']),'kind':kind,'stack':int(b['stackSize']),'sell':int(b['BaseSell'])}
        if e: entry['equip']={'level':int(e['level']),'ilevel':int(e['ilevel']),'jobs':int(e['jobs']),'slot':int(e['slot']),'su':int(e['su_level'])}
        if w: entry['weapon']={'skill':WEAPONS.get(int(w['skill']),f"Skill {w['skill']}"),'damage':int(w['dmg']),'delay':int(w['delay']),'hits':int(w['hit'])}
        if u: entry['usable']={'charges':int(u['maxCharges']),'reuse':int(u['reuseDelay']),'aoe':bool(u['aoe'])}
        items.append(entry)
    recipes=[]
    for r in db['synth_recipes']:
        counts=Counter(int(r[f'Ingredient{i}']) for i in range(1,9) if int(r[f'Ingredient{i}']))
        skills={public:int(r[dbcol]) for dbcol,public in CRAFTS if int(r[dbcol])}
        result=int(r['Result']); crystal=int(r['Crystal'])
        recipes.append({'id':int(r['ID']),'desynth':bool(r['Desynth']),'keyItem':int(r['KeyItem']),'skills':skills,'crystal':{'id':crystal,'name':item_names.get(crystal,f'Item {crystal}')},'ingredients':[{'id':iid,'name':item_names.get(iid,f'Item {iid}'),'qty':qty} for iid,qty in counts.items()],'result':{'id':result,'name':item_names.get(result,title(r['ResultName'])),'qty':int(r['ResultQty'])},'hq':[{'id':int(r[f'ResultHQ{i}']),'name':item_names.get(int(r[f'ResultHQ{i}']),f"Item {r[f'ResultHQ{i}']}"),'qty':int(r[f'ResultHQ{i}Qty'])} for i in range(1,4) if int(r[f'ResultHQ{i}'])],'content':r['content_tag']})
    guild=[{'guild':int(g['guildid']),'item':int(g['itemid']),'name':item_names.get(int(g['itemid']),f"Item {g['itemid']}"),'rank':int(g['rank']),'points':int(g['points']),'cap':int(g['max_points']),'pattern':int(g['pattern'])} for g in db['guild_item_points']]
    out={'meta':{'source':'FFXI VR gameplay database','jobs':len(jobs),'abilities':len(abilities),'spells':len(spells),'weaponSkills':len(weapon_skills),'items':len(items),'recipes':len(recipes)},'jobs':jobs,'abilities':abilities,'customAbilities':[{'id':int(x['ability_id']),'name':x['ability_name']} for x in db['job_abilities']],'spells':spells,'weaponSkills':weapon_skills,'skillRanks':skill_ranks,'items':items,'recipes':recipes,'guildPoints':guild}
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    Path(args.output).write_text(json.dumps(out,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
    print(json.dumps(out['meta'],indent=2))

if __name__=='__main__': main()
