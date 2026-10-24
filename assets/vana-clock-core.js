/* Shared Vana'diel clock model; same epoch and calendar as the existing hero clock. */
(function(root){
  'use strict';
  const epoch=1009810800;
  const days=['Firesday','Earthsday','Watersday','Windsday','Iceday','Lightningday','Lightsday','Darksday'];
  const elements=['Fire','Earth','Water','Wind','Ice','Lightning','Light','Dark'];
  function snapshot(now=Date.now()){
    const elapsedMinutes=((now/1000)-epoch)/60*25;
    const exactMinutes=elapsedMinutes+886*518400;
    const minutes=Math.floor(elapsedMinutes)+886*518400,dayIndex=((Math.floor(minutes/1440)%8)+8)%8;
    const minuteOfDay=((minutes%1440)+1440)%1440;
    return {minutes,dayIndex,day:days[dayIndex],element:elements[dayIndex],
      year:Math.floor(minutes/518400),month:Math.floor(minutes/43200)%12+1,date:Math.floor(minutes/1440)%30+1,
      hour:Math.floor(minuteOfDay/60),minute:minuteOfDay%60,
      untilNextDay:Math.ceil((1440-((exactMinutes%1440+1440)%1440))*60/25),nextDay:days[(dayIndex+1)%8]};
  }
  const api=Object.freeze({epoch,days,elements,snapshot});
  root.CurrentRealityVanaClock=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
