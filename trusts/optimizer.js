(()=>{
const $=id=>document.getElementById(id);

// Native combat-skill weapon families used by the optimizer.  These are
// intentionally based on job combat proficiency, not merely odd/all-jobs
// equipment that happens to be equippable.
const jobs={
WAR:['Great Axe','Great Sword','Axe','Sword','Scythe','Polearm','Staff','Dagger','Hand-to-Hand','Archery','Marksmanship'],
MNK:['Hand-to-Hand','Staff','Club'],
WHM:['Club','Staff'],
BLM:['Staff','Club','Scythe','Dagger'],
RDM:['Sword','Dagger','Staff','Club','Archery'],
THF:['Dagger','Sword','Hand-to-Hand','Archery','Marksmanship'],
PLD:['Sword','Great Sword','Staff','Club','Dagger','Polearm'],
DRK:['Scythe','Great Sword','Great Axe','Axe','Sword','Dagger','Marksmanship'],
BST:['Axe','Scythe','Dagger','Club','Sword'],
BRD:['Dagger','Sword','Staff','Club'],
RNG:['Archery','Marksmanship','Dagger','Sword','Axe'],
SAM:['Great Katana','Polearm','Sword','Dagger','Archery'],
NIN:['Katana','Great Katana','Dagger','Sword','Hand-to-Hand','Archery','Marksmanship'],
DRG:['Polearm','Staff','Sword','Dagger','Club'],
SMN:['Staff','Club','Dagger'],
BLU:['Sword','Club'],
COR:['Marksmanship','Dagger','Sword'],
PUP:['Hand-to-Hand','Dagger','Club'],
DNC:['Dagger','Sword','Hand-to-Hand'],
SCH:['Staff','Club','Dagger'],
GEO:['Club','Staff','Dagger'],
RUN:['Great Sword','Axe','Great Axe','Sword']
};

const WS={Sword:[['Fast Blade',3,'Scission'],['Burning Blade',10,'Liquefaction'],['Red Lotus Blade',30,'Liquefaction','Detonation'],['Flat Blade',40,'Impaction'],['Shining Blade',50,'Scission'],['Seraph Blade',60,'Scission'],['Circle Blade',60,'Reverberation','Impaction'],['Vorpal Blade',60,'Scission','Impaction'],['Swift Blade',65,'Gravitation'],['Savage Blade',71,'Fragmentation','Scission']],Dagger:[['Wasp Sting',3,'Scission'],['Gust Slash',10,'Detonation'],['Shadowstitch',20,'Reverberation'],['Viper Bite',33,'Scission'],['Cyclone',41,'Detonation','Impaction'],['Dancing Edge',60,'Scission','Detonation'],['Shark Bite',65,'Fragmentation'],['Evisceration',71,'Gravitation','Transfixion']],['Great Sword']:[['Hard Slash',3,'Scission'],['Power Slash',10,'Transfixion'],['Frostbite',20,'Induration'],['Freezebite',30,'Induration','Detonation'],['Shockwave',40,'Reverberation'],['Crescent Moon',50,'Scission'],['Sickle Moon',60,'Scission','Impaction'],['Spinning Slash',65,'Fragmentation'],['Ground Strike',71,'Fragmentation','Distortion']],['Great Axe']:[['Shield Break',5,'Impaction'],['Iron Tempest',15,'Scission'],['Sturmwind',23,'Reverberation','Scission'],['Armor Break',33,'Impaction'],['Keen Edge',43,'Compression'],['Raging Rush',60,'Induration','Reverberation'],['Full Break',65,'Distortion'],['Steel Cyclone',71,'Distortion','Detonation']],Axe:[['Raging Axe',3,'Detonation','Impaction'],['Smash Axe',10,'Induration','Reverberation'],['Gale Axe',23,'Detonation'],['Avalanche Axe',33,'Scission','Impaction'],['Spinning Axe',49,'Liquefaction','Scission'],['Rampage',55,'Scission'],['Calamity',60,'Scission','Impaction'],['Mistral Axe',66,'Fusion'],['Decimation',71,'Fusion','Reverberation']],['Hand-to-Hand']:[['Combo',1,'Impaction'],['Shoulder Tackle',10,'Reverberation','Impaction'],['One Inch Punch',20,'Compression'],['Backhand Blow',30,'Detonation'],['Raging Fists',41,'Impaction'],['Spinning Attack',49,'Liquefaction','Impaction'],['Howling Fist',60,'Transfixion','Impaction'],['Dragon Kick',65,'Fragmentation'],['Asuran Fists',71,'Gravitation','Liquefaction']],Club:[['Shining Strike',3,'Impaction'],['Seraph Strike',10,'Impaction'],['Brainshaker',20,'Reverberation'],['Skullbreaker',50,'Induration','Reverberation'],['True Strike',55,'Detonation','Impaction'],['Judgment',60,'Impaction'],['Hexa Strike',67,'Fusion'],['Black Halo',71,'Fragmentation','Compression']],Staff:[['Heavy Swing',3,'Impaction'],['Rock Crusher',10,'Impaction'],['Earth Crusher',20,'Detonation','Impaction'],['Starburst',40,'Compression','Reverberation'],['Sunburst',40,'Compression','Reverberation'],['Shell Crusher',50,'Detonation'],['Full Swing',55,'Liquefaction','Impaction'],['Retribution',71,'Gravitation','Reverberation']],Scythe:[['Slice',3,'Scission'],['Dark Harvest',10,'Compression'],['Shadow of Death',20,'Induration','Reverberation'],['Nightmare Scythe',30,'Compression','Scission'],['Spinning Scythe',41,'Reverberation','Scission'],['Vorpal Scythe',49,'Transfixion','Scission'],['Guillotine',60,'Induration'],['Cross Reaper',65,'Distortion'],['Spiral Hell',71,'Gravitation','Compression']],Polearm:[['Double Thrust',3,'Transfixion'],['Thunder Thrust',10,'Transfixion','Impaction'],['Raiden Thrust',20,'Transfixion','Impaction'],['Leg Sweep',30,'Impaction'],['Penta Thrust',49,'Compression'],['Vorpal Thrust',55,'Reverberation','Transfixion'],['Skewer',60,'Transfixion','Impaction'],['Wheeling Thrust',65,'Fusion'],['Impulse Drive',71,'Gravitation','Induration']],['Great Katana']:[['Tachi: Enpi',3,'Transfixion','Scission'],['Tachi: Hobaku',10,'Induration'],['Tachi: Goten',20,'Transfixion','Impaction'],['Tachi: Kagero',30,'Liquefaction'],['Tachi: Jinpu',40,'Scission','Detonation'],['Tachi: Koki',50,'Reverberation','Impaction'],['Tachi: Yukikaze',60,'Induration','Detonation'],['Tachi: Gekko',65,'Distortion','Reverberation'],['Tachi: Kasha',71,'Fusion','Compression']],Katana:[['Blade: Rin',3,'Transfixion'],['Blade: Retsu',10,'Scission'],['Blade: Teki',20,'Reverberation'],['Blade: To',30,'Induration','Detonation'],['Blade: Chi',40,'Transfixion','Impaction'],['Blade: Ei',50,'Compression'],['Blade: Jin',60,'Detonation','Impaction'],['Blade: Ten',65,'Gravitation'],['Blade: Ku',71,'Gravitation','Transfixion']],Archery:[['Flaming Arrow',3,'Liquefaction','Transfixion'],['Piercing Arrow',10,'Reverberation','Transfixion'],['Dulling Arrow',20,'Liquefaction','Transfixion'],['Sidewinder',55,'Reverberation','Transfixion'],['Blast Arrow',60,'Induration','Transfixion'],['Arching Arrow',65,'Fusion'],['Empyreal Arrow',71,'Fusion','Transfixion']],Marksmanship:[['Hot Shot',3,'Liquefaction','Transfixion'],['Split Shot',10,'Reverberation','Transfixion'],['Sniper Shot',20,'Liquefaction','Transfixion'],['Slug Shot',55,'Reverberation','Transfixion'],['Blast Shot',60,'Induration','Transfixion'],['Heavy Shot',65,'Fusion'],['Detonator',71,'Fusion','Transfixion']]};

const C={Transfixion:{Scission:'Distortion',Reverberation:'Reverberation',Compression:'Compression'},Compression:{Transfixion:'Transfixion',Detonation:'Detonation'},Liquefaction:{Scission:'Scission',Impaction:'Fusion'},Scission:{Liquefaction:'Liquefaction',Reverberation:'Reverberation',Detonation:'Detonation'},Reverberation:{Induration:'Induration',Impaction:'Impaction'},Detonation:{Compression:'Compression',Scission:'Scission'},Induration:{Reverberation:'Fragmentation',Compression:'Compression',Impaction:'Impaction'},Impaction:{Liquefaction:'Liquefaction',Detonation:'Detonation'},Fusion:{Gravitation:'Gravitation',Fragmentation:'Light'},Fragmentation:{Distortion:'Distortion',Fusion:'Light'},Distortion:{Fusion:'Fusion',Gravitation:'Darkness'},Gravitation:{Fragmentation:'Fragmentation',Distortion:'Darkness'},Light:{Light:'Light'},Darkness:{Darkness:'Darkness'}};
const MB={Light:'Fire · Wind · Lightning · Light',Darkness:'Ice · Earth · Water · Dark',Fusion:'Fire · Light',Fragmentation:'Wind · Lightning',Distortion:'Ice · Water',Gravitation:'Earth · Dark',Transfixion:'Light',Compression:'Dark',Liquefaction:'Fire',Scission:'Earth',Reverberation:'Water',Detonation:'Wind',Induration:'Ice',Impaction:'Lightning'};

// Verified Current Reality Summoner Blood Pact properties from the bundled
// Chains skills data.  These can form real master↔avatar skillchains.
const SMN_PET=[
['Carbuncle','Poison Nails',5,'Transfixion'],['Fenrir','Moonlit Charge',5,'Compression'],['Fenrir','Crescent Fang',10,'Transfixion'],
['Ifrit','Punch',1,'Liquefaction'],['Ifrit','Burning Strike',23,'Impaction'],['Ifrit','Double Punch',30,'Compression'],
['Titan','Rock Throw',1,'Scission'],['Titan','Rock Buster',21,'Reverberation'],['Titan','Megalith Throw',35,'Induration'],
['Leviathan','Barracuda Dive',1,'Reverberation'],['Leviathan','Tail Whip',26,'Detonation'],['Garuda','Claw',1,'Detonation'],
['Shiva','Axe Kick',1,'Induration'],['Shiva','Double Slap',50,'Scission'],['Ramuh','Shock Strike',1,'Impaction']
];

// Automaton WS properties are frame/automaton-skill dependent. They are
// usable for planning, but receive a lower confidence than the SMN list
// because the selected character level alone does not prove the frame's
// current melee/ranged skill or maneuver state.
const PUP_PET=[
['Harlequin/Stormwaker','Slapstick',0,'Reverberation','Impaction'],['Harlequin/Stormwaker','Knockout',145,'Scission','Detonation'],['Harlequin/Stormwaker','Magic Mortar',225,'Fusion'],
['Sharpshot','Arcuballista',0,'Liquefaction','Transfixion'],['Sharpshot','Daze',150,'Impaction','Transfixion','Compression'],['Sharpshot','Armor Piercer',245,'Gravitation'],['Sharpshot','Armor Shatterer',324,'Fusion','Impaction'],
['Valoredge','Cannibal Blade',150,'Compression','Reverberation'],['Valoredge','Bone Crusher',245,'Fragmentation'],['Valoredge','String Shredder',324,'Distortion','Scission']
];

const PET_MODE={
SMN:'Avatar Blood Pacts can open or close a skillchain with the Summoner.',
BST:'Damaging Ready moves carry skillchain attributes; the exact route depends on the active jug/charmed pet and Ready move.',
PUP:'Automaton weapon skills can open or close skillchains. Inhibitor-style control can make the automaton hold TP for the master.',
DRG:'Wyvern breaths are useful pet damage/support, but are not treated here as normal weapon-skill skillchain steps.'
};

function trustData(){try{return typeof TRUST_DETAILS!=='undefined'?TRUST_DETAILS:[]}catch(e){return[]}}
function props(n){for(const a of Object.values(WS))for(const w of a)if(w[0].toLowerCase()===String(n).toLowerCase())return w.slice(2);return[]}
function moves(t){let s=(t.weaponSkills||'').toLowerCase(),o=[];for(const a of Object.values(WS))for(const w of a)if(s.includes(w[0].toLowerCase()))o.push({name:w[0],p:w.slice(2)});return o}
function links(a,b){let o=[];for(const x of a)for(const y of b)if(C[x]?.[y])o.push({result:C[x][y]});return o}
function wantOK(r,w){return w==='auto'||r===w}

function prof(t){
 let s=((t.job||'')+' '+(t.behavior||'')).toLowerCase(),p={tank:0,heal:0,support:0,damage:1,burst:0,chain:0,bad:0,quiet:0};
 if(/paladin|rune fencer|provoke|enmity|sentinel|tank/.test(s))p.tank=4;
 if(/white mage|cure |curaga|healing|status removal/.test(s))p.heal=4;
 if(/bard|geomancer|corsair|march|madrigal|haste|refresh|roll|song|buff/.test(s))p.support=4;
 if(/black mage|elemental magic|magic burst|scholar/.test(s))p.burst=4;
 if(/skillchain|open a skillchain|close skillchain|holds tp|hold.*tp/.test(s))p.chain=5;
 if(/warrior|samurai|dark knight|monk|thief|ranger|dragoon|damage dealer/.test(s))p.damage=4;
 if(/does not use (tp|weapon skills)|doesn't use (tp|weapon skills)|never uses (tp|weapon skills)|will not use (tp|weapon skills)/.test(s))p.quiet=5;
 if(/does not try to skillchain|uses tp randomly|uses tp as soon/.test(s)){p.chain-=2;p.bad=3}
 return p;
}
const W={balanced:{tank:3,heal:3,support:2,damage:2,burst:1,chain:2,quiet:1},skillchain:{tank:1,heal:2,support:2,damage:2,burst:2,chain:7,quiet:5},burst:{tank:1,heal:2,support:3,damage:1,burst:7,chain:6,quiet:4},damage:{tank:1,heal:1,support:2,damage:6,burst:2,chain:2,quiet:0},support:{tank:2,heal:3,support:7,damage:1,burst:1,chain:1,quiet:4},safe:{tank:6,heal:6,support:3,damage:1,burst:1,chain:1,quiet:3}};

function chainMatches(pp,t,want){let out=[];for(const m of moves(t)){for(const l of links(pp,m.p))if(wantOK(l.result,want))out.push({...l,move:m.name,dir:'Player → Trust'});for(const l of links(m.p,pp))if(wantOK(l.result,want))out.push({...l,move:m.name,dir:'Trust → Player'})}return out.sort((a,b)=>(['Light','Darkness'].includes(b.result)?2:1)-(['Light','Darkness'].includes(a.result)?2:1))}

function petMatches(job,pp,lv,want){let out=[];
 if(job==='SMN')for(const p of SMN_PET){if(p[2]>lv)continue;let pr=[p[3]];for(const l of links(pr,pp))if(wantOK(l.result,want))out.push({result:l.result,pet:p[0],move:p[1],dir:'Pet → Player',confidence:'verified'});for(const l of links(pp,pr))if(wantOK(l.result,want))out.push({result:l.result,pet:p[0],move:p[1],dir:'Player → Pet',confidence:'verified'})}
 if(job==='PUP')for(const p of PUP_PET){let pr=p.slice(3);for(const l of links(pr,pp))if(wantOK(l.result,want))out.push({result:l.result,pet:p[0],move:p[1],dir:'Pet → Player',confidence:'conditional',skill:p[2]});for(const l of links(pp,pr))if(wantOK(l.result,want))out.push({result:l.result,pet:p[0],move:p[1],dir:'Player → Pet',confidence:'conditional',skill:p[2]})}
 return out.sort((a,b)=>(['Light','Darkness'].includes(b.result)?2:1)-(['Light','Darkness'].includes(a.result)?2:1));
}

function scoreTrust(x,weights,control,petCap){let p=x.p,s=Object.keys(weights).reduce((n,z)=>n+(p[z]||0)*(weights[z]||0),0);if(x.match)s+=['Light','Darkness'].includes(x.match.result)?70:45;if(control)s-=p.bad*12;if(petCap&&control)s+=p.quiet*7+p.support*3+p.heal*2;return s}
function pickTeam(base,k,weights,control,petCap,shift=0){let ranked=base.map(x=>({...x,s:scoreTrust(x,weights,control,petCap)})).sort((a,b)=>b.s-a.s),team=[],roles={};for(let i=0;i<ranked.length&&team.length<k;i++){let x=ranked[(i+shift)%ranked.length],r=Object.keys(x.p).filter(z=>!['bad','quiet'].includes(z)).sort((a,b)=>x.p[b]-x.p[a])[0];if(x.match||!roles[r]||team.length>=Math.max(2,k-2)){team.push(x);roles[r]=1}}for(const x of ranked)if(team.length<k&&!team.some(y=>y.t.name===x.t.name))team.push(x);return team.slice(0,k)}
function pct(team,petExact,petGeneric,control){let n=54;if(team.some(x=>x.match))n+=15;if(petExact)n+=18;else if(petGeneric)n+=8;if(team.some(x=>x.p.heal>=4))n+=6;if(team.some(x=>x.p.support>=4))n+=6;if(control)n+=4;n-=team.reduce((q,x)=>q+x.p.bad*3,0);return Math.max(42,Math.min(96,Math.round(n)))}
function teamCard(team,label,pc,job,lv,weapon,pws,petText){return `<article class="optimizer-team"><header><div><small>${label} · estimated success ${pc}%</small><h2>${team.map(x=>x.t.name).join(' · ')}</h2></div></header><div class="optimizer-members">${team.map(x=>`<div><b>${x.t.name}</b><span>${x.t.job||'Trust'}${x.match?' · exact '+x.match.result+' partner':''}${x.p.quiet?' · low-TP-interference':''}</span>${x.match?`<em>${x.match.dir} · ${x.match.move} → ${x.match.result}</em>`:''}<code>/ma &quot;${x.t.name}&quot; &lt;me&gt;</code></div>`).join('')}</div><p><b>Your build:</b> ${job} Lv.${lv} · ${weapon} · <strong>${pws}</strong>.</p>${petText?`<p><b>Pet factor:</b> ${petText}</p>`:''}</article>`}

function build(){
 let f=$('opt-focus').value,k=+$('opt-size').value,lv=+$('opt-level').value,pws=$('opt-ws').value,job=$('opt-job').value,weapon=$('opt-weapon').value,pp=props(pws),want=$('opt-chain').value,control=$('opt-control').checked;
 if(!pws||pws==='None available'||!pp.length){$('opt-chain-plan').innerHTML=`<article><small>Weapon-skill check</small><h3>No optimizer weapon skill is available for this build at Lv.${lv}.</h3><p>Raise the level or choose another native weapon family.</p></article>`;$('opt-results').innerHTML='';return}
 let pet=petMatches(job,pp,lv,want),petBest=pet[0],petGeneric=['SMN','BST','PUP'].includes(job),base=trustData().map(t=>{let ms=chainMatches(pp,t,want),p=prof(t);return{t,p,match:ms[0],ms}});
 let plan='';
 if(petBest){let first=petBest.dir==='Pet → Player'?`${petBest.pet}: ${petBest.move}`:`You: ${pws}`,second=petBest.dir==='Pet → Player'?`You: ${pws}`:`${petBest.pet}: ${petBest.move}`,note=petBest.confidence==='conditional'?` Automaton move requires the listed frame and sufficient automaton skill${petBest.skill?` (${petBest.skill})`:''}.`:'';plan=`<article><small>Pet-assisted battle plan · ${job} Lv.${lv}</small><h3>${first} → ${second} = <strong>${petBest.result}</strong></h3><p><b>Magic burst:</b> ${MB[petBest.result]}.</p><p>This means the player does not necessarily need a Trust to spend TP to create the chain. Low-TP-interference healers, buffers, tanks, and bursters can become the stronger party choice.${note}</p></article>`}
 else if(job==='BST'){plan=`<article><small>Pet-assisted battle plan · BST Lv.${lv}</small><h3>Beastmaster can skillchain with damaging Ready moves.</h3><p>The exact result depends on the summoned/charmed pet and Ready move, so the optimizer does not invent a specific jug-pet route. With <b>Favor Trusts that do not interrupt my skillchain</b> enabled, support/healing/low-TP-interference Trusts receive extra weight.</p></article>`}
 else {let best=base.flatMap(x=>x.ms.map(m=>({x,m}))).sort((a,b)=>(['Light','Darkness'].includes(b.m.result)?2:1)-(['Light','Darkness'].includes(a.m.result)?2:1))[0];if(best){let first=best.m.dir.startsWith('Player')?`You: ${pws}`:`${best.x.t.name}: ${best.m.move}`,second=best.m.dir.startsWith('Player')?`${best.x.t.name}: ${best.m.move}`:`You: ${pws}`;plan=`<article><small>Trust-assisted battle plan · ${job} Lv.${lv}</small><h3>${first} → ${second} = <strong>${best.m.result}</strong></h3><p><b>Magic burst:</b> ${MB[best.m.result]}.</p></article>`}else plan=`<article><small>Party plan · ${job} Lv.${lv}</small><h3>No exact verified Trust WS chain found for ${pws}${want!=='auto'?` → ${want}`:''}.</h3><p>Use the alternate team builds below. If skillchains and bursts are not your priority, <b>Support / Buffs</b> is usually the cleaner strategy because it intentionally favors utility over TP timing.</p></article>`}
 $('opt-chain-plan').innerHTML=plan;
 const variants=[
 {label:'Plan A · Selected strategy',weights:W[f],ctrl:control,shift:0},
 {label:'Plan B · Skillchain control',weights:W.skillchain,ctrl:true,shift:1},
 {label:'Plan C · Support-first',weights:W.support,ctrl:true,shift:2}
 ];
 let petText=PET_MODE[job]||'';
 $('opt-results').innerHTML=variants.map(v=>{let team=pickTeam(base,k,v.weights,v.ctrl,petGeneric,v.shift),pc=pct(team,!!petBest,petGeneric,v.ctrl);return teamCard(team,v.label,pc,job,lv,weapon,pws,petText)}).join('')+`<p class="notice"><strong>About the percentage:</strong> this is an optimizer confidence estimate based on verified chain compatibility, pet self-chain capability, healing/support coverage, and Trust TP-interference behavior. It is not a guaranteed in-game proc rate. ${petGeneric?'Because this is a pet job, support-style and low-TP-interference Trust combinations may outrank another damage dealer when your pet can handle the skillchain.':''}</p>`;
}

function updateWS(){let a=(WS[$('opt-weapon').value]||[]).filter(w=>w[1]<=+$('opt-level').value);$('opt-ws').innerHTML=a.map(w=>`<option value="${w[0]}">${w[0]} · Lv.${w[1]} · ${w.slice(2).join(' / ')}</option>`).join('')||'<option>None available</option>'}
function init(){let data=trustData();if(!data.length)return setTimeout(init,50);Object.keys(jobs).forEach(j=>$('opt-job').insertAdjacentHTML('beforeend',`<option>${j}</option>`));function weapons(){$('opt-weapon').innerHTML=jobs[$('opt-job').value].map(w=>`<option>${w}</option>`).join('');updateWS()}$('opt-job').onchange=weapons;$('opt-weapon').onchange=updateWS;$('opt-level').oninput=updateWS;$('opt-build').onclick=build;weapons();build()}
init();
})();