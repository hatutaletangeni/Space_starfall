/* STARFALL 6E: keyboard remapping and invertible control axes. Pure, offline, no DOM. */
(function(root){'use strict';
const DEFAULTS=Object.freeze({
 thrust:'KeyW',brake:'KeyS',turnLeft:'KeyA',turnRight:'KeyD',pitchUp:'ArrowUp',pitchDown:'ArrowDown',
 rollLeft:'KeyQ',rollRight:'KeyE',ascend:'Space',descend:'KeyC',boost:'ShiftLeft',
 recenter:'KeyF',chart:'KeyM',align:'KeyG',time:'KeyT',lights:'KeyL',camera:'KeyV',terrain:'KeyH',
 scan1:'Digit1',scan2:'Digit2',scan3:'Digit3',reset:'KeyR',interact:'KeyX'
});
const OPTIONS=Object.freeze({lookInvertX:false,lookInvertY:false,flightPitchInvert:false,roverSteerInvert:false,lookSensitivity:1});
const LABELS=Object.freeze({thrust:'Forward / thrust',brake:'Reverse / brake',turnLeft:'Turn left',turnRight:'Turn right',pitchUp:'Flight nose up',pitchDown:'Flight nose down',rollLeft:'Roll left',rollRight:'Roll right',ascend:'Ascend / launch',descend:'Descend',boost:'Boost / sprint',recenter:'Centre camera',chart:'Star chart',align:'Align to target',time:'Time acceleration',lights:'Lights',camera:'Ship camera',terrain:'Terrain diagnostics',scan1:'Quick scan 1',scan2:'Quick scan 2',scan3:'Quick scan 3',reset:'Orbit reset (with Shift)',interact:'Interact / inspect relic'});
const BLOCKED=/^(?:Escape|Tab|Enter|Backspace|CapsLock|NumLock|ScrollLock|Pause|PrintScreen|MetaLeft|MetaRight|AltLeft|AltRight|ControlLeft|ControlRight|F\d{1,2})$/;
const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Arrow(?:Left|Right|Up|Down)|Shift(?:Left|Right)|Comma|Period|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Slash|Backslash|Backquote|Numpad[0-9])$/.test(code)&&!BLOCKED.test(code);
const plainObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
function sanitized(raw){const data=plainObject(raw)?raw:{};const settings={...OPTIONS,bindings:{...DEFAULTS}};
 for(const k of Object.keys(OPTIONS)){
  if(typeof OPTIONS[k]==='boolean'&&typeof data[k]==='boolean')settings[k]=data[k];
  else if(k==='lookSensitivity'&&Number.isFinite(data[k]))settings[k]=Math.max(.35,Math.min(2.5,data[k]));
 }
 // Persisted bindings are accepted only if unique; invalid or conflicting values revert to stock.
 if(plainObject(data.bindings)){
  const used=new Set();
  for(const action of Object.keys(DEFAULTS)){
   const candidate=data.bindings[action];
   if(allowed(candidate)&&!used.has(candidate)){settings.bindings[action]=candidate;used.add(candidate);}
   else {const fallback=DEFAULTS[action];if(!used.has(fallback)){settings.bindings[action]=fallback;used.add(fallback);}else{settings.bindings[action]=null;}}
  }
  // A stored collision can otherwise leave an action unbound. Resolve by resetting the preset.
  if(Object.values(settings.bindings).some(v=>v===null||Object.values(settings.bindings).filter(x=>x===v).length>1))settings.bindings={...DEFAULTS};
 }
 return settings;
}
function create(raw,keys=new Set()){
 let settings=sanitized(raw),physical=new Set(),touch=new Set();
 let onChange=()=>{};
 const resolve=code=>{for(const action of Object.keys(DEFAULTS))if(settings.bindings[action]===code)return DEFAULTS[action];
  // Arrow directions and right-hand shift remain fixed alternative keys for classic touch/keyboard support.
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftRight'].includes(code))return code;
  return null;
 };
 const update=()=>{keys.clear();for(const code of physical){const logical=resolve(code);if(logical)keys.add(logical);}for(const code of touch)keys.add(code);};
 const changed=()=>{update();onChange(api.export());};
 const api={
  keys,get settings(){return settings;},get onChange(){return onChange;},set onChange(fn){onChange=typeof fn==='function'?fn:()=>{};},
  resolve,press(code){if(!allowed(code))return false;physical.add(code);update();return !!resolve(code);},
  release(code){physical.delete(code);update();},touchDown(code){touch.add(code);update();},touchUp(code){touch.delete(code);update();},
  clear(){physical.clear();touch.clear();update();},
  export(){return JSON.parse(JSON.stringify(settings));},
  setOption(name,value){if(!(name in OPTIONS))throw Error('Unknown control option');
   if(name==='lookSensitivity'){if(!Number.isFinite(Number(value)))throw Error('Sensitivity must be finite');settings[name]=Math.min(2.5,Math.max(.35,Number(value)));}
   else settings[name]=!!value;changed();},
  rebind(action,code){if(!(action in DEFAULTS))throw Error('Unknown action');if(!allowed(code))throw Error('Reserved or unsupported key');
   if(Object.entries(settings.bindings).some(([name,current])=>name!==action&&current===code))throw Error(code+' is already assigned to another control');
   // Arrow and shift secondary paths are shared with mobile and ship flight; cannot bind these to unrelated actions.
   if((code.startsWith('Arrow')||code.startsWith('Shift'))&&DEFAULTS[action]!==code)throw Error('Arrow/Shift keys are reserved as secondary movement controls');
   settings.bindings[action]=code;changed();},
  reset(){settings=sanitized(null);changed();},
  classic(){settings={...sanitized(null),lookSensitivity:1};changed();},
  signedDrag(dx,dy){const sx=(settings.lookInvertX?-1:1)*settings.lookSensitivity,sy=(settings.lookInvertY?-1:1)*settings.lookSensitivity;return{dx:dx*sx,dy:dy*sy};},
  flightPitch(value){return settings.flightPitchInvert?-value:value;},roverYaw(value){return settings.roverSteerInvert?-value:value;}
 };
 return api;
}
root.StarfallControls={DEFAULTS,OPTIONS,LABELS,sanitize:sanitized,create};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallControls;
})(globalThis);
