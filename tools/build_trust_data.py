#!/usr/bin/env python3
"""Build a compact local Trust guide dataset from BG Wiki's Trust template source."""
from pathlib import Path
from html import unescape
import json, re, sys, unicodedata

ROOT=Path(__file__).resolve().parents[1]
source=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
wiki=next(iter(source['query']['pages'].values()))['revisions'][0]['slots']['main']['*']
blocks=re.findall(r'===([^=\n]+)===\s*<onlyinclude>.*?\{\{Template:Trust\s*(.*?)\n\}\}\}\}</onlyinclude>',wiki,re.S|re.I)

def norm(value):
    return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower())

def fields(body):
    found={}
    matches=list(re.finditer(r'^\|([A-Za-z ]+)=',body,re.M))
    for index,match in enumerate(matches):
        end=matches[index+1].start() if index+1<len(matches) else len(body)
        found[match.group(1).strip()]=body[match.end():end].strip()
    return found

def clean(value):
    value=re.sub(r'<!--.*?-->','',value,flags=re.S)
    value=re.sub(r'\[\[(?:File|Image):[^\]]+\]\]','',value,flags=re.I)
    value=re.sub(r'\[\[[^\]|]+\|([^\]]+)\]\]',r'\1',value)
    value=re.sub(r'\[\[([^\]]+)\]\]',r'\1',value)
    value=re.sub(r'\{\{None\}\}','None',value,flags=re.I)
    value=re.sub(r'\{\{[^{}]*\}\}','',value)
    value=re.sub(r'<br\s*/?>','; ',value,flags=re.I)
    value=re.sub(r'<[^>]+>','',value)
    value=value.replace("'''",'').replace("''",'').replace('&nbsp;',' ')
    value=re.sub(r'^\*+\s*','',value,flags=re.M)
    value=re.sub(r'\n+','; ',value)
    return re.sub(r'\s+',' ',unescape(value)).strip(' ;')

parsed={norm(name):fields(body) for name,body in blocks}
raw=re.search(r'const raw=`([^`]+)`',(ROOT/'trusts/trusts.js').read_text(encoding='utf-8')).group(1)
aliases={'aahm':'Ark Angel HM','aaev':'Ark Angel EV','aamr':'Ark Angel MR','aatt':'Ark Angel TT','aagk':'Ark Angel GK','d_shantotto':'Domina Shantotto','babban':'Babban Mheillea','i_shield_uc':'Invincible Shield (UC)','naja_uc':'Naja Salaheem (UC)','jakoh_uc':'Jakoh Wahcondalo (UC)','yoran-oran_uc':'Yoran-Oran (UC)','pieuje_uc':'Pieuje (UC)','apururu_uc':'Apururu (UC)','flaviria_uc':'Flaviria (UC)','ayame_uc':'Ayame (UC)','maat_uc':'Maat (UC)','aldo_uc':'Aldo (UC)','sylvie_uc':'Sylvie (UC)','excenmille_s':'Excenmille (S)','selh_teus':"Selh'teus"}
def pretty(key):return aliases.get(key,key.replace('_ii',' II').replace('_uc',' (UC)').replace('_',' ').title())
records=[]
for row in raw.split(','):
    spell_id,key=row.split(':',1);name=pretty(key);data=parsed[norm(name)]
    records.append({'id':int(spell_id),'key':key,'name':name,'job':clean(data.get('Job','Not listed')),'acquisition':clean(data.get('Acquisition','Acquisition not listed')),'weaponSkills':clean(data.get('Weapon Skills','None')),'behavior':clean(data.get('Special','No additional behavior note listed'))})
out='const TRUST_DETAILS='+json.dumps(records,ensure_ascii=False,separators=(',',':'))+';\n'
(ROOT/'trusts/trust-data.js').write_text(out,encoding='utf-8')
print(f'Wrote {len(records)} local Trust records')
