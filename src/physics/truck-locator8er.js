/* 8E-R real truck directional beacon. No terrain scan, world movement or asset spawning. */
(function(root){'use strict';
const el=document.createElement('aside');
el.id='sf-truck-locator8er';el.hidden=true;el.setAttribute('role','status');
el.setAttribute('aria-label','Original truck location');
el.innerHTML='<span class="sf-truck-arrow" aria-hidden="true">▲</span><span class="sf-truck-details"><b>EXPEDITION TRUCK</b><small>Locating original vehicle</small></span>';
document.body.append(el);
const arrow=el.querySelector('.sf-truck-arrow'),details=el.querySelector('small');
let last=0;
function tick(now){
 requestAnimationFrame(tick);
 if(now-last<250)return;last=now;
 const rt=root.StarfallRuntime;
 if(!rt?.truckLocator8ER||rt.truckOccupied){el.hidden=true;return;}
 let p;try{p=rt.truckLocator8ER();}catch(e){el.hidden=true;return;}
 el.hidden=!p||p.status==='MISSING';
 if(el.hidden)return;
 const active=p.status==='SURFACE';
 arrow.hidden=!active;
 if(active){
  const direction=Math.round(p.bearingRad*180/Math.PI);
  arrow.style.transform='rotate('+direction+'deg)';
  details.textContent=p.distanceScene+' scene units · '+(p.atWater?'WATER / SHORE · ':'')+'FOLLOW ARROW';
 }else details.textContent=p.label;
}
requestAnimationFrame(tick);
})(globalThis);
