/* STARFALL 6B — Deterministic, planet-fixed biome classification.
   Science-constrained PROCEDURAL APPROXIMATION: no inference of confirmed life.
   Never modifies the authoritative collision height, orbit, or persistent IDs.
   Exactly the same body seed and normalized local direction always produce the
   same regional climate, biome, palette, and decorative landmark categories.
*/
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
function h3(x,y,z,s){let h=(Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(s,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function noise(x,y,z,s){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const q=(aa,bb,cc)=>mix(mix(h3(ix,iy,iz, s),h3(ix+1,iy,iz,s),aa),mix(h3(ix,iy+1,iz,s),h3(ix+1,iy+1,iz,s),aa),bb);return mix(q(a,b,c),mix(mix(h3(ix,iy,iz+1,s),h3(ix+1,iy,iz+1,s),a),mix(h3(ix,iy+1,iz+1,s),h3(ix+1,iy+1,iz+1,s),a),b),c);}
function normalized(direction){const len=Math.hypot(...direction);if(!Number.isFinite(len)||len<1e-12)throw Error('Invalid planet-fixed biome direction');return direction.map(v=>v/len);}
const profiles=new WeakMap();
function profile(body){const old=profiles.get(body);if(old&&old.worldType===body.type&&old.kind===body.kind&&old.seed===(body.seed>>>0)&&old.lifeFlag===!!body.life)return old;const t=body.type,moon=body.kind==='moon',types={Rocky:[.09,.10,.32],Desert:[.14,.03,.87],Ice:[.06,.11,.04],Temperate:[.52,.56,.52],Ocean:[.84,.86,.60],Volcanic:[.02,.01,.98],Lush:[.79,.81,.65],Shattered:[0,0,.52],'Gas Giant':[0,0,.30]};const a=types[t]||types.Rocky;
 const air=String(body.atmosphere||'').toLowerCase();const atmosphere=moon||air.includes('vacuum')?0:air.includes('trace')?.03:body.kind==='planet'?1:0;
 // The legacy generator assigns `life` by world category. Treat it as POTENTIAL,
 // never verified evidence. Airless moons intentionally have no flora/fauna.
 const supportsFlora=!!body.life&&!moon&&atmosphere>.25&&['Lush','Temperate','Ocean'].includes(t);
 const result=Object.freeze({worldType:t,kind:body.kind,moisture:a[0],lifeFlag:!!body.life,lifePotential:supportsFlora,atmosphere,geologicActivity:a[2],typeTemperature:a[1],planetId:body.id,seed:body.seed>>>0,model:'seeded climate approximation; no verified biosignatures'});profiles.set(body,result);return result;
}
const PAL={
 'Abyssal shelf':[[.018,.09,.16],[.10,.23,.31],'water','none'],
 'Shallow sea':[[.06,.24,.27],[.20,.40,.38],'water','none'],
 'Tidal flats':[[.39,.39,.27],[.62,.59,.43],'salt','sediment'],
 'Coastal escarpment':[[.24,.34,.32],[.49,.54,.45],'rock','column'],
 'Wetland':[[.12,.25,.17],[.28,.43,.25],'soil','flora'],
 'Canopy basin':[[.09,.23,.13],[.30,.43,.19],'soil','flora'],
 'Fungal grove':[[.20,.19,.31],[.36,.29,.42],'soil','fungal'],
 'Shrubland':[[.29,.33,.21],[.54,.52,.36],'soil','scrub'],
 'Highland forest':[[.23,.32,.23],[.52,.51,.39],'upland','flora'],
 'Alpine ridge':[[.39,.41,.39],[.75,.73,.68],'rock','column'],
 'Badlands':[[.33,.23,.16],[.63,.39,.25],'rock','column'],
 'Salt pan':[[.63,.61,.48],[.82,.74,.56],'salt','sediment'],
 'Amber dunes':[[.55,.31,.17],[.85,.62,.34],'sand','dune'],
 'Dry riverbed':[[.28,.24,.21],[.58,.44,.32],'sand','sediment'],
 'Canyonlands':[[.36,.23,.16],[.72,.46,.27],'rock','column'],
 'Glacier':[[.42,.69,.76],[.79,.90,.94],'ice','ice'],
 'Frost plain':[[.53,.64,.70],[.91,.93,.94],'ice','ice'],
 'Cryogenic ridge':[[.30,.54,.66],[.64,.82,.87],'ice','ice'],
 'Frost crystals':[[.40,.56,.69],[.76,.81,.90],'ice','crystal'],
 'Obsidian plain':[[.09,.10,.12],[.30,.24,.23],'igneous','column'],
 'Sulfur field':[[.43,.35,.13],[.75,.59,.20],'igneous','vent'],
 'Lava fracture':[[.35,.13,.06],[.81,.30,.05],'igneous','vent'],
 'Ash basin':[[.22,.21,.22],[.46,.39,.38],'igneous','sediment'],
 'Cratered regolith':[[.29,.29,.27],[.58,.53,.44],'rock','rock'],
 'Crystal outcrop':[[.20,.32,.33],[.43,.60,.61],'rock','crystal'],
 'Eroded plateau':[[.30,.29,.24],[.58,.54,.47],'rock','column'],
 'Impact ejecta':[[.27,.26,.28],[.54,.50,.46],'rock','rock'],
 'Orbital debris':[[.25,.20,.21],[.49,.40,.39],'rock','rock']
};
function classify(body,dir,height,fieldValue,precomputed){const d=normalized(dir),p=precomputed||profile(body),type=p.worldType;
 const region=noise(d[0]*9.7+3,d[1]*9.7+7,d[2]*9.7+1,p.seed+101),sub=clamp((fieldValue??.5)*1.4-.2),latitude=Math.abs(d[1]),localMoisture=clamp(p.moisture+.55*(region-.5)+.12*(sub-.5)-height*.0028),cold=clamp(latitude*.7+height*.004+(type==='Ice'?.38:0)-p.typeTemperature*.27);
 let name='Cratered regolith';
 if(type==='Gas Giant')name='Abyssal shelf';
 else if(type==='Shattered')name='Orbital debris';
 else if(['Ocean','Temperate','Lush'].includes(type)&&height<1)name=region>.68?'Shallow sea':'Abyssal shelf';
 else if(type==='Ice')name=height>61?'Cryogenic ridge':region>.72?'Frost crystals':region<.22?'Glacier':'Frost plain';
 else if(type==='Volcanic')name=region>.72?'Lava fracture':region<.22?'Ash basin':sub>.66?'Sulfur field':'Obsidian plain';
 else if(type==='Desert')name=height<13&&region<.36?'Salt pan':height>58?'Canyonlands':sub<.20?'Dry riverbed':region>.72?'Badlands':'Amber dunes';
 else if(type==='Rocky')name=height>64?'Eroded plateau':region>.75?'Crystal outcrop':sub<.15?'Impact ejecta':'Cratered regolith';
 else if(type==='Ocean'&&height<13)name='Tidal flats';
 else if(type==='Ocean'&&height>62)name='Coastal escarpment';
 else if(cold>.77)name='Alpine ridge';
 else if(height>75)name='Alpine ridge';
 else if(p.lifePotential&&localMoisture>.72)name=type==='Lush'&&sub>.77?'Fungal grove':'Canopy basin';
 else if(p.lifePotential&&localMoisture>.51)name='Highland forest';
 else if(p.lifePotential&&localMoisture>.31)name='Shrubland';
 else if(type==='Temperate'||type==='Lush')name=region<.22?'Badlands':'Shrubland';
 const a=PAL[name],life=p.lifePotential&&['Wetland','Canopy basin','Fungal grove','Shrubland','Highland forest'].includes(name);
 return{name,material:a[2],feature:a[3],lifePotential:life,moisture:localMoisture,temperatureClass:cold,region,sub,latitude};
}
function color(body,dir,height,fieldValue,precomputed){const sample=precomputed||classify(body,dir,height,fieldValue),palette=PAL[sample.name];if(!palette)return[.4,.4,.4];
 const t=clamp(.25+.55*sample.sub+.21*fieldValue+.1*Math.min(height/110,1)),latitude=sample.latitude;
 const mixed=palette[0].map((x,i)=>mix(x,palette[1][i],t));const frost=Math.max(0,(latitude-.91)*9)*(body.type==='Volcanic'||body.type==='Desert'?0:1);
 const visual=mixed.map((x,i)=>clamp(mix(x,[.78,.84,.88][i],frost)));const mineral=root.StarfallGeologyCW03?.tint(body,dir,height,fieldValue,visual,sample)||visual;return root.StarfallGeologyLW02?.strataTint(body,dir,height,fieldValue,mineral,sample)||mineral;
}
function descriptor(body,dir,height=0,fieldValue=.5){return classify(body,dir,height,fieldValue);}
function decoration(biome,r){if(biome.material==='water')return'none';const x=r();if(x<.09)return'rock';switch(biome.feature){case'flora':return biome.lifePotential?(x>.16?'flora':'rock'):'rock';case'fungal':return biome.lifePotential?(x>.15?'fungal':'rock'):'rock';case'scrub':return biome.lifePotential?(x>.19?'scrub':'rock'):'rock';case'crystal':return x>.30?'crystal':'rock';case'ice':return x>.25?'ice':'rock';case'column':return x>.42?'column':'rock';case'vent':return x>.38?'vent':'rock';case'dune':return x>.52?'dune':'rock';case'sediment':return x>.62?'sediment':'rock';default:return'rock';}}
const API=Object.freeze({profile,noise,classify,descriptor,color,decoration,PAL,modelVersion:1});
root.StarfallBiomes=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
