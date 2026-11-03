/* STARFALL 8E: stable ship architecture and interior deck plan.
   Do not duplicate 6E vehicle components, T02 energy, T15 devices, T10 research
   or 8A custody. This is a strict structural/module overlay and functional link.
   All masses/rates are illustrative engineering game profiles, not certified hardware. */
(function(root){'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const MODULES=Object.freeze({
 bridge:{name:'Command and navigation',deck:'upper',slot:'avionics',massKg:8500,levels:3,upgrade:{aluminum_ore:500,copper_ore:100}},
 cargo:{name:'Internal vehicle cargo hold',deck:'cargo',slot:null,massKg:12800,levels:3,upgrade:{aluminum_ore:1200,iron_ore:1300}},
 life:{name:'Life support and atmosphere',deck:'middle',slot:null,massKg:5600,levels:3,upgrade:{water_ice:320,copper_ore:160}},
 solar:{name:'Deployable solar arrays',deck:'upper',slot:'solar',massKg:2400,levels:3,upgrade:{aluminum_ore:450,copper_ore:110}},
 thermal:{name:'Thermal radiators',deck:'upper',slot:'radiator',massKg:3800,levels:3,upgrade:{aluminum_ore:400,copper_ore:130}},
 science:{name:'Scientific analysis laboratory',deck:'middle',slot:'instruments',massKg:4700,levels:3,upgrade:{silica:250,copper_ore:100}},
 fabrication:{name:'Workshop and assembly',deck:'lower',slot:null,massKg:6200,levels:3,upgrade:{iron_ore:600,aluminum_ore:400}},
 habitat:{name:'Crew habitat',deck:'middle',slot:null,massKg:4300,levels:3,upgrade:{aluminum_ore:340,water_ice:200}},
 power:{name:'DC power and storage',deck:'lower',slot:'battery',massKg:5100,levels:3,upgrade:{copper_ore:300,aluminum_ore:350}},
 docking:{name:'Docking and service collar',deck:'upper',slot:'docking',massKg:1750,levels:3,upgrade:{iron_ore:270,copper_ore:80}}
});
const ROOMS=Object.freeze([
 {id:'bridge',label:'Command Bridge',deck:'upper',x:0,y:8,z:-38,w:9,l:17,module:'bridge'},
 {id:'science',label:'Science Laboratory',deck:'middle',x:-13,y:3,z:-16,w:11,l:19,module:'science'},
 {id:'habitat',label:'Habitation and Medical',deck:'middle',x:13,y:3,z:-16,w:11,l:19,module:'habitat'},
 {id:'life',label:'Life Support',deck:'middle',x:-13,y:3,z:9,w:11,l:16,module:'life'},
 {id:'power',label:'Power Distribution',deck:'lower',x:13,y:-4,z:-19,w:11,l:16,module:'power'},
 {id:'fabrication',label:'Fabrication Workshop',deck:'lower',x:-13,y:-4,z:12,w:11,l:17,module:'fabrication'},
 {id:'cargo',label:'Vehicle Cargo Bay',deck:'cargo',x:16.5,y:-1.2,z:5,w:14.5,l:28,module:'cargo'},
 {id:'engineering',label:'Propulsion and Thermal',deck:'lower',x:0,y:-4,z:31,w:11,l:17,module:'thermal'}
]);
const INITIAL=Object.freeze(Object.fromEntries(Object.keys(MODULES).map(id=>[id,1])));
function restore(saved){
 if(saved!=null&&(!saved||saved.schema!==1||!saved.levels||typeof saved.levels!=='object'||!Array.isArray(saved.transactions)))throw Error('Unsupported modular ship save');
 const levels={...INITIAL},transactions=new Map();
 if(saved){
  for(const id of Object.keys(MODULES)){
   const level=saved.levels[id];if(!Number.isInteger(level)||level<1||level>MODULES[id].levels)throw Error('Invalid ship module level: '+id);
   levels[id]=level;
  }
  for(const t of saved.transactions){if(!t||typeof t.id!=='string'||transactions.has(t.id)||!MODULES[t.module])throw Error('Invalid ship upgrade transaction');transactions.set(t.id,copy(t));}
 }
 const mass=()=>Object.entries(MODULES).reduce((total,[id,m])=>total+m.massKg*(1+.22*(levels[id]-1)),0);
 function snapshot(){return {schema:1,levels:{...levels},transactions:[...transactions.values()].map(copy)};}
 function describe(id,vehicles){const m=MODULES[id];if(!m)throw Error('Unknown ship module');
  const v=m.slot?vehicles?.get?.('ship'):null;
  const activePart=m.slot?v?.definition?.slots?.[m.slot]||'none':null;
  return {id,name:m.name,deck:m.deck,level:levels[id],maxLevel:m.levels,
   engineeringComponent:activePart,upgradeCost:levels[id]<m.levels?copy(m.upgrade):null,
   massKg:m.massKg*(1+.22*(levels[id]-1)),status:'INSTALLED'};
 }
 function upgrade(id,receipt){
  if(!MODULES[id])throw Error('Unknown ship module');
  if(levels[id]>=MODULES[id].levels)throw Error('Ship module already at maximum');
  // Receipt must come from verified physical manufacturing. UI never bypasses it.
  if(!receipt||typeof receipt.id!=='string'||!receipt.id||receipt.module!==id||
   receipt.status!=='COMMITTED'||receipt.fromLevel!==levels[id]||
   !receipt.materialsConsumed||typeof receipt.materialsConsumed!=='object')throw Error('Physical manufacturing receipt required');
  const old=transactions.get(receipt.id);if(old)return copy(old);
  for(const [mat,kg] of Object.entries(MODULES[id].upgrade)){
   if(!finite(receipt.materialsConsumed[mat])||receipt.materialsConsumed[mat]+1e-6<kg)throw Error('Manufacturing input shortfall: '+mat);
  }
  levels[id]++;
  const transaction={id:receipt.id,module:id,level:levels[id],status:'COMMITTED'};
  transactions.set(receipt.id,transaction);return copy(transaction);
 }
 const list=v=>Object.keys(MODULES).map(id=>describe(id,v));
 return Object.freeze({list,describe,mass,upgrade,snapshot,rooms:()=>copy(ROOMS)});
}
root.StarfallModularShip8E=Object.freeze({MODULES,ROOMS,restore});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallModularShip8E;
})(typeof globalThis!=='undefined'?globalThis:this);
