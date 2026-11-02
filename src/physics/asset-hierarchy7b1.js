/* STARFALL 7B.1 — read-only location/assembly projection.
   A system is shown only when it has actual tracked objects, field evidence, or
   is the current player location; 2,368 navigable stars are NOT all explored.
   Does not hydrate lazy galaxy systems or mutate the engineering registry. */
(function(root){'use strict';
const good=s=>typeof s==='string'&&s.length>0;
function inferSystem(bodyId){if(!good(bodyId))return null;const m=/^(star-\d+|catalog-\d+)(?:-|$)/.exec(bodyId);return m?m[1]:null;}
function parentPlanet(bodyId){if(!good(bodyId))return null;const m=/^((?:star-\d+|catalog-\d+)-p\d+)-m\d+$/.exec(bodyId);return m?m[1]:null;}
function node(id,kind,label,meta='',obj=null){return{id,kind,label,meta,assetId:kind==='asset'?obj?.id:null,componentId:kind==='component'?obj?.id:null,ref:obj,children:[],count:0};}
function tree(assets,options={}){
 const gal=options.galaxy,all=Array.isArray(assets)?assets:[],sources=options.sources||{},componentsFor=options.componentsFor||(()=>[]),systemCache=new Map(),bodyCache=new Map(),assetCache=new Map(),roots=[],nodes=new Map(),outstanding=[];
 const sysInfo=id=>gal?.byId?.get(id)||gal?.systems?.find(s=>s.id===id);
 const worldInfo=id=>gal?.byId?.get(id);
 function sys(id){if(systemCache.has(id))return systemCache.get(id);const info=sysInfo(id),n=node('system:'+id,'system',info?.name||id,id==='unlocated'?'Location not yet recorded':'STAR SYSTEM · '+id,info);nodes.set(n.id,n);systemCache.set(id,n);roots.push(n);return n;}
 function world(bodyId,systemId){if(bodyCache.has(bodyId))return bodyCache.get(bodyId);const info=worldInfo(bodyId),parent=parentPlanet(bodyId),kind=info?.kind||(/-m\d+$/.test(bodyId)?'moon':'planet');let label=info?.name;
  if(!label){const suffix=bodyId.split('-').slice(-2).join('-');label=(kind==='moon'?'Moon':'Planet')+' '+suffix+' · location record only';}
  const n=node('world:'+bodyId,'world',label,kind.toUpperCase()+' · '+bodyId,info);nodes.set(n.id,n);bodyCache.set(bodyId,n);
  if(parent){world(parent,systemId).children.push(n);}else sys(systemId).children.push(n);
  return n;}
 function assetNode(a){if(assetCache.has(a.id))return assetCache.get(a.id);const n=node('asset:'+a.id,'asset',a.id,a.type+' · '+(a.status||'state unknown'),a);nodes.set(n.id,n);assetCache.set(a.id,n);return n;}
 const idMap=new Map(all.filter(a=>a&&good(a.id)).map(a=>[a.id,a]));
 for(const a of idMap.values()){
  const n=assetNode(a);
  if(good(a.parentId)&&idMap.has(a.parentId)&&a.parentId!==a.id){outstanding.push([a,n]);continue;}
  const body=a.bodyId||a.location?.bodyId||null,systemId=a.systemId||inferSystem(body)||'unlocated';
  (body?world(body,systemId):sys(systemId)).children.push(n);
 }
 for(const [a,n] of outstanding){let p=idMap.get(a.parentId),seen=new Set([a.id]);while(p&&good(p.parentId)&&idMap.has(p.parentId)&&!seen.has(p.id)){seen.add(p.id);p=idMap.get(p.parentId);}
  if(p&&seen.has(p.id)){// Malformed parent cycle: fall back to planet branch.
   const body=a.bodyId||a.location?.bodyId,systemId=a.systemId||inferSystem(body)||'unlocated';(body?world(body,systemId):sys(systemId)).children.push(n);
  }else assetNode(idMap.get(a.parentId)).children.push(n);
 }
 for(const a of idMap.values()){
  const n=assetNode(a);let components=[];try{components=componentsFor(a,sources)||[];}catch(_){}
  const seen=new Set();for(const c of components.slice(0,50)){if(!good(c.id)||seen.has(c.id))continue;seen.add(c.id);const child=node('component:'+a.id+':'+c.id,'component',c.label||c.id,(c.type||'component')+' · '+(c.status||'model-derived'),c);child.assetId=a.id;nodes.set(child.id,child);n.children.push(child);}
 }
 // Visit records add a location to the navigator, not an invented asset.
 for(const rec of (options.evidence||[]).slice(-500)){const b=rec?.bodyId;if(!good(b))continue;world(b,inferSystem(b)||'unlocated');}
 if(good(options.currentBodyId)){const b=options.currentBodyId;world(b,inferSystem(b)||'unlocated');}
 const order={world:0,asset:1,component:2};
 function finish(n){n.children.sort((a,b)=>(order[a.kind]??9)-(order[b.kind]??9)||a.label.localeCompare(b.label,'en',{numeric:true}));n.count=(n.kind==='asset'?1:0)+n.children.reduce((s,c)=>s+finish(c),0);return n.count;}
 roots.sort((a,b)=>a.id==='system:unlocated'?1:b.id==='system:unlocated'?-1:a.label.localeCompare(b.label,'en',{numeric:true}));roots.forEach(finish);
 return{roots,nodes,assets:idMap.size,systems:roots.filter(n=>n.id!=='system:unlocated').length,worlds:bodyCache.size};
}
function path(tree,nodeId){const chain=[];function seek(n){chain.push(n);if(n.id===nodeId)return true;for(const c of n.children)if(seek(c))return true;chain.pop();return false;}for(const r of tree.roots)if(seek(r))return chain.slice();return [];}
function filtered(roots,query='',category='all'){
 const q=String(query).toLowerCase().trim();function copy(n){let kids=n.children.map(copy).filter(Boolean);const self=(!q||[n.label,n.meta,n.ref?.id].some(x=>String(x||'').toLowerCase().includes(q)))&&(category==='all'||(n.kind==='asset'&&n.ref?.type===category)||(n.kind==='component'&&n.ref?.type===category));
  if(n.kind==='component'&&category!=='all'&&n.ref?.type!==category&&!q)return null;
  if(!self&&!kids.length)return null;return{...n,children:kids};}
 return roots.map(copy).filter(Boolean);
}
const api={inferSystem,parentPlanet,tree,path,filtered};root.StarfallAssetHierarchy7B1=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
