/* Standalone-only mobile action adapter: calls the original game's keyboard action handlers.
   Held movement keys remain bound by src/flight.js via existing data-control="..." buttons. */
(function(){'use strict';
 const hud=document.getElementById('sfmobile-hud');if(!hud)return;
 const bayHint=document.createElement('div');
 bayHint.id='sfm-vehicle-bay-hint';
 bayHint.setAttribute('role','status');
 bayHint.hidden=true;
 hud.append(bayHint);
 function updateBayHint(){
  const runtime=window.StarfallRuntime;
  if(!runtime){bayHint.hidden=true;return;}
  let message='';
  if(runtime.shipWalking8e){
   const at=runtime.shipWalkAt8e;
   if(at&&window.StarfallShipWalk8E?.room(at.x,at.z)==='cargo'){
    const cargo=runtime.cargo8b;
    const near=window.StarfallShipWalk8E?.nearVehicleBayTruck(at.x,at.z,cargo.pose.x,cargo.pose.z);
    message=near?(cargo.mode==='ground'?'TRUCK OUTSIDE · Exit via crew ramp':'VEHICLE BAY · TAP X TO BOARD TRUCK'):
     'VEHICLE BAY · MOVE CLOSER TO PARKED TRUCK';
   }else message='SHIP INTERIOR · WALK AFT THROUGH CENTRE CORRIDOR, THEN TURN RIGHT INTO VEHICLE BAY';
  }else if(runtime.truckOccupied&&runtime.cargo8b?.mode==='ramp')
   message='TRUCK BOARDED · HOLD ▼ TO REVERSE DOWN WIDE RAMP';
  bayHint.hidden=!message;bayHint.textContent=message;
 }
 setInterval(updateBayHint,350);
 const codeKeys={KeyX:'x',KeyB:'b',KeyI:'i',KeyV:'v',KeyT:'t',KeyG:'g',KeyL:'l',KeyF:'f',KeyM:'m'};
 function pressAction(code){
  if(!Object.hasOwn(codeKeys,code))return;
  const defaults=window.StarfallControls?.DEFAULTS||{};
  const action=Object.keys(defaults).find(name=>defaults[name]===code);
  const mapped=action&&window.StarfallInput?.settings?.bindings?.[action];
  const actual=typeof mapped==='string'?mapped:code;
  const actualKey=/^Key[A-Z]$/.test(actual)?actual.slice(3).toLowerCase():codeKeys[code];
  const opts={bubbles:true,cancelable:true,code:actual,key:actualKey};
  window.dispatchEvent(new KeyboardEvent('keydown',opts));
  window.dispatchEvent(new KeyboardEvent('keyup',opts));
 }
 const actions={
  menu:()=>document.getElementById('ui-console-open')?.click(),
  engineer:()=>{const nav=document.querySelector('#sf-console-nav [data-route="Engineer"]');
   if(nav){nav.click();document.getElementById('panel')?.classList.remove('collapsed');}
   else document.getElementById('ui-console-open')?.click();},
  map:()=>document.getElementById('chart-open')?.click(),
  save:()=>document.getElementById('archive-t17-open')?.click(),
  tools:()=>document.getElementById('ui-tools-toggle')?.click(),
  hide:()=>{const hidden=hud.classList.toggle('sfm-compact');const b=hud.querySelector('[data-mobile-action="hide"]');
   b.setAttribute('aria-pressed',String(hidden));b.textContent=hidden?'SHOW':'HIDE';}
 };
 function activate(button){
  if(button.dataset.mobileKey)pressAction(button.dataset.mobileKey);
  else actions[button.dataset.mobileAction]?.();
 }
 hud.querySelectorAll('[data-mobile-key],[data-mobile-action]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{if(event.button!==0&&event.pointerType==='mouse')return;
   event.preventDefault();event.stopPropagation();activate(button);button.classList.add('pressed');
  },{passive:false});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>button.classList.remove('pressed'));
  button.addEventListener('click',event=>{event.preventDefault();if(event.detail===0)activate(button);});
 });
 document.addEventListener('contextmenu',event=>{
  if(event.target.closest?.('#sfmobile-hud,button,[role="button"]'))event.preventDefault();
 });
 document.addEventListener('selectstart',event=>{
  if(event.target.closest?.('button,a,[role="button"],#sfmobile-hud'))event.preventDefault();
 });
})();
