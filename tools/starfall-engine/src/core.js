/* STARFALL ENGINE — dependency-free scene authoring core, UMD for file:// and Node. */
(function (root, factory) { const API=factory(); if(typeof module==='object'&&module.exports)module.exports=API; root.StarfallEditorCore=API; })(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TYPES=Object.freeze(['star','planet','moon','asteroid','ship','rover','station','outpost','marker']);
const TAU=2*Math.PI, MAX_NODES=1200, SCHEMA='starfall-engine-scene', VERSION=1;
const finite=(n)=>typeof n==='number'&&Number.isFinite(n);
const vec3=(v)=>Array.isArray(v)&&v.length===3&&v.every(finite);
const clone=x=>JSON.parse(JSON.stringify(x));
const safeName=v=>String(v||'Untitled').slice(0,80).replace(/[<>]/g,'');
function canonical(raw){
 if(!raw||typeof raw!=='object')throw Error('Invalid node');
 const type=raw.type||'marker';if(!TYPES.includes(type))throw Error('Unsupported node type: '+type);
 const node={id:String(raw.id||''),name:safeName(raw.name||type),type,parentId:raw.parentId==null?null:String(raw.parentId),positionKm:raw.positionKm??[0,0,0],rotationDeg:raw.rotationDeg??[0,0,0],scale:raw.scale??[1,1,1],radiusKm:raw.radiusKm??(type==='star'?18000:type==='planet'?8000:type==='moon'?2500:900),color:raw.color??(type==='star'?'#ffd18b':type==='planet'?'#598ab0':type==='moon'?'#c1cedc':'#a5bad1'),visible:raw.visible!==false,locked:raw.locked===true,orbit:raw.orbit??null,metadata:raw.metadata??{}};
 if(!node.id||node.id.length>100||!/^[-_a-zA-Z0-9:.]+$/.test(node.id))throw Error('Invalid node ID');
 if(!vec3(node.positionKm)||!vec3(node.rotationDeg)||!vec3(node.scale))throw Error('Invalid transform '+node.id);
 if(node.scale.some(n=>n<=0||n>10000))throw Error('Invalid scale '+node.id);
 if(!finite(node.radiusKm)||node.radiusKm<=0||node.radiusKm>1e12)throw Error('Invalid radius '+node.id);
 if(!/^#[0-9a-fA-F]{6}$/.test(node.color))throw Error('Invalid color '+node.id);
 if(node.orbit!==null){ const o=node.orbit;
  if(!o||!finite(o.semiMajorAxisKm)||o.semiMajorAxisKm<=0||!finite(o.periodSeconds)||o.periodSeconds<=0||!finite(o.phaseDeg??0)||!finite(o.inclinationDeg??0))throw Error('Invalid circular orbit '+node.id);
  node.orbit={semiMajorAxisKm:o.semiMajorAxisKm,periodSeconds:o.periodSeconds,phaseDeg:o.phaseDeg??0,inclinationDeg:o.inclinationDeg??0};
 }
 if(!node.metadata||typeof node.metadata!=='object'||Array.isArray(node.metadata))throw Error('Invalid metadata');
 if(JSON.stringify(node).length>30000)throw Error('Node too large');
 return clone(node);
}
function validate(data){
 if(!data||data.schema!==SCHEMA||data.version!==VERSION)throw Error('Unsupported scene schema / version');
 if(!Array.isArray(data.nodes)||data.nodes.length>MAX_NODES)throw Error('Scene object limit exceeded');
 if(!finite(data.simulationSeconds)||data.simulationSeconds<0||data.simulationSeconds>1e15)throw Error('Invalid simulation time');
 if(!finite(data.kmPerUnit)||data.kmPerUnit<=0||data.kmPerUnit>1e12)throw Error('Invalid scale convention');
 const nodes=data.nodes.map(canonical),ids=new Set(nodes.map(n=>n.id));if(ids.size!==nodes.length)throw Error('Duplicate node IDs');
 const map=new Map(nodes.map(n=>[n.id,n]));
 for(const n of nodes){if(n.parentId&&!map.has(n.parentId))throw Error('Unknown parent '+n.parentId);const visited=new Set([n.id]);let current=n;while(current.parentId){if(visited.has(current.parentId))throw Error('Parent cycle');visited.add(current.parentId);current=map.get(current.parentId);}}
 return {schema:SCHEMA,version:VERSION,name:safeName(data.name),kmPerUnit:data.kmPerUnit,simulationSeconds:data.simulationSeconds,seed:(Number(data.seed)||742)>>>0,nodes};
}
function sampleScene(){
 const nodes=[
 {id:'star-home',name:'Haven / K-class star',type:'star',positionKm:[0,0,0],radiusKm:24000,color:'#ffd18b'},
 {id:'world-01',name:'Nadir • temperate',type:'planet',parentId:'star-home',radiusKm:8400,color:'#4e9db0',orbit:{semiMajorAxisKm:132000,periodSeconds:2200,phaseDeg:25,inclinationDeg:7}},
 {id:'moon-01',name:'Aster moon',type:'moon',parentId:'world-01',radiusKm:2650,color:'#b5bac4',orbit:{semiMajorAxisKm:25500,periodSeconds:340,phaseDeg:220,inclinationDeg:18}},
 {id:'world-02',name:'Vesta • gas giant',type:'planet',parentId:'star-home',radiusKm:13900,color:'#caa77c',orbit:{semiMajorAxisKm:259000,periodSeconds:4800,phaseDeg:142,inclinationDeg:-5},metadata:{surface:'gas'}},
 {id:'world-03',name:'Iona • ice',type:'planet',parentId:'star-home',radiusKm:7100,color:'#91bbc9',orbit:{semiMajorAxisKm:366000,periodSeconds:7600,phaseDeg:275,inclinationDeg:3},metadata:{surface:'ice'}},
 {id:'station-01',name:'Orbital refinery',type:'station',parentId:'world-01',radiusKm:2700,color:'#aebbc6',orbit:{semiMajorAxisKm:18000,periodSeconds:720,phaseDeg:75,inclinationDeg:27}},
 {id:'ship-01',name:'Expedition vessel',type:'ship',parentId:'world-01',radiusKm:2200,color:'#e4a964',positionKm:[-21000,4300,-15000]},
 {id:'outpost-01',name:'Nadir research base',type:'outpost',parentId:'world-01',radiusKm:1850,color:'#7ccbc1',positionKm:[8500,0,0]}
 ];
 return validate({schema:SCHEMA,version:VERSION,name:'Haven System — Engineering Sandbox',kmPerUnit:1000,simulationSeconds:0,seed:742,nodes});
}
class Scene{
 constructor(data=sampleScene()){this.data=validate(data);this.serial=0;}
 get nodes(){return this.data.nodes;}
 getNode(id){return this.nodes.find(n=>n.id===id)||null;}
 snapshot(){return clone(this.data);}
 load(raw){this.data=validate(raw);this.serial++;return this;}
 _mutation(fn){const copy=this.snapshot();fn(copy);this.load(copy);}
 add(type,parentId=null){if(!TYPES.includes(type))throw Error('Unsupported type');if(parentId&&!this.getNode(parentId))throw Error('Missing parent');const used=new Set(this.nodes.map(n=>n.id));let k=1,id;do{id=type+'-'+String(k++).padStart(3,'0');}while(used.has(id));
 const p=this.getNode(parentId);const radius=type==='star'?20000:type==='planet'?8000:type==='moon'?2300:1400;
 const proposed=canonical({id,name:type.charAt(0).toUpperCase()+type.slice(1)+' '+(k-1),type,parentId,radiusKm:radius,positionKm:p?[p.radiusKm*2.6,0,0]:[0,0,0]});
 this._mutation(data=>data.nodes.push(proposed));return id;
 }
 remove(id){if(!this.getNode(id))return;this._mutation(data=>{const removing=new Set([id]);let changed=true;while(changed){changed=false;for(const n of data.nodes){if(n.parentId&&removing.has(n.parentId)&&!removing.has(n.id)){removing.add(n.id);changed=true;}}}data.nodes=data.nodes.filter(n=>!removing.has(n.id));});}
 update(id,patch){if(!this.getNode(id))throw Error('Missing object');this._mutation(data=>{const i=data.nodes.findIndex(n=>n.id===id);const n=data.nodes[i];if(n.locked&&patch.locked!==false)throw Error('Object is locked');if(Object.prototype.hasOwnProperty.call(patch,'id')&&patch.id!==id)throw Error('Cannot rename stable ID');data.nodes[i]=canonical({...n,...clone(patch),id});});}
 setTime(t){if(!finite(t)||t<0||t>1e15)throw Error('Invalid time');this.data.simulationSeconds=t;}
 worldPositions(t=this.data.simulationSeconds){if(!finite(t))throw Error('Invalid time');const positions=new Map(),visiting=new Set(),map=new Map(this.nodes.map(n=>[n.id,n]));
 const positionOf=id=>{if(positions.has(id))return positions.get(id);if(visiting.has(id))throw Error('Scene cycle');visiting.add(id);const n=map.get(id);if(!n)throw Error('Missing node '+id);const p=n.parentId?positionOf(n.parentId):[0,0,0];let v=n.positionKm.slice();
 if(n.orbit){const o=n.orbit,a=TAU*((t%o.periodSeconds)/o.periodSeconds)+(o.phaseDeg*Math.PI/180),i=o.inclinationDeg*Math.PI/180;v=[v[0]+o.semiMajorAxisKm*Math.cos(a),v[1]+o.semiMajorAxisKm*Math.sin(a)*Math.sin(i),v[2]+o.semiMajorAxisKm*Math.sin(a)*Math.cos(i)];}
 const result=[p[0]+v[0],p[1]+v[1],p[2]+v[2]];positions.set(id,result);visiting.delete(id);return result;
 };for(const n of this.nodes)positionOf(n.id);return positions;
 }
 exportStarfallPlacementManifest(){const positions=this.worldPositions();return {schema:'starfall-engine-authoring-manifest',version:1,sourceScene:this.data.name,seed:this.data.seed,coordinateUnit:'km',warning:'Authoring-only manifest. STARFALL game does not automatically ingest this format.',objects:this.nodes.filter(n=>!['star','planet','moon'].includes(n.type)).map(n=>({id:n.id,name:n.name,type:n.type,parentId:n.parentId,worldPositionKm:positions.get(n.id),sourceNode:clone(n)}))};}
}
return {Scene,TYPES,SCHEMA,VERSION,validate,sampleScene,canonical};
});
