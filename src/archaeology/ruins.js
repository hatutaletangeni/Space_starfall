/* STARFALL 6C — Ancient archaeology: pure seeded data, no DOM / WebGL / time.
 * Body-fixed radial vectors and tile IDs are the authoritative spatial keys.
 * Fictional civilization models are explicitly hypotheses until field evidence.
 */
(function(root){'use strict';
const ST=root.StarfallStableTerrain||(typeof require==='function'?require('../terrain/stable-surface.js'):null);
const TIERS=Object.freeze([
 Object.freeze({name:'Tool-making culture',architecture:'Hearths, knapped stone and shelter rings',instrument:'Surface fragments',radius:10}),
 Object.freeze({name:'Megalithic culture',architecture:'Monoliths, quarries and civic terraces',instrument:'Stonework and oriented masonry',radius:16}),
 Object.freeze({name:'Mechanical civilization',architecture:'Abandoned observatories and walled settlements',instrument:'Mechanical alloys and inscriptions',radius:20}),
 Object.freeze({name:'Industrial civilization',architecture:'Smelters, transit arches and reactor shells',instrument:'Metallurgical and electromagnetic residue',radius:25}),
 Object.freeze({name:'Planetary civilization',architecture:'Broken arcologies and orbital-elevator anchors',instrument:'Superconducting ceramics and fusion debris',radius:34}),
 Object.freeze({name:'Stellar civilization',architecture:'Fragments of Dyson swarm-scale engineering',instrument:'Engineered stellar-spectrum and structural anomalies',radius:40})
]);
const COLLAPSE=Object.freeze(['climate change','planetary catastrophe','slow abandonment','resource exhaustion','interplanetary conflict','unknown transition','stellar instability']);
const STYLES=Object.freeze(['spiral carving','radial geometry','hexagonal lattice','stepped masonry','ribbed alloy','nested arches','triangular inscriptions']);
const STATES=Object.freeze(['buried','eroded','collapsed','partly intact','scattered','frozen','oxidized']);
function hash(s){let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h=Math.imul(h^String(s).charCodeAt(i),16777619)>>>0;}h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return h>>>0;}
function random(key){return hash(String(key))/4294967296;}
function vecLen(v){return Math.hypot(...v);}function norm(v){const m=vecLen(v);return m>1e-10?v.map(x=>x/m):[0,1,0];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,dot(norm(a),norm(b)))))*r;}
function culture(body){if(!body||!body.id||!body.landable||body.type==='Gas Giant')return null;
 const k=String(body.seed)+':'+body.id,roll=random(k+':history'),type=String(body.type||'Rocky');
 const hospitable=/Temperate|Lush|Ocean/.test(type),vacuum=body.kind==='moon',chance=hospitable?.72:vacuum?.21:.42;
 if(roll>=chance)return null;
 const t=random(k+':technology');let max=t<.33?0:t<.54?1:t<.75?2:t<.88?3:t<.974?4:5;
 // Hostile moons can preserve imported artifacts, but not be assumed inhabited.
 if(vacuum&&max<2)max=2;
 const ageMa=Number((.003+Math.pow(random(k+':age'),2)*450).toPrecision(4));
 return Object.freeze({id:'civ-'+hash(k).toString(36),bodyId:body.id,tier:max,style:STYLES[hash(k+':style')%STYLES.length],collapse:COLLAPSE[hash(k+':collapse')%COLLAPSE.length],ageMa,origin:vacuum?'possible off-world outpost':'possible indigenous culture',model:'fictional seeded archaeology hypothesis'});
}
function stellarSignature(star){if(!star||!star.id)return null;const h=hash('stellar-engineering:'+star.id+':'+star.seed);if(h%173!==0)return null;
 return Object.freeze({id:'stellar-'+h.toString(36),starId:star.id,category:'Dyson swarm candidate',hypothesis:'partial stellar light interception',certainty:'unverified / requires spectral evidence',model:'fictional seeded anomaly'});
}
function materialTag(body,dir,sample){const s=sample(body,dir);if(!s||!Number.isFinite(s.height))return null;return s;}
function siteForTile(body,tile,sample){const civ=culture(body);if(!civ||!tile||!sample)return null;
 const key=String(body.seed)+':'+tile.key+':ancient',r=random(key+':occupied');
 // Sparse, stable sites, scaled to the world history. Never per-frame RNG.
 const threshold=civ.tier>=4?.13:civ.tier>=2?.12:.105;if(r>threshold)return null;
 const u=tile.u0+tile.step*(.2+random(key+':u')*.6),v=tile.v0+tile.step*(.2+random(key+':v')*.6),local=ST.faceDirection(tile.face,u,v);
 const terrain=materialTag(body,local,sample);if(!terrain||terrain.material==='water'||terrain.height<-.5)return null;
 const up=local,right=norm(cross(Math.abs(up[1])>.92?[0,0,1]:[0,1,0],up)),ahead=norm(cross(up,right));
 const radius=TIERS[civ.tier].radius,slopePoints=[];
 for(const axis of [right,ahead])for(const sign of [-1,1]){const d=norm(up.map((x,i)=>x+axis[i]*sign*radius/Math.max(body.radius,1)));const other=materialTag(body,d,sample);if(!other)return null;slopePoints.push(Math.atan2(Math.abs(other.height-terrain.height),radius));}
 const slope=Math.max(...slopePoints)*180/Math.PI;
 if(slope>30||!Number.isFinite(slope))return null;
 const lvl=Math.max(0,civ.tier-(random(key+':ruin-scale')<.16?1:0));
 const site=Object.freeze({id:'ruin-'+hash(key).toString(36),bodyId:body.id,systemId:body.systemId,cultureId:civ.id,tier:lvl,local:Object.freeze([...local]),height:terrain.height,slopeDeg:slope,material:terrain.material,biome:terrain.biome||'unclassified',style:civ.style,collapse:civ.collapse,ageMa:civ.ageMa,condition:STATES[hash(key+':state')%STATES.length],anomaly:TIERS[lvl].instrument,model:'procedural fictional evidence',tileKey:tile.key});
 return site;
}
function nearby(body,direction,sample,tileRadius=3){if(!body?.landable||!direction)return[];return ST.visibleTiles(body,direction,Math.max(0,Math.min(5,Math.trunc(tileRadius)))).map(t=>siteForTile(body,t,sample)).filter(Boolean).sort((a,b)=>arc(a.local,direction,body.radius)-arc(b.local,direction,body.radius)||a.id.localeCompare(b.id));}
function safeRecords(saved){if(!Array.isArray(saved))return[];const map=new Map();for(const r of saved.slice(-500)){if(typeof r?.id!=='string'||!/^ruin-[0-9a-z]+$/.test(r.id)||typeof r.bodyId!=='string'||![1,2,3].includes(r.level)||!Number.isFinite(r.timeS)||r.timeS<0||r.timeS>1e13)continue;const snapshot=r.siteSnapshot;const safe= snapshot&&snapshot.id===r.id&&snapshot.bodyId===r.bodyId&&Number.isInteger(snapshot.tier)&&snapshot.tier>=0&&snapshot.tier<=5&&Array.isArray(snapshot.local)&&snapshot.local.length===3&&snapshot.local.every(Number.isFinite)&&Math.abs(vecLen(snapshot.local)-1)<.01&&Number.isFinite(snapshot.ageMa)&&snapshot.ageMa>=0&&snapshot.ageMa<1000?{id:r.id,bodyId:r.bodyId,tier:snapshot.tier,local:[...norm(snapshot.local)],height:Number.isFinite(snapshot.height)?snapshot.height:0,ageMa:snapshot.ageMa,condition:String(snapshot.condition||'unknown').slice(0,32),collapse:String(snapshot.collapse||'unknown').slice(0,60),style:String(snapshot.style||'unknown').slice(0,60),biome:String(snapshot.biome||'unknown').slice(0,60),anomaly:String(snapshot.anomaly||'unknown').slice(0,90)}:null;
 map.set(r.id,{id:r.id,bodyId:r.bodyId,level:r.level,timeS:r.timeS,measurementIds:Array.isArray(r.measurementIds)?r.measurementIds.filter(s=>typeof s==='string').slice(0,10):[],...(safe?{siteSnapshot:safe}:{})});}return [...map.values()].slice(-300);}
const api=Object.freeze({TIERS,hash,random,norm,dot,arc,culture,stellarSignature,siteForTile,nearby,safeRecords});root.StarfallArchaeology=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
