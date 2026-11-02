/* STARFALL 6E: minimal accessible keybinding settings. Loaded after flight. */
(function(root){'use strict';
const $=id=>document.getElementById(id),input=root.StarfallInput,defs=root.StarfallControls;
if(!input||!$('controls-open')||!$('controls-modal'))return;
const modal=$('controls-modal'),rows=$('control-bindings'),status=$('controls-status');
let capturing=null;
const nice=s=>s?.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Arrow/,'↑↓←→ ').replace('ShiftLeft','Shift').replace('Space','SPACE')||'—';
function alertStatus(message,error=false){status.textContent=message;status.style.color=error?'#ffb5a2':'#d8b786';}
function render(){const s=input.settings;for(const option of Object.keys(defs.OPTIONS)){const el=$('control-'+option);if(!el)continue;el.type=option==='lookSensitivity'?'range':'checkbox';if(el.type==='checkbox')el.checked=!!s[option];else{el.value=s[option];$('control-sensitivity-number').textContent=Number(s[option]).toFixed(2)+'×';}}
 rows.replaceChildren();for(const [name,code] of Object.entries(s.bindings)){
  const row=document.createElement('div');row.className='controls-binding-row';const label=document.createElement('span');label.textContent=defs.LABELS[name];
  const button=document.createElement('button');button.type='button';button.className='science-action';button.textContent=nice(code);button.dataset.action=name;button.setAttribute('aria-label','Rebind '+defs.LABELS[name]);
  button.onclick=()=>{capturing=name;button.textContent='PRESS KEY…';alertStatus('Press a new key for '+defs.LABELS[name]+' (Esc to cancel)');};row.append(label,button);rows.append(row);
 }
 const mode=root.StarfallRuntime?.roverOccupied?'ROVER':root.StarfallRuntime?.eva?'EVA':root.StarfallRuntime?.landed?'LANDED SHIP':'SPACECRAFT';$('control-context').textContent='CURRENT MODE: '+mode+'. Arrow keys remain available as secondary movement/pitch controls. Boarding still works through physical proximity.';
}
function show(){input.clear();modal.hidden=false;capturing=null;render();alertStatus('Controls are saved automatically.');$('controls-close').focus();}
function close(){capturing=null;modal.hidden=true;input.clear();}
$('controls-open').addEventListener('click',show);
$('controls-close').addEventListener('click',close);
modal.addEventListener('click',e=>{if(e.target===modal)close();});
for(const option of Object.keys(defs.OPTIONS)){
 $('control-'+option).addEventListener(option==='lookSensitivity'?'input':'change',e=>{try{input.setOption(option,e.target.type==='checkbox'?e.target.checked:Number(e.target.value));render();}catch(err){alertStatus(err.message,true);}});
}
$('control-reset').onclick=()=>{input.reset();render();alertStatus('Defaults restored.');};
$('control-classic').onclick=()=>{input.classic();render();alertStatus('Original Starfall controls restored.');};
// Capture-phase handler prevents the flight keydown shortcut listener from consuming a remap.
window.addEventListener('keydown',e=>{
 if(modal.hidden)return;
 if(capturing){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){capturing=null;render();alertStatus('Rebinding cancelled.');return;}
  try{input.rebind(capturing,e.code);capturing=null;render();alertStatus('Key updated and saved.');}catch(err){render();capturing=null;alertStatus(err.message,true);}return;
 }
 if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
},true);
window.StarfallControlUI={show,close,render};
})(globalThis);
