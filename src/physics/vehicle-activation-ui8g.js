/* 8G: Engineer activation of one already manufactured and paid physical chassis.
 * Low-speed sandbox engineering prototype, not automotive certification.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Engineer"]');
if(!host||!root.StarfallVehicleActivation8G)return;
const section=document.createElement('section');section.id='vehicle-activation8g';section.className='section';
const title=document.createElement('div');title.className='section-title';title.textContent='8G · MANUFACTURED VEHICLE ACTIVATION';
const note=document.createElement('p');note.className='panel-note';
note.textContent='Paid low-speed prototype calibration. Requires the complete manufactured brake, steering, motor, chassis and wheel receipt, intact frame, original assembly pad, EVA nearby and 2.5 MJ ship battery. The factory-built vehicle is a separate physical asset; the original expedition truck is never replaced.';
const selector=document.createElement('select');selector.setAttribute('aria-label','Select physical manufactured vehicle');
selector.style.cssText='background:#111c26;color:#eaf0ef;border:1px solid #78868b;padding:8px;max-width:100%';
const button=document.createElement('button');button.type='button';button.className='science-action';
button.textContent='CALIBRATE & CHARGE (2.5 MJ)';
const status=document.createElement('p');status.className='panel-note';status.setAttribute('role','status');
status.textContent='Select a surface frame built from real 8F parts. Activation produces a gameplay prototype, not real-world road certification.';
section.append(title,note,selector,button,status);host.append(section);
function refresh(){
 const rt=root.StarfallRuntime,c=rt?.assemblyContext8G?.();
 if(!c)return;
 const frames=(rt.physical8a?.list()||[]).filter(x=>x.type==='vehicle_frame'&&
  x.location.kind==='surface'&&x.location.bodyId===c.bodyId);
 const signature=frames.map(x=>x.id+':'+!!x.state?.operational).join('|');
 if(selector.dataset.signature!==signature){const old=selector.value;selector.replaceChildren();
  for(const a of frames){const opt=document.createElement('option');opt.value=a.id;
   opt.textContent=a.id+(a.state?.operational?' · OPERATIONAL PROTOTYPE':' · UNCALIBRATED FRAME');selector.append(opt);}
  if(frames.some(x=>x.id===old))selector.value=old;selector.dataset.signature=signature;}
 const chosen=frames.find(x=>x.id===selector.value);
 button.disabled=!chosen||!!chosen.state?.operational||!c.landed||!c.eva||!c.powered||
  c.energyJ<root.StarfallVehicleActivation8G.WORK_J;
}
button.addEventListener('click',()=>{try{const a=root.StarfallRuntime.activateManufactured8G(selector.value);
 status.textContent='ACTIVATED: '+a.id+' · a unique physically built low-speed sandbox prototype. Walk beside it and press X to board, WASD drive, SPACE brake, X exit.';
 }catch(e){status.textContent='BLOCKED: '+String(e.message||e);}refresh();});
selector.addEventListener('change',refresh);
let last=0;function tick(time){if(time-last>900){last=time;refresh();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
root.StarfallVehicleActivationUI8G={refresh};
})(globalThis);
