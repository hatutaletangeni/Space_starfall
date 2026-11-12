/* STARFALL — Living Biosphere 9A: bounded, seeded local food webs.
 * Biological/chemical STOICHIOMETRY is represented in kg; behavior, life
 * history, climate suitability and soil fertility are gameplay approximations.
 * Local patches do NOT debit the global 8J atmosphere or industrial stock.
 * No changes to star IDs, terrain anchors, discoveries, or habitats.
 */
(function(root){'use strict';
const SCHEMA=1,STEP_S=600,MAX_STEPS=96,MAX_AGENTS=12,MAX_PATCHES=80,DAY=86400;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const rand=s=>{let h=hash(s);h^=h<<13;h^=h>>>17;h^=h<<5;return(h>>>0)/4294967296;};
const round=x=>Math.max(0,Math.round(x*1e8)/1e8);
// Glucose-like biomass proxy: CO2 + H2O -> CH2O + O2, mass-balanced.
// All coefficients derive from molar masses 44.01, 18.015, 30.027, 31.998 g.
const CO2=44.01/30.02728,WATER=18.01528/30.02728,OXYGEN=31.998/30.02728;
const EPS=1e-10;
function chemistry(body,seed=742){const F=root.StarfallFieldScience,comp=root.StarfallCompositionCW01;
 const p=F?.profile(body,seed)||{temperatureK:280,pressurePa:0,waterIcePotential:0};
 const mix=comp?.bodyFor?.(body,seed)?.atmosphereMoleFractions||{};
 return {temperatureK:p.temperatureK,pressurePa:p.pressurePa,water:clamp(p.waterIcePotential),
  oxygen:clamp(mix.O2||0),co2:clamp(mix.CO2||0),nitrogen:clamp(mix.N2||0),
  compositionModel:comp?"CW01 seeded prior":"legacy compatible estimate"};}
function world(body,seed=742,galaxy){
 if(!body?.id||!body.landable||body.type==='Gas Giant'||body.type==='Shattered')
  return Object.freeze({level:0,reason:'No stable accessible biosphere'});
 const c=chemistry(body,seed),luminous=galaxy?.byId?.get(body.systemId)?.star;
 const P=root.StarfallPhysics,star=luminous&&P?.starProfile?.(luminous);
 const dist=Math.max(star?.radiusM||1,(body.orbitRadius||1)*1000);
 const flux=star?.luminosityW/(4*Math.PI*dist*dist)||0;
 const fluxFactor=flux>0?clamp(flux/1361,0,4):1;
 const therm=clamp(1-Math.abs(c.temperatureK-290)/70);
 const liquid=clamp(c.water/.35)*clamp((c.pressurePa-550)/18000);
 const air=clamp(c.pressurePa/18000),radiation=fluxFactor>0?clamp(fluxFactor/4):0;
 const viable=!!body.life&&c.temperatureK>=230&&c.temperatureK<=340&&c.pressurePa>=1800&&c.water>.15;
 const subsurface=body.kind==='moon'&&body.type==='Ice'&&c.water>.30&&
   rand(seed+':'+body.id+':subsurface')>.97;
 const life=viable||subsurface;
 const complexity=life?clamp(.35*therm+.28*liquid+.25*air+.12*(1-radiation)):0;
 const level=!life?0:subsurface?1:complexity<.38?1:complexity<.56?2:complexity<.73?3:4;
 const biologicalIntelligence=level>=4&&rand(seed+':'+body.id+':sapience')>.998?3:
   level>=3&&rand(seed+':'+body.id+':social')>.7?2:level>=3?1:0;
 const speciesCount=level===0?0:Math.max(1,Math.round(1+level*2+rand(seed+':'+body.id+':diversity')*level*3));
 return Object.freeze({bodyId:body.id,level,subsurface,life,complexity,speciesCount,
  intelligenceTier:biologicalIntelligence,fluxWm2:flux,fluxFactor,temperatureK:c.temperatureK,
  pressurePa:c.pressurePa,waterPotential:c.water,oxygenFraction:c.oxygen,
  carbonDioxideFraction:c.co2,model:'Seeded speculative life potential; no confirmed extraterrestrial biology',
  reason:life?'Biochemistry/temperature/water threshold passed':'Unavailable water, temperature, pressure or inherited life potential'});
}
function agent(site,i,role,timeS,seed,traits){
 const h=site.id+':'+role+':'+i+':'+seed,adult=(role==='predator'||role==='aquatic_predator')?(3+14*rand(h+':size')):role==='flier'?(.25+1.8*rand(h+':size')):role==='filterer'?(.25+2.2*rand(h+':size')):role==='detritivore'?(.18+1.4*rand(h+':size')):(.4+5*rand(h+':size'));
 return {id:'bio-'+hash(h).toString(36),role,ageS:DAY*(.5+rand(h+':age')*10),
  lifeS:DAY*((role==='predator'||role==='aquatic_predator')?25:role==='flier'?12:role==='filterer'?10:role==='detritivore'?14:17)*(0.7+rand(h+':life')*.7),
  massKg:adult*(.5+.5*rand(h+':mass')),sizeM:Math.pow(adult,1/3)*(.5+rand(h+':shape')*.8),
  energy:.5+.35*rand(h+':energy'),generation:0,lastEvent:'forage',
  // Mixotrophic 4-sail variants derive light energy from source CO2 and water.
  phototrophic:role==='flier'&&rand('bio-'+hash(h).toString(36)+':sails')>.32};
}
function seedPatch(site,body,seed=742,galaxy=null,atS=0){
 if(!site?.id||!body||site.kind==='fossil'||site.group==='trace')return null;
 const info=world(body,seed,galaxy);if(!info.life||info.subsurface)return null;
 const h=site.id+':biosphere:'+seed,richness=.4+.6*rand(h+':richness');
 const floraKg=info.level>=2?(6+18*richness):(.4+3*richness);
 const agents=[],aquatic=site.kind==='jelly'||site.kind==='eel';
 if(aquatic&&info.level>=2&&info.waterPotential>.30){
  // Water-column filter feeders and hunters own real finite food/oxygen ledgers.
  for(let i=0;i<3;i++)agents.push(agent(site,i,'filterer',atS,seed));
  if(info.level>=4&&(site.kind==='eel'||rand(h+':aquatic-hunter')>.45))
   agents.push(agent(site,0,'aquatic_predator',atS,seed));
 }else if(!aquatic&&info.level>=3){
  for(let i=0;i<Math.min(4,2+Math.floor(rand(h+':herd')*3));i++)agents.push(agent(site,i,'grazer',atS,seed));
  // Soil animals mineralize detritus in addition to the existing microbial loop.
  if(site.kind==='crawler'||rand(h+':detritivore')>.55)
   agents.push(agent(site,0,'detritivore',atS,seed));
  // Winged nectar-feeders are independent population members.
  if(info.pressurePa>=22000&&(site.kind==='flier'||rand(h+':winged')>.72)){
   const flyers=site.kind==='flier'?2:1;
   for(let i=0;i<flyers;i++)agents.push(agent(site,i,'flier',atS,seed));
  }
  if(info.level>=4&&rand(h+':hunter')>.3)agents.push(agent(site,0,'predator',atS,seed));
 }
 return {schema:SCHEMA,id:site.id,bodyId:body.id,seed,level:info.level,lastS:Math.max(0,Math.floor(atS/STEP_S)*STEP_S),
  stepNo:0,plantKg:floraKg,plantAgeDays:12+rand(h+':plantage')*25,
  detritusKg:.4+rand(h+':litter')*2,waterKg:10+50*info.waterPotential,
  carbonDioxideKg:Math.max(8,floraKg*6),oxygenKg:info.oxygenFraction>0?40+80*info.oxygenFraction:0,
  fertility:clamp(.36+.55*richness,.05,1),agents,serial:agents.length,
  births:0,deaths:0,plantBirths:0,plantDeathsKg:0,consumedPlantsKg:0,
  kills:0,decayedKg:0,traitSeed:hash(h+':traits'),
  speciesCount:info.speciesCount,intelligenceTier:info.intelligenceTier,model:'local 100m² conceptual food-web parcel; atmospheric values not planetary inventories'};
}
function mass(s){return s.plantKg+s.detritusKg+s.waterKg+s.carbonDioxideKg+s.oxygenKg+
 s.agents.reduce((a,x)=>a+x.massKg,0);}
function takeBiomass(s,kg){const n=Math.max(0,Math.min(kg,s.detritusKg));s.detritusKg-=n;return n;}
function respire(s,kg){
 // Photosynthesis reversed. Reaction limited by oxygen, no negative reservoirs.
 const enough=Math.min(Math.max(0,kg),s.oxygenKg/OXYGEN);
 s.oxygenKg-=enough*OXYGEN;s.carbonDioxideKg+=enough*CO2;s.waterKg+=enough*WATER;
 return enough;
}
function photo(s,kg){const n=Math.min(Math.max(0,kg),s.carbonDioxideKg/CO2,s.waterKg/WATER);
 s.carbonDioxideKg-=n*CO2;s.waterKg-=n*WATER;s.oxygenKg+=n*OXYGEN;s.plantKg+=n;
 return n;
}
function environment(body,local,timeS,seed=742,galaxy){
 const w=world(body,seed,galaxy),B=root.StarfallBiomes;
 const p=B?.profile?.(body),moisture=clamp(p?.moisture??w.waterPotential??.3);
 let sunshine=clamp((w.fluxFactor||1)/1.5),heat=w.temperatureK||290;
 const met=root.StarfallMeteorologyLW03;
 if(met?.cell&&Array.isArray(local)){
  const c=met.cell(body,local,timeS,seed);
  if(finite(c?.temperatureK))heat=c.temperatureK;
  if(finite(c?.cloudFraction))sunshine*=1-.7*clamp(c.cloudFraction);
 }
 const temp=clamp(1-Math.abs(heat-290)/85),light=clamp(sunshine*temp),water=moisture;
 return {light,water,temp,oxygen:w.oxygenFraction,level:w.level,bodyId:body.id};
}
function tick(s,e){const dt=STEP_S/DAY;
 // Finite local carbon and water. Plants have growth, senescence and litter.
 const space=clamp(1-s.plantKg/(120*(.25+.75*s.fertility)));
 const requested=s.plantKg*(.14*e.light*e.water*s.fertility*space)*dt;
 const grown=photo(s,requested);s.plantBirths+=grown>0?1:0;
 const senescence=Math.min(s.plantKg,s.plantKg*(.012+(1-e.temp)*.025)*dt);
 s.plantKg-=senescence;s.detritusKg+=senescence;s.plantDeathsKg+=senescence;s.plantAgeDays+=dt;
 // Grazers consume vegetation; predators can capture a real individual.
 const survivors=[];
 for(const a of s.agents){
  // A prey eaten earlier this tick must not feed or metabolize after it died.
  if(a.killed)continue;
  a.ageS+=STEP_S;const isHunter=a.role==='predator'||a.role==='aquatic_predator';
  const hunger=a.massKg*(isHunter?.025:a.role==='flier'?.18:a.role==='detritivore'?.09:.13)*dt;
  let food=0;
  if(a.role==='grazer'||a.role==='flier'||a.role==='filterer'){
   food=Math.min(s.plantKg,hunger*(a.role==='flier'?1.9:a.role==='filterer'?1.75:2.4));
   s.plantKg-=food;s.consumedPlantsKg+=food;
  }else if(a.role==='detritivore'){
   food=Math.min(s.detritusKg,hunger*1.7);s.detritusKg-=food;
  }else{
   const prey=s.agents.filter(x=>(a.role==='aquatic_predator'?x.role==='filterer':['grazer','flier','detritivore'].includes(x.role))&&!x.killed&&x.ageS>DAY&&x.energy<.75);
   const chance=clamp((.1+.8*(1-a.energy))*(prey.length/4)*dt);
   if(prey.length&&rand(a.id+':hunt:'+s.stepNo)<chance){
    const victim=prey[Math.floor(rand(a.id+':target:'+s.stepNo)*prey.length)];
    if(!victim.killed){victim.killed=true;food=victim.massKg;s.kills++;s.deaths++;}
   }
  }
  // Aerial lattice-sail variants harvest light using the SAME finite 9A
  // photosynthesis reservoirs. Transfer new organic mass directly to the
  // organism instead of leaving phantom vegetation in the patch.
  let phototrophy=0;
  if(a.role==='flier'&&(a.phototrophic??(rand(a.id+':sails')>.32))&&e.light>0){
   phototrophy=photo(s,a.massKg*.018*e.light*dt);
   s.plantKg-=phototrophy;a.massKg+=phototrophy;
   a.energy=clamp(a.energy+phototrophy/Math.max(EPS,a.massKg)*.5,0,1);
  }
  // Digestion: assimilated tissue, indigestible waste, oxidative respiration.
  const growth=food*.19,excreta=food*.29,resp=food-growth-excreta;
  a.massKg+=growth;s.detritusKg+=excreta;
  const oxidation=respire(s,resp);
  s.detritusKg+=resp-oxidation;
  a.energy=clamp(a.energy+(food/Math.max(EPS,hunger)-1)*.11*dt,0,1);
  a.lastEvent=food>0?(isHunter?'hunting':a.role==='detritivore'?'scavenging':a.role==='filterer'?'filtering':'grazing'):phototrophy>0?'basking':'hungry';
  // Resting metabolism burns stored mass (not created mass).
  const basal=Math.min(a.massKg,a.massKg*(isHunter?.008:a.role==='flier'?.024:.014)*dt);
  a.massKg-=basal;const basalOx=respire(s,basal);s.detritusKg+=basal-basalOx;
  if(a.killed||a.ageS>=a.lifeS||a.massKg<.035||a.energy<=.005){
    if(!a.killed)s.deaths++;
    if(!a.killed)s.detritusKg+=a.massKg;
    continue;
  }
  survivors.push(a);
 }
 s.agents=survivors.filter(a=>!a.killed);
 // Reproduction is paid for by parent mass/energy; a new unique individual is born.
 for(const a of s.agents.slice()){
  if(s.agents.length>=MAX_AGENTS)break;
  const maturity=DAY*((a.role==='predator'||a.role==='aquatic_predator')?7:a.role==='flier'?3:4);
  if(a.ageS<maturity||a.energy<.79||a.massKg<((a.role==='predator'||a.role==='aquatic_predator')?3:a.role==='flier'?.24:a.role==='filterer'?.20:a.role==='detritivore'?.15:1))continue;
  if(rand(a.id+':birth:'+s.stepNo)>.030*dt)continue;
  const childMass=a.massKg*.25;a.massKg-=childMass;a.energy-=.23;
  const id='bio-'+hash(s.id+':offspring:'+s.serial+':'+s.seed).toString(36);
  s.agents.push({id,role:a.role,ageS:0,lifeS:a.lifeS*(.85+.3*rand(id+':life')),
   massKg:childMass,sizeM:a.sizeM*.65,energy:.62,generation:a.generation+1,lastEvent:'newborn',phototrophic:!!a.phototrophic});
  s.serial++;s.births++;
 }
 // Decomposers mineralize dead biomass and restore fertility, subject to O2.
 const decay=takeBiomass(s,s.detritusKg*(.038+.042*e.temp)*dt);
 const oxidized=respire(s,decay);s.detritusKg+=decay-oxidized;s.decayedKg+=oxidized;
 s.fertility=clamp(s.fertility+.003*oxidized-.00024*grown,.025,1);
 s.stepNo++;
 // Remove tiny roundoff only; never invent material or negative stocks.
 for(const k of ['plantKg','detritusKg','waterKg','oxygenKg','carbonDioxideKg']){
  if(!finite(s[k])||s[k]<-1e-7)throw Error('Invalid biosphere reservoir '+k);
  s[k]=Math.max(0,s[k]);
 }
}
function advance(patch,timeS,env,maxSteps=MAX_STEPS){
 if(!patch||patch.schema!==SCHEMA||!finite(timeS)||timeS<0)throw Error('Invalid biosphere timestamp/state');
 if(!Number.isInteger(maxSteps)||maxSteps<0||maxSteps>MAX_STEPS)throw Error('Invalid biosphere work budget');
 const s=JSON.parse(JSON.stringify(patch));let count=0;
 while(s.lastS+STEP_S<=timeS&&count<maxSteps){tick(s,env);s.lastS+=STEP_S;count++;}
 return {state:s,steps:count,pendingS:Math.max(0,timeS-s.lastS)};
}
function sanitize(input){if(!Array.isArray(input))return [];
 const out=[],seen=new Set();for(const s of input.slice(-MAX_PATCHES*2)){
  if(!s||s.schema!==SCHEMA||typeof s.id!=='string'||!/^eco-[a-z0-9]+$/.test(s.id)||
   typeof s.bodyId!=='string'||s.bodyId.length>180||!finite(s.lastS)||s.lastS<0||
   !Number.isInteger(s.stepNo)||s.stepNo<0||!Number.isInteger(s.serial)||s.serial<0||
   !['plantKg','detritusKg','waterKg','carbonDioxideKg','oxygenKg','fertility'].every(k=>finite(s[k])&&s[k]>=0)||
   !Array.isArray(s.agents)||s.agents.length>MAX_AGENTS||seen.has(s.bodyId+':'+s.id))continue;
  const agents=s.agents.filter(a=>a&&typeof a.id==='string'&&['grazer','flier','predator','detritivore','filterer','aquatic_predator'].includes(a.role)&&
    ['ageS','lifeS','massKg','sizeM','energy'].every(k=>finite(a[k])&&a[k]>=0)).slice(0,MAX_AGENTS);
  if(agents.length!==s.agents.length)continue;
  seen.add(s.bodyId+':'+s.id);out.push({...s,agents});if(out.length>=MAX_PATCHES)break;
 }return out;
}
const API=Object.freeze({SCHEMA,STEP_S,MAX_STEPS,MAX_AGENTS,MAX_PATCHES,world,environment,seedPatch,advance,sanitize,mass,chemistry,stoichiometry:Object.freeze({CO2,WATER,OXYGEN})});
root.StarfallLivingBiosphere=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
