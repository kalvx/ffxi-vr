(function(){
  'use strict';
  const data=window.CurrentRealityCraftingCompass,clock=window.CurrentRealityVanaClock;
  const crystal=document.querySelector('#compass-crystal'),weather=document.querySelector('#compass-weather'),follow=document.querySelector('#compass-follow');
  if(!data||!clock||!crystal)return;
  const $=id=>document.getElementById(id);
  let mode='safe';
  crystal.innerHTML=data.elements.map((e,i)=>`<option value="${i}">${e.name} Crystal</option>`).join('');
  $('direction-table').innerHTML=data.elements.map((e,i)=>`<tr><td><span style="color:${data.colors[i]}">◆</span> ${e.name}</td><td>${data.directions[e.safe]}</td><td>${data.directions[e.risky]}</td></tr>`).join('');
  function render(){
    const now=clock.snapshot();
    if(follow.checked)crystal.value=String(data.weekday_elements[now.dayIndex]);
    const selected=Number(crystal.value),info=data.elements[selected],observed=Number(weather.value);
    const dayMatch=data.weekday_elements[now.dayIndex]===selected;
    const weatherMatch=observed>=4&&data.weather_elements[observed]===selected;
    const strength=weatherMatch?(observed%2?2:1):0;
    const points=(mode==='safe'?data.safe_success_points:data.risky_success_points)+(dayMatch?data.matching_day_success_points:0)+data.weather_success_points[strength];
    const multiplier=(mode==='risk'?data.risky_multiplier:1)*(dayMatch?data.matching_day_multiplier:1)*data.weather_multipliers[strength];
    $('compass-time').textContent=`${String(now.hour).padStart(2,'0')}:${String(now.minute).padStart(2,'0')}`;
    $('compass-date').textContent=`${now.year}/${String(now.month).padStart(2,'0')}/${String(now.date).padStart(2,'0')}`;
    $('compass-day').textContent=now.day;
    $('compass-day-element').textContent=`${now.element} alignment`;
    $('compass-next-day').textContent=`${now.nextDay} in ${Math.floor(now.untilNextDay/60)}:${String(now.untilNextDay%60).padStart(2,'0')}`;
    $('selected-element').textContent=info.name;
    $('selected-crystal').textContent=`${info.name} Crystal`;
    $('safe-direction').textContent=data.directions[info.safe];$('risk-direction').textContent=data.directions[info.risky];
    $('alignment-day').textContent=dayMatch?`${now.day}: matching day bonus`:`${now.day}: no matching day bonus`;
    $('alignment-day').dataset.match=String(dayMatch);
    $('alignment-weather').textContent=weatherMatch?`Selected observation: matching ${strength===2?'double':'single'} weather`:'Selected observation: no matching weather bonus';
    $('alignment-weather').dataset.match=String(weatherMatch);
    $('success-adjustment').textContent=`${points>=0?'+':''}${points} percentage points`;
    $('chance-multiplier').textContent=`×${Number(multiplier.toFixed(5))}`;
    document.querySelectorAll('.direction-mode').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
    document.querySelectorAll('.element-gem').forEach(g=>{const index=Number(g.dataset.element);g.classList.toggle('is-selected',index===selected);g.classList.toggle('is-today',index===data.weekday_elements[now.dayIndex]);g.style.opacity=index===selected?'1':'.65';});
    for(const [name,sector,r]of[['safe',info.safe,330],['risk',info.risky,230]]){
      const angle=sector*Math.PI/4,x=600+r*Math.cos(angle),y=560+r*Math.sin(angle);
      $(`${name}-ray`).setAttribute('d',`M600 560 L${x.toFixed(2)} ${y.toFixed(2)}`);
      $(`${name}-ray`).style.opacity=mode===name?'.95':'.25';
    }
    $('compass-release').textContent=data.releaseState==='installed'?`Current Reality custom rules · crcrafting client update ${data.clientVersion}`:'Preview · server update in preparation';
  }
  crystal.addEventListener('change',()=>{follow.checked=false;render();});
  weather.addEventListener('change',render);follow.addEventListener('change',render);
  document.querySelectorAll('.direction-mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));
  render();setInterval(render,1000);
})();
