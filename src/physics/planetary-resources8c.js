/* STARFALL Update 8C — deterministic, finite composition-derived prospecting.
 * CW01 is bulk authority, CW03 lithology is the local interpretation.
 * Original deposits never mutate planets, terrain, star maps or caches.
 * This file does not mint inventory: 8D must implement extraction and hauling.
 */
(function(root){'use strict';
const VERSION=1,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const copy=x=>JSON.parse(JSON.stringify(x));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function unit(key){let v=hash(key);v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return ((v^(v>>>16))>>>0)/4294967296;}
function norm(dir){if(!Array.isArray(dir)||dir.length!==3||!dir.every(Number.isFinite))throw Error('8C requires finite planet-fixed position');const l=Math.hypot(...dir);if(!(l>1e-8))throw Error('8C invalid radial direction');return dir.map(n=>n/l);}
function tiles(dir){const d=norm(dir),lat=Math.asin(clamp(d[1],-1,1)),lon=Math.atan2(d[2],d[0]);return {lat:clamp(Math.floor((lat+Math.PI/2)/Math.PI*48),0,47),lon:((Math.floor((lon+Math.PI)/TAU*96)%96)+96)%96};}
function center(lat,lon){const phi=(lat+.5)/48*Math.PI-Math.PI/2,theta=(lon+.5)/96*TAU-Math.PI;return [Math.cos(phi)*Math.cos(theta),Math.sin(phi),Math.cos(phi)*Math.sin(theta)];}
function composition(body,seed){const c=root.StarfallCompositionCW01;if(!c?.bodyFor)throw Error('CW01 composition authority not loaded');return c.bodyFor(body,seed);}
const TYPES=Object.freeze([
 {id:'iron_ore',label:'Iron-bearing rock',family:'metal',min:.035,grade:[.08,.52]},
 {id:'aluminum_ore',label:'Aluminosilicate ore',family:'silicate',min:.12,grade:[.12,.37]},
 {id:'copper_ore',label:'Copper-bearing sulfides',family:'metal',min:.09,grade:[.005,.07]},
 {id:'titanium_ore',label:'Titanium-bearing minerals',family:'metal',min:.12,grade:[.008,.12]},
 {id:'silica',label:'Silica / quartz-bearing rock',family:'silicate',min:.03,grade:[.35,.94]},
 {id:'regolith',label:'Unconsolidated regolith',family:'rock',min:.01,grade:[.45,.96]},
 {id:'carbon_feed',label:'Carbon-bearing material',family:'carbon',min:.04,grade:[.04,.34]},
 {id:'sulfides',label:'Sulfur-bearing minerals',family:'sulfur',min:.05,grade:[.01,.31]},
 {id:'water_ice',label:'Water ice / hydrated minerals',family:'water',min:.02,grade:[.08,.88]},
 {id:'trace_minerals',label:'Trace accessory minerals',family:'metal',min:.17,grade:[.001,.015]}
]);
function candidates(body,c){
 const b=c.bulkComponentMassFractions||{},m=c.majorMaterialMassFractions||{};
 const metal=b.metal||0,sil=b.silicate||0,water=m.H2O||0,vol=b.volatile||0;
 const eligible={
  iron_ore:metal>.055,aluminum_ore:sil>.26,copper_ore:metal>.105,
  titanium_ore:metal>.145,silica:sil>.1,regolith:sil>.08,
  carbon_feed:vol>.07||c.atmosphereMoleFractions?.CO2>.3,
  sulfides:metal>.13&&body.type!=='Ice'||body.type==='Volcanic',
  water_ice:water>.025,trace_minerals:metal>.2
 };
 return TYPES.filter(t=>eligible[t.id]);}
function site(body,dir,seed=742){
 if(!body||!validId(body.id)||!body.landable||!['planet','moon'].includes(body.kind))return null;
 const c=composition(body,seed),t=tiles(dir),local=center(t.lat,t.lon),key='8c:'+VERSION+':'+seed+':'+body.id+':'+t.lat+':'+t.lon;
 const choices=candidates(body,c);if(!choices.length)return null;
 const index=Math.floor(unit(key+':kind')*choices.length),type=choices[index];
 // Some potential sites contain no reachable resource, rather than uniformly valuable terrain.
 if(unit(key+':occurrence')<.13)return null;
 const lith=root.StarfallGeologyCW03?.lithology(body,local,0,.5);
 const name=lith?.name||'unknown',match=(type.id==='iron_ore'&&name==='ironRich')||(type.id==='sulfides'&&name==='sulfur')||
  (type.id==='silica'&&name==='silicate')||(type.id==='regolith'&&name==='regolith');
 const richness=unit(key+':richness'),regional=match?1.5:1;
 const grade=clamp((type.grade[0]+(type.grade[1]-type.grade[0])*richness)*regional,0,1);
 const radiusScene=6+unit(key+':radius')*17;
 const thicknessM=1.5+unit(key+':thickness')*27;
 const depthM=unit(key+':depth')*(body.type==='Ice'?16:42);
 // Accessible excavated material, not a planetary bulk metal reserve.
 const density=type.id==='water_ice'?850:type.id==='regolith'?1600:2300;
 const massKg=Math.round(Math.PI*Math.pow(radiusScene*1000,2)*thicknessM*density*.002*(.15+.4*unit(key+':access')));
 const deposit={id:key,model:VERSION,bodyId:body.id,seed,local,cell:{lat:t.lat,lon:t.lon},
  type:type.id,label:type.label,hostRock:name,grade,depthMinM:Math.round(depthM*10)/10,
  depthMaxM:Math.round((depthM+thicknessM)*10)/10,radiusScene,
  accessibleMassKg:massKg,phase:type.id==='water_ice'?'solid or hydrated (phase not field-measured)':'solid',
  provenance:'CW01 bulk + CW03 local lithology + deterministic 8C interpretation',uncertainty:'high'};
 return Object.freeze(deposit);
}
function neighbors(body,dir,seed=742,range=1){
 const t=tiles(dir),out=[];for(let dl=-range;dl<=range;dl++)for(let dn=-range;dn<=range;dn++){
  const lat=t.lat+dl;if(lat<0||lat>47)continue;
  const lon=(t.lon+dn+96)%96,p=site(body,center(lat,lon),seed);if(p)out.push(p);
 }return out;}
function create(saved){
 if(saved!=null&&(saved.schema!==1||!Array.isArray(saved.depletions)||!Array.isArray(saved.surveys)||!Array.isArray(saved.transactions)))throw Error('Unsupported 8C geology save');
 const used=new Map(),observations=new Map(),transactions=new Map();
 if(saved){for(const x of saved.depletions){
   if(!validId(x.id)||!finite(x.massKg)||used.has(x.id))throw Error('Corrupt 8C depletion');
   used.set(x.id,x.massKg);
  }for(const x of saved.surveys){
   if(!validId(x.id)||!validId(x.siteId)||!validId(x.bodyId)||observations.has(x.id)||!finite(x.timeS))throw Error('Corrupt 8C survey');
   observations.set(x.id,copy(x));
  }for(const x of saved.transactions){
   if(!validId(x.id)||!validId(x.siteId)||!finite(x.massKg)||transactions.has(x.id))throw Error('Corrupt 8C extraction receipt');
   transactions.set(x.id,copy(x));
  }
 }
 function remaining(deposit){if(!deposit||!validId(deposit.id)||!finite(deposit.accessibleMassKg))throw Error('Invalid deposit');return Math.max(0,deposit.accessibleMassKg-(used.get(deposit.id)||0));}
 function survey(deposit,timeS,instrument='EVA field spectrometer'){
  if(!deposit||!validId(deposit.id)||!validId(deposit.bodyId)||!finite(timeS))throw Error('Invalid survey');
  if(!['EVA field spectrometer','rover spectrometer'].includes(instrument))throw Error('Survey instrument uncalibrated');
  const id='8c-survey:'+deposit.id+':'+instrument;
  if(observations.has(id))return copy(observations.get(id));
  const confidence=instrument==='rover spectrometer'?.65:.75;
  const record={id,siteId:deposit.id,bodyId:deposit.bodyId,timeS,instrument,
   interpretedType:deposit.type,gradeBand:deposit.grade<.08?'low':deposit.grade<.32?'moderate':'high',
   estimatedAccessibleMassBand:deposit.accessibleMassKg<1e9?'localized':deposit.accessibleMassKg<1e11?'regional':'extensive',
   confidence,uncertainty:'high; modeled regional estimate, not proven ore reserve'};
  observations.set(id,record);return copy(record);
 }
 function extract(deposit,massKg,receipt){
  if(!deposit||!validId(deposit.id)||!finite(massKg)||massKg<=0||
    !receipt||!validId(receipt.id)||receipt.depositId!==deposit.id||
    !validId(receipt.destinationContainerId)||receipt.status!=='COMMITTED')
    throw Error('8C requires documented committed physical extraction');
  const old=transactions.get(receipt.id);
  if(old){if(old.siteId!==deposit.id||old.massKg!==massKg)throw Error('Extraction receipt collision');return copy(old);}
  if(massKg>remaining(deposit)+1e-8)throw Error('Deposit depleted: insufficient accessible mass');
  const record={id:receipt.id,siteId:deposit.id,massKg,destinationContainerId:receipt.destinationContainerId,provenance:'8D externally accounted extraction'};
  used.set(deposit.id,(used.get(deposit.id)||0)+massKg);transactions.set(receipt.id,record);return copy(record);
 }
 function serialize(){return{schema:1,depletions:[...used].map(([id,massKg])=>({id,massKg})),
  surveys:[...observations.values()].map(copy),transactions:[...transactions.values()].map(copy)};}
 return Object.freeze({remaining,survey,extract,serialize,
  observations:()=>[...observations.values()].map(copy),depleted:()=>[...used].map(([id,massKg])=>({id,massKg}))});
}
root.StarfallResources8C=Object.freeze({VERSION,TYPES,tiles,center,site,neighbors,composition,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallResources8C;
})(globalThis);
