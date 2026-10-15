(() => {
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('macro-targets.css?v=20261014-bt1',document.currentScript.src);document.head.append(style);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sequence=0;
  const generalTargets={attack:4,ra:4,assist:2,follow:2,check:20};
  const petTargets={fight:4,assault:4,heel:1,retreat:1,leave:1};
  function targetMask(line,action={}){
    const metadata=window.CRMacroTargetData||{};
    if(action.mask!=null)return Number(action.mask);
    if(action.id!=null&&metadata[action.kind]?.[action.id]!=null)return Number(metadata[action.kind][action.id]);
    const named=line.match(/^\/(ma|magic|ja|jobability|ws|weaponskill|pet)\s+"([^"]+)"/i);
    if(named){
      const kind=/^(ma|magic)$/i.test(named[1])?'spell':/^(ja|jobability)$/i.test(named[1])?'ability':/^(ws|weaponskill)$/i.test(named[1])?'weaponskill':'pet';
      return kind==='pet'?petTargets[named[2].toLowerCase()]:metadata.names?.[kind]?.[named[2].toLowerCase()];
    }
    const command=line.match(/^\/([a-z]+)\b/i)?.[1].toLowerCase();return generalTargets[command];
  }
  function variants(line,action={}){
    const token=line.match(/<(t|me|stpc|stnpc|bt)>/i);if(!token)return[{target:null,line,note:''}];
    const mask=targetMask(line,action);if(mask==null||mask===0)return[{target:token[1].toLowerCase(),line,note:''}];
    const players=mask&(2|8|16|32),conditional=mask&(128|512),enemy=mask&4;
    const allowed=[];
    if(players||conditional||enemy||(mask&64))allowed.push('t');
    if(players||conditional)allowed.push('stpc');
    // Friendly NPC flags also cover Trusts: do not add NPC selectors to player buffs.
    if(enemy||((mask&64)&&!players&&!conditional))allowed.push('stnpc');
    if(enemy)allowed.push('bt');
    if(mask&1)allowed.push('me');
    if(!allowed.length)return[{target:token[1].toLowerCase(),line,note:''}];
    return allowed.map(target=>({target,line:line.replace(token[0],`<${target}>`),note:target!=='me'&&!players&&conditional?(mask&128?'Requires Pianissimo.':'Requires Entrust.') : ''}));
  }
  function render(line,action={}){
    const rows=variants(line,action),original=line.match(/<(t|me|stpc|stnpc|bt)>/i)?.[1].toLowerCase();
    const active=rows.findIndex(row=>row.target===original),index=active<0?0:active,row=rows[index];
    const id=`macro-target-${++sequence}`;
    const tabs=rows.length>1?`<div class="macro-target-tabs" role="tablist" aria-label="Macro targets">${rows.map((r,i)=>`<button type="button" role="tab" id="${id}-${i}" aria-controls="${id}-line" aria-selected="${i===index}" tabindex="${i===index?0:-1}" data-target-line="${escape(r.line)}" data-target-note="${escape(r.note)}">${escape(`<${r.target}>`)}</button>`).join('')}</div>`:'';
    return `<div class="macro-target-choice">${tabs}<div id="${id}-line"${tabs?` role="tabpanel" aria-labelledby="${id}-${index}"`:''}><code data-macro-line>${escape(row.line)}</code><small class="macro-target-note" data-macro-note${row.note?'':' hidden'}>${escape(row.note)}</small><button class="copy-button" type="button" data-copy="${escape(row.line)}">Copy macro</button></div></div>`;
  }
  function bind(root=document){
    root.querySelectorAll('.macro-target-tabs').forEach(tabs=>{
      const buttons=[...tabs.querySelectorAll('[data-target-line]')],card=tabs.closest('.macro-target-choice');
      const select=button=>{
        buttons.forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
        card.querySelector('[data-macro-line]').textContent=button.dataset.targetLine;
        card.querySelector('[data-copy]').dataset.copy=button.dataset.targetLine;
        const note=card.querySelector('[data-macro-note]');note.textContent=button.dataset.targetNote;note.hidden=!button.dataset.targetNote;
        card.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby',button.id);
      };
      buttons.forEach((button,i)=>{
        button.addEventListener('click',()=>select(button));
        button.addEventListener('keydown',event=>{
          let next;if(event.key==='ArrowRight')next=(i+1)%buttons.length;else if(event.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
          event.preventDefault();select(buttons[next]);buttons[next].focus();
        });
      });
    });
  }
  window.CRMacroTargets={variants,render,bind};
})();
