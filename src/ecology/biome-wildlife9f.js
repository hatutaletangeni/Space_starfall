/* STARFALL Update 9F: deterministic, bounded biome-wide wildlife encounters.
 * This is a streamed VISUAL ENCOUNTER LAYER, not a new biological stock ledger.
 * Spawning is conditional on the authoritative 9A world viability gate and
 * actual 6B biome material; no organism grants resources or alters global gas.
 * The 9A population patches remain the only metabolic source of truth.
 */
(function(root){'use strict';
 const E=root.StarfallEcology,ST=root.StarfallStableTerrain,B=root.StarfallBiomes;
 if(!E||!ST||!B)throw Error('9F wildlife needs planet-fixed ecology, terrain and biomes');
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function random(s){let x=hash(s);x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;}
 function chooseRole(world,biome,id){
  if(biome.material==='water'){
   if(world.level<2||world.waterPotential<=.3)return null;
   return random(id+':water')<.17&&world.level>=4?'aquatic_predator':'filterer';
  }
  // No complex land animals in bare rock, salt pans or lifeless dunes.
  if(world.level<3||!biome.lifePotential)return null;
  const r=random(id+':role'),air=world.pressurePa>=22000;
  if(r<.10&&world.level>=4)return'predator';
  if(r<.27&&air)return'flier';
  if(r<.40)return'detritivore';
  return'grazer';
 }
 function cellPlan(body,cell,terrain,seed,world){
  const key=String(seed)+':'+body.id+':9f:'+cell.face+':'+cell.ix+':'+cell.iy;
  const anchor=E.cellDirection(cell),jX=(random(key+':jX')-.5)*16,jZ=(random(key+':jZ')-.5)*16;
  const local=E.offset(anchor,jX,jZ,body.radius),s=terrain(body,local);
  const biome=B.classify(body,local,s.height,s.field);
  const role=chooseRole(world,biome,key);
  if(!role)return [];
  const density=biome.material==='water'?.53:
   clamp(.34+.30*(biome.moisture||.5)+.08*(world.level-3),.25,.83);
  if(random(key+':presence')>density)return [];
  const count=role==='grazer'?(random(key+':herd')>.55?2:1):1;
  const result=[];
  for(let i=0;i<count;i++){
   const id='wild-'+hash(key+':member:'+i).toString(36),
    kind=role==='flier'?(random(id+':sail')>.35?'aurora':'flier'):
     role==='grazer'?(random(id+':limbs')>.72?'crawler':'grazer'):
     role==='predator'?'stalker':role==='detritivore'?'burrower':
     role==='filterer'?'jelly':'eel';
   result.push(Object.freeze({id,cellId:key,role,kind,
    bodyId:body.id,local,biome:biome.name,material:biome.material,
    massKg:.5+random(id+':mass')*3.2,
    sizeM:.64+random(id+':size')*.65,
    energy:.49+random(id+':energy')*.34,
    lastEvent:'forage',phototrophic:role==='flier'&&kind==='aurora',
    encounterOnly:true}));
  }
  return result;
 }
 function nearby(body,viewer,terrain,world,seed=742,options={}){
  if(!body?.landable||!body.id||!Array.isArray(viewer)||
     !world?.life||world.subsurface||world.level<2)return[];
  if(typeof terrain!=='function')throw Error('A real terrain sampler is required');
  const max=clamp(Math.floor(options.max||12),1,12);
  const distanceCap=clamp(options.distance||220,40,240);
  const span=clamp(Math.floor(options.span||3),1,4),start=E.cell(body,viewer),found=new Set(),all=[];
  for(let dz=-span;dz<=span;dz++)for(let dx=-span;dx<=span;dx++){
   const target=ST.faceDirection(start.face,-1+2*(start.ix+dx+.5)/start.n,
                                   -1+2*(start.iy+dz+.5)/start.n);
   const cell=E.cell(body,target),key=cell.face+':'+cell.ix+':'+cell.iy;
   if(found.has(key))continue;
   found.add(key);
   const anchor=E.cellDirection(cell),dist=E.arc(viewer,anchor,body.radius);
   if(dist>distanceCap+24)continue;
   for(const agent of cellPlan(body,cell,terrain,seed,world)){
    const distance=E.arc(viewer,agent.local,body.radius);
    if(distance<=distanceCap)all.push({...agent,distance});
   }
  }
  all.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
  return all.slice(0,max);
 }
 const API=Object.freeze({nearby,cellPlan,chooseRole,MAX_ENCOUNTERS:12});
 root.StarfallBiomeWildlife9F=API;
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
