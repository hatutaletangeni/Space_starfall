/* STARFALL T11 — Launch pad commissioning and payload custody.
 * Additive to the 7B force-integrated ascent and T06 rover landing envelope.
 * An old Foundation remains a functioning LEGACY launch pad until commissioned.
 * Units: scene distance for ground clearance, SI kg/W/J/s for hardware.
 */
(function(root){'use strict';
const CONTROL_W=90,MIN_CLEARANCE_SCENE=12;
const finite=Number.isFinite,copy=x=>JSON.parse(JSON.stringify(x));
const norm=v=>{if(!Array.isArray(v)||v.length!==3||!v.every(finite)||Math.hypot(...v)<.5)throw Error('Invalid body-fixed launch/landing coordinates');const l=Math.hypot(...v);return v.map(x=>x/l);};
const legacy=()=>({schema:1,mode:'legacy',commissionedAtS:null});
function repair(x){
 if(!x||x.schema!==1||x.mode!=='commissioned')return legacy();
 return{schema:1,mode:'commissioned',commissionedAtS:finite(x.commissionedAtS)?Math.max(0,x.commissionedAtS):0};
}
function requiredWatts(pad){return pad?.kind==='foundation'&&repair(pad.padT11).mode==='commissioned'?CONTROL_W:0;}
function configure(pad,mode,simS=0,launchStore=null){
 if(pad?.kind!=='foundation'||!pad.id)throw Error('Select an existing Foundation launch pad');
 if(!['commissioned','legacy'].includes(mode)||!finite(simS)||simS<0)throw Error('Invalid launch pad configuration');
 if(launchStore?.launches?.some(m=>m.padId===pad.id&&['ascent','coast'].includes(m.phase)))throw Error('Cannot reconfigure a pad during active powered/coasting flight');
 pad.padT11=mode==='commissioned'?{schema:1,mode,commissionedAtS:simS}:legacy();
 return repair(pad.padT11);
}
function inspect({pad,body,launchStore=null,outposts=null,powerReport=null,heightAt=null}={}){
 const reasons=[],config=repair(pad?.padT11),commissioned=config.mode==='commissioned';
 if(pad?.kind!=='foundation'||!pad.id||pad.bodyId!==body?.id||!body?.landable)reasons.push('Select a real Foundation on the current solid body');
 if(pad?.enabled===false||!(pad?.condition>.02))reasons.push('Foundation disabled or damaged');
 const busy=!!launchStore?.launches?.some(m=>m.padId===pad?.id&&['ascent','coast'].includes(m.phase));
 if(busy)reasons.push('Launch pad occupied by active rocket');
 let clearanceScene=null,slopeDeg=null;
 if(!reasons.includes('Select a real Foundation on the current solid body')&&commissioned){
  try{
   const local=norm(pad.local),O=root.StarfallOutposts;
   if(outposts?.items&&O){
    for(const x of outposts.items){
     if(x.id===pad.id||x.bodyId!==body.id)continue;
     const gap=O.arc(local,norm(x.local),body.radius)-(O.SPECS[x.kind]?.radius||3);
     if(gap<MIN_CLEARANCE_SCENE){reasons.push('Launch hazard: '+x.kind+' '+x.id+' within rocket clearance');break;}
    }
   }
   if(typeof heightAt!=='function')reasons.push('Terrain clearance needs a stable surface sampler');
   else if(O){
    const p=O.placement({kind:'foundation',body,local,heightAt,structures:[],protectedAreas:[],slopeMax:.28});
    slopeDeg=p.slopeDeg;clearanceScene=MIN_CLEARANCE_SCENE;
   }else reasons.push('Terrain/placement service unavailable');
  }catch(e){reasons.push('Unsafe pad geometry: '+e.message);}
  const group=outposts?.connectedGroups?.(body.id)?.find(g=>g.some(x=>x.id===pad.id));
  const row=powerReport?.byId?.[pad.id];
  const sources=(group||[]).filter(x=>x.id!==pad.id&&x.enabled!==false&&x.condition>.02&&['battery','solar'].includes(x.kind));
  const liveSources=sources.filter(x=>x.kind==='battery'?x.energyJ>CONTROL_W*2:(powerReport?.byId?.[x.id]?.generatedW||0)>CONTROL_W);
  if(!group||!sources.length)reasons.push('Commissioned pad needs wired solar/battery source');
  if(!row||row.power!==true||!(row.loadW>=CONTROL_W-.01)||!liveSources.length)reasons.push('Pad controls not served '+CONTROL_W+' W by active electrical bus');
 }
 return{padId:pad?.id||null,mode:config.mode,ready:reasons.length===0,busy,powerW:requiredWatts(pad),slopeDeg,clearanceScene,reasons};
}
function validateDestination({design,body,destinationBody,destinationSystem,landingLocal}){
 if(!root.StarfallLaunch?.PAYLOADS?.[design?.payload])throw Error('Unsupported payload interface');
 if(design.payload!=='rover')return{kind:'LOCAL_ORBIT',destinationBodyId:body.id,destinationSystemId:body.systemId,siteLocal:null};
 if(!destinationBody?.landable||!destinationSystem?.id||destinationBody.systemId!==destinationSystem.id)throw Error('Choose a real solid rover destination in the selected star system');
 if(destinationBody.systemId===body.systemId&&destinationBody.id!==body.id)
  throw Error('T11: Same-system cross-planet transfer has no verified propulsion/trajectory; select the launch world or a different-star fictional carrier destination');
 if(!root.StarfallRoverT06)throw Error('T06 landing-envelope service required before sending a rover');
 return{kind:destinationBody.systemId===body.systemId?'LOCAL_ROVER_CAPSULE':'FICTIONAL_INTERSTELLAR_CARRIER',
  destinationBodyId:destinationBody.id,destinationSystemId:destinationSystem.id,
  siteLocal:landingLocal?norm(landingLocal):null};
}
function validateLaunch(opts){
 const report=inspect(opts);
 if(!report.ready)throw Error('Pad preflight: '+report.reasons.join('; '));
 return validateDestination(opts);
}
function manifest({mission,design,profile,body,destinationBody,destinationSystem,landingLocal}){
 const route=validateDestination({design,body,destinationBody,destinationSystem,landingLocal});
 if(!mission?.id||!finite(profile?.payloadKg)||profile.payloadKg<=0)throw Error('Invalid rocket payload/mass manifest');
 return{schema:1,id:'payload-'+mission.id,launchId:mission.id,kind:design.payload,
   massKg:profile.payloadKg,retentionKg:210,attached:true,status:'IN_PAYLOAD',
   route:route.kind,originBodyId:body.id,destinationBodyId:route.destinationBodyId,
   destinationSystemId:route.destinationSystemId,siteLocal:route.siteLocal,
   releasedAtS:null,assetId:null,history:[{phase:'IN_PAYLOAD',timeS:mission.startS}]};
}
function record(m,phase,time){
 const p=m?.payloadT11;if(!p||typeof phase!=='string'||!finite(time))return;
 if(p.status===phase)return;
 p.status=phase;
 if(!Array.isArray(p.history))p.history=[];
 if(p.history.length<96)p.history.push({phase,timeS:time});
 else p.historyOverflow=true; // retain the existing log; do not erase previous entries
}
function observe(m,time){
 if(!m?.payloadT11)return;
 const phase=m.phase==='ascent'?'ASCENT':m.phase==='coast'?'COAST':
  m.phase==='orbit'?'ORBIT':m.phase==='transfer'?'TRANSFER':
  m.phase==='entry'?'ENTRY':m.phase==='descent'?'DESCENT':
  m.phase==='deployed'?'DEPLOYED':m.phase==='failed'?'FAILED':null;
 if(phase)record(m,phase,time);
}
function canDeploy(m){
 if(!m?.payloadT11)return{ok:true}; // old launch saves keep legacy delivery
 const f=m.flight,orbits=m.orbitalElements;
 if(!f||f.phase!=='orbit'||orbits?.stable!==true)return{ok:false,reason:'Payload release requires a force-integrated stable orbit'};
 if(m.payloadT11.attached!==true||m.payloadT11.assetId)return{ok:false,reason:'Payload already separated'};
 if(m.payloadT11.route==='FICTIONAL_INTERSTELLAR_CARRIER'&&m.phase!=='transfer')return{ok:false,reason:'Interstellar carrier has not reached transfer phase'};
 return{ok:true};
}
function release(m,asset,time){
 const p=m?.payloadT11;if(!p)return;
 if(!asset?.id||asset.launchId!==m.id)throw Error('Payload custody must reference the deployed asset of its launch');
 p.attached=false;p.assetId=asset.id;p.releasedAtS=time;
 asset.payloadT11={schema:1,manifestId:p.id,launchId:m.id,originBodyId:p.originBodyId,
  destinationBodyId:p.destinationBodyId,route:p.route};
 record(m,m.payload==='rover'?'ENTRY':'DEPLOYED',time);
}
root.StarfallPadT11={CONTROL_W,MIN_CLEARANCE_SCENE,repair,configure,requiredWatts,inspect,validateDestination,validateLaunch,manifest,observe,canDeploy,release};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallPadT11;
})(typeof window!=='undefined'?window:globalThis);
