/* CW03: deterministic mineral interpretation, color-only; never modifies terrain heights.
 * Derived from the existing CW01 rock/metal/volatile inventory. The interpreted
 * regional lithology is a procedural prior, not a measured geological sample.
 */
(function(root){'use strict';
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a*(1-t)+b*t;
const palettes=Object.freeze({
 basalt:[.27,.28,.30],silicate:[.51,.48,.43],ironRich:[.53,.30,.21],
 ultramafic:[.31,.36,.29],sulfur:[.66,.52,.18],regolith:[.46,.43,.39]
});
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(id,seed,region){let x=hash(seed+':'+id+':cw03:'+region);x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
function lithology(body,dir,height=0,field=.5){if(!body?.id||!Array.isArray(dir)||dir.length!==3)throw Error('CW03 requires body ID and local direction');
 const c=root.StarfallCompositionCW01?.bodyFor(body,Number.isInteger(body.galaxySeed)?body.galaxySeed:742);const seed=Number.isInteger(body.seed)?body.seed:742;
 const metal=c?.bulkComponentMassFractions?.metal??.2, silicate=c?.bulkComponentMassFractions?.silicate??.7;
 const key=dir.map(v=>Math.floor((v+1)*18)).join('/'),r=random(body.id,seed,key),volcanic=body.type==='Volcanic';
 const iron=metal>.37&&r<.58?'ironRich':null;
 const name=volcanic?(r>.78?'sulfur':'basalt'):iron||(r<.17?'ultramafic':silicate>.6?'silicate':'regolith');
 const mineral=clamp(metal*(.75+.5*r));
 return Object.freeze({bodyId:body.id,region:key,name,modeledIronFraction:mineral,modeledSilicateFraction:silicate,model:'CW03 procedural lithology prior',color:Object.freeze(palettes[name])});
}
function tint(body,dir,height,field,base,biome){
 if(biome?.material==='water'||biome?.material==='ice')return base;if(!body?.landable||!['Rocky','Desert','Temperate','Ocean','Volcanic','Lush','Shattered'].includes(body.type))return base;
 const geo=lithology(body,dir,height,field),weight=body.type==='Ocean'||body.type==='Lush'?.11:.31;
 return base.map((v,i)=>clamp(mix(v,geo.color[i],weight)));
}
const API=Object.freeze({lithology,tint,palettes});
root.StarfallGeologyCW03=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
