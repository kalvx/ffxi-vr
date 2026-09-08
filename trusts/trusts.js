const classify=key=>key.endsWith('_uc')?'unity':/_ii$|_s$|^d_/.test(key)?'alternate':'standard';
const shortBehavior=value=>{const parts=value.split(';').map(x=>x.trim()).filter(Boolean);return parts.slice(0,3).join('; ')+(parts.length>3?'…':'')};
function render(){
  const q=document.querySelector('#trust-search').value.trim().toLowerCase(),kind=document.querySelector('#trust-kind').value;
  const rows=TRUST_DETAILS.filter(t=>{t.kind=classify(t.key);return(kind==='all'||t.kind===kind)&&`${t.name} ${t.job} ${t.acquisition} ${t.weaponSkills}`.toLowerCase().includes(q)});
  document.querySelector('#trust-count').textContent=`${rows.length} of ${TRUST_DETAILS.length}`;
  document.querySelector('#trust-grid').innerHTML=rows.map(t=>`<article class="trust-card"><small>${t.kind==='unity'?'Unity Concord':t.kind==='alternate'?'Alternate version':'Trust'}</small><h3>${t.name}</h3><b class="trust-job">${t.job||'Role not listed'}</b><code>/ma "${t.name}" &lt;me&gt;</code><details><summary>How to obtain</summary><p>${t.acquisition}</p></details><details><summary>Weapon skills & behavior</summary><p><strong>Weapon skills:</strong> ${t.weaponSkills||'None listed'}</p><p>${shortBehavior(t.behavior)}</p></details></article>`).join('')||'<p>No matching Trust.</p>';
}
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#trust-search').addEventListener('input',render);document.querySelector('#trust-kind').addEventListener('change',render);render()});
