'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../src/physics/remote-imaging-t05.js'),'utf8');
let mainGalaxyChanges=0,rendererCalls=0,disposed=0,glLoss=0;
const seededBody={id:'catalog-0-p0',name:'Real cached world',seed:321,radius:1500,type:'Rocky',kind:'planet',
 systemId:'catalog-0',position:[2e9+20000,1e8,8e8],orbitRadius:25000,orbitPeriod:1200,
 phase:0.34,spinAxis:[0,1,0],spinAngle:.7,landable:true,sky:[.4,.4,.3]};
const source={id:'catalog-0',position:[2e9,1e8,8e8],star:{radius:28000,tint:[1,.8,.6]},maxOrbit:0,dormant:true};
const galaxy={seed:742,byId:new Map([[source.id,source]]),systems:[source],activate(){mainGalaxyChanges++;throw Error('must not activate source world');}};
const image='data:image/webp;base64,'+'A'.repeat(400);
class Renderer{
 constructor(canvas,facade){rendererCalls++;assert.equal(canvas.width,256);assert.notEqual(facade,galaxy);
  assert.equal(facade.byId.get(seededBody.id).id,seededBody.id);
  assert.equal(facade.nearbySystems(seededBody.position,1e6).length,1);
  this.galaxy=facade;this.gl={getExtension:()=>({loseContext(){glLoss++;}})};
 }
 captureScience(camera,body,settings){assert.equal(body.seed,seededBody.seed);assert.equal(settings.size,256);
  assert.equal(camera.eye.length,3);assert(this.latestFrameState);
  return{image,mime:'image/webp',bytes:320,width:256,height:256,camera};}
 dispose(){disposed++;}
}
const global={Starfall3D:{Renderer,groundHeight:()=>0,V:{len:x=>Math.hypot(...x),sub:(a,b)=>a.map((x,i)=>x-b[i]),
 add:(a,b)=>a.map((x,i)=>x+b[i]),mul:(a,v)=>a.map(x=>x*v)}},
 StarfallRuntime:{galaxy},StarfallMissionOperationsUI:{resolveBody:(asset,time)=>asset.bodySnapshot},
 StarfallOutpostUI:{store:{items:[]}},StarfallOutposts:{rotate:v=>v},
 StarfallLaunchUI:{store:{rovers:[]}},SF:{load:()=>({})},
 document:{createElement:t=>{assert.equal(t,'canvas');return{width:0,height:0,style:{}};}},window:null};
global.window=global;
vm.runInNewContext(src,global);
const T=global.StarfallRemoteImagingT05;
const asset={bodyId:seededBody.id,systemId:source.id,bodySnapshot:seededBody};
const o=T.capture({asset,eye:seededBody.position.map((x,i)=>x+[0,1510,0][i]),
 forward:[0,-1,0],up:[0,0,1],size:256,mode:'forward',timeS:12});
assert.equal(o.actualWorld,seededBody.name);assert.equal(o.sceneSnapshotVersion,1);
assert.equal(o.bodyId,seededBody.id);assert.equal(o.renderSource,'ISOLATED_STARFALL_WEBGL2');
assert.equal(mainGalaxyChanges,0);assert.equal(galaxy.byId.has(seededBody.id),false);
assert.equal(rendererCalls,1);assert.equal(disposed,1);assert.equal(glLoss,1);assert.equal(T.busy,false);
assert.throws(()=>T.capture({asset,eye:[0,0,0],forward:[1,0,0],up:[0,1,0],size:1024,timeS:13}),/AWAITING_RENDER/);
assert.throws(()=>T.capture({asset:{...asset,bodySnapshot:null},eye:[0,0,0],forward:[1,0,0],up:[0,1,0],size:256,timeS:13}),/AWAITING_RENDER/);
assert.equal(T.busy,false);
const camera=require('../src/physics/imaging7f.js'),m=new camera.Store();
const job=m.request('rover','probe','forward',256,5);m.markDelivered(job.id,7);
const waiting=m.renderPending(job.id,'No WebGL GPU context',8);
assert.equal(waiting.renderState,'AWAITING_RENDER');assert.equal(waiting.deliveredS,7);
const restored=new camera.Store(m.serialize());assert.equal(restored.jobs[0].renderReason,'No WebGL GPU context');
const token=restored.markRendering(job.id);assert.equal(token.renderState,'RENDERING');
assert.equal(restored.photos.length,0,'a failed render must not forge gallery entries');
console.log('PASS T05 model: isolated real renderer contract, unloaded system retained, no live galaxy activation, size limits, GPU disposal, capture metadata and durable AWAITING_RENDER');
