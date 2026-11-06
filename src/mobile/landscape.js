/* Standalone-only mobile action adapter: calls the original game's keyboard action handlers.
   Held movement keys remain bound by src/flight.js via existing data-control="..." buttons. */
(function(){'use strict';
 const hud=document.getElementById('sfmobile-hud');if(!hud)return;
 const codeKeys={KeyX:'x',KeyB:'b',KeyI:'i',KeyV:'v',KeyT:'t',KeyG:'g',KeyL:'l',KeyF:'f',KeyM:'m'};
 function pressAction(code){
  if(!Object.hasOwn(codeKeys,code))return;
  const opts={bubbles:true,cancelable:true,code,key:codeKeys[code]};
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
