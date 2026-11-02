/* STARFALL T05: isolated, on-demand off-world WebGL2 camera.
 * Uses Starfall3D.Renderer and deterministic terrain sources without activating
 * or mutating the live galaxy, player camera, ship, cache or active renderer.
 */
(function(root){'use strict';
const G=root.Starfall3D,V=G?.V,SCHEMA=1,MAX_SIZE=512;
const finite=Number.isFinite,copy=x=>JSON.parse(JSON.stringify(x));
let captures=0,active=false;
function worldFor(asset,at){
 if(!finite(at)||at<0||!asset?.bodyId||!asset.systemId)throw Error('AWAITING_RENDER: missing saved mission body or valid timestamp');
 const rt=root.StarfallRuntime,op=root.StarfallMissionOperationsUI;
 const loaded=rt?.galaxy?.byId?.get(asset.bodyId);
 const candidate=op?.resolveBody(asset,at)||loaded;
 if(!candidate||!candidate.landable||!candidate.position?.every(finite)||!finite(candidate.radius)||!finite(candidate.seed))
  throw Error('AWAITING_RENDER: destination body snapshot/ephemeris missing or not a solid world');
 const source=rt.galaxy.byId.get(asset.systemId);
 if(!source?.star||!source.position?.every(finite)||!finite(source.star.radius)||!finite(source.maxOrbit))
  throw Error('AWAITING_RENDER: authoritative source star system not available');
 const body=copy(candidate);
 // Older T01 snapshots omitted sky tint. Only the atmosphere color needs a
 // visual fallback; ground shape and palette still use original seed and type.
 if(!Array.isArray(body.sky)||body.sky.length!==3)body.sky=loaded?.sky?.slice()||[.4,.55,.66];
 const sys={...source,planets:[body],bodies:[body],belts:[],nebulae:[],comets:[],
  maxOrbit:Math.max(source.maxOrbit,body.orbitRadius||0,body.radius*3)};
 const map=new Map([[body.id,body],[source.id,sys]]);
 const galaxy={seed:rt.galaxy.seed,time:at,systems:[sys],byId:map,
  nearbySystems(position,maxDistance){const d=V.len(V.sub(position,sys.position));
   return d<maxDistance+sys.maxOrbit?[sys]:[];},
  nearestSystem(){return sys;}};
 return{body,system:sys,galaxy,liveBody:loaded||null};
}
function assets(world,eye){
 const {body}=world,rotate=root.StarfallOutposts?.rotate;
 const objects={infrastructure:[],ruins:[],ecology:[],extraRovers:[],satellites:[]};
 if(!rotate)return objects;
 const at=body.spinAngle||0,axis=body.spinAxis||[0,1,0];
 const p=(local,height)=>V.add(body.position,V.mul(rotate(local,axis,at),body.radius+height));
 for(const o of root.StarfallOutpostUI?.store?.items||[]){
  if(o.bodyId!==body.id||!Array.isArray(o.local))continue;
  const up=rotate(o.local,axis,at),forward=rotate(o.facing||[0,0,1],axis,at);
  const pos=p(o.local,(G.groundHeight(o.local,body)||0)+(o.height||0)+.6);
  if(V.len(V.sub(pos,eye))<370)objects.infrastructure.push({kind:o.kind,position:pos,up,forward});
  if(objects.infrastructure.length>=48)break;
 }
 // Original immutable 6C ruin generation, NOT a copy of active planet scene.
 const localEye=V.rot(V.norm(V.sub(eye,body.position)),axis,-at);
 const sample=(planet,local)=>G.sampleTerrain(planet,local);
 const ruinEngine=root.StarfallArchaeology;
 const seededRuins=ruinEngine&&G.sampleTerrain?ruinEngine.nearby(body,localEye,sample,4):[];
 const known=(root.SF.load()?.archaeology6c?.records||[])
  .filter(x=>x.bodyId===body.id&&x.siteSnapshot?.local).map(x=>x.siteSnapshot);
 const visited=new Set();
 for(const item of [...seededRuins,...known]){
  if(!item?.local||!finite(item.tier)||visited.has(item.id))continue;
  visited.add(item.id);
  const up=rotate(item.local,axis,at),height=G.groundHeight(item.local,body)||0;
  const pos=p(item.local,height+.22),forward=rotate(ruinEngine?.norm?.([item.local[2],.13,-item.local[0]])||[0,0,1],axis,at);
  if(V.len(V.sub(pos,eye))<375)objects.ruins.push({tier:item.tier,position:pos,up,forward,id:item.id});
  if(objects.ruins.length>=20)break;
 }
 // The same deterministic 6H ecology model and body-fixed animation, not
 // camera-local decorative life and not the currently active world's ecology.
 const eco=root.StarfallEcology;
 if(eco&&G.sampleTerrain){
  for(const site of eco.nearby(body,localEye,sample,5,root.StarfallRuntime.galaxy.seed,24)){
   if(site.distance>230)continue;
   const motion=eco.pose(site,body,world.galaxy.time,localEye,sample),
    up=rotate(motion.local,axis,at),frame=eco.basis(motion.local),
    position=p(motion.local,motion.height+motion.altitude+.1),
    forward=rotate(frame.north,axis,at);
   objects.ecology.push({id:site.id,kind:site.kind,position,up,forward,behavior:motion.behavior});
   if(objects.ecology.length>=18)break;
  }
 }
 for(const r of root.StarfallLaunchUI?.store?.rovers||[]){
  if(r.bodyId!==body.id||!r.local)continue;
  const up=rotate(r.local,axis,at),position=p(r.local,(G.groundHeight(r.local,body)||0)+1.8);
  const forward=V.norm(V.cross(Math.abs(up[1])>.9?[1,0,0]:[0,1,0],up));
  if(V.len(V.sub(position,eye))<2600)objects.extraRovers.push({position,up,forward});
  if(objects.extraRovers.length>=15)break;
 }
 return objects;
}
function frameState(world,eye,forward,up){
 const pos=V.add(eye,[1e9,1e9,1e9]);
 return{shipPosition:pos,shipForward:forward,shipUp:up,position:eye,viewerPosition:eye,
  roverPosition:null,truckPosition:null,avatarBase:null,interior:null,
  headlights:false,weather:null,rockets:[],...assets(world,eye)};
}
function capture({asset,eye,forward,up,size=256,mode='forward',caption='',timeS}){
 if(active)throw Error('AWAITING_RENDER: another remote render owns the GPU timeslice');
 if(![256,512].includes(size))throw Error('AWAITING_RENDER: remote imaging is limited to 256/512 px to protect flight FPS');
 if(!G?.Renderer||!G?.groundHeight)throw Error('AWAITING_RENDER: Starfall shader renderer unavailable');
 if(![eye,forward,up].every(v=>Array.isArray(v)&&v.length===3&&v.every(finite)))
  throw Error('AWAITING_RENDER: invalid source-owned camera coordinates');
 const world=worldFor(asset,timeS),state=frameState(world,eye,forward,up);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 canvas.style.width='256px';canvas.style.height='256px';
 let renderer=null;active=true;
 try{
  // A separate WebGL context means even on error no main framebuffer, camera,
  // culling cache or renderer state can be damaged.
  renderer=new G.Renderer(canvas,world.galaxy);
  renderer.latestFrameState=state;
  const shot=renderer.captureScience({eye,forward,up},world.body,
   {size,caption,wide:mode==='wide'});
  if(!(shot.bytes>200)||!/^data:image\/(webp|jpeg);base64,/.test(shot.image))
   throw Error('AWAITING_RENDER: empty or invalid genuine GPU readback');
  captures++;
  return{...shot,sceneSnapshotVersion:SCHEMA,renderSource:'ISOLATED_STARFALL_WEBGL2',
   worldSeed:world.body.seed,bodyId:world.body.id,systemId:world.body.systemId,timeS,
   actualWorld:world.body.name,renderCount:captures};
 }catch(e){throw Error(String(e?.message||e).startsWith('AWAITING_RENDER:')?String(e.message):'AWAITING_RENDER: '+String(e?.message||e));}
 finally{try{renderer?.dispose();renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch(_){}active=false;}
}
root.StarfallRemoteImagingT05={SCHEMA,MAX_SIZE,worldFor,frameState,capture,get captures(){return captures;},get busy(){return active;}};
})(window);
