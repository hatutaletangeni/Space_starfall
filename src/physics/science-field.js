/* STARFALL 4A — deterministic planetary truth, calibrated instruments, evidence.
   SI readings are approximations derived from existing world seeds. No game rewards. */
(function(root){'use strict';
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0;};
const rand=s=>{let x=hash(s);x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const INSTRUMENTS=Object.freeze({
 spectrometer:{name:'Spectrometer',quantity:'silicateFraction',unit:'fraction',resolution:.015,uncertainty:.04,maxAltitudeM:800,seconds:4,powerW:140},
 thermometer:{name:'Thermometer',quantity:'temperatureK',unit:'K',resolution:.5,uncertainty:1.5,maxAltitudeM:1500,seconds:2,powerW:20},
 barometer:{name:'Barometer',quantity:'pressurePa',unit:'Pa',resolution:10,uncertainty:35,maxAltitudeM:1800,seconds:2,powerW:22},
 magnetometer:{name:'Magnetometer',quantity:'magneticFieldNT',unit:'nT',resolution:1,uncertainty:15,maxAltitudeM:1000,seconds:4,powerW:55},
 radar:{name:'Ground radar',quantity:'iceDepthM',unit:'m',resolution:.25,uncertainty:1.8,maxAltitudeM:50,seconds:8,powerW:480},
 seismometer:{name:'Seismometer',quantity:'seismicLevelMMs',unit:'mm/s',resolution:.001,uncertainty:.01,maxAltitudeM:3,seconds:10,powerW:85},
 sampler:{name:'Contact sampler',quantity:'ironFraction',unit:'fraction',resolution:.005,uncertainty:.018,maxAltitudeM:3,seconds:7,powerW:160},
 bioassay:{name:'Field bioassay',quantity:'biosignatureIndex',unit:'index',resolution:.01,uncertainty:.08,maxAltitudeM:5,seconds:8,powerW:180}
});
function profile(body,seed=742){if(!body||!body.id)throw Error('Missing body');const k=seed+':'+body.id,type=(body.type||'Rocky').toLowerCase(),ice=/ice|frozen|glacial|tundra/.test(type),volcanic=/volcan|lava|magma/.test(type),gas=/gas|giant/.test(type),temperate=/temper|ocean|forest|lush/.test(type);
 const mix=rand(k+':sil'),iron=clamp(.06+rand(k+':iron')*.34+(volcanic?.09:0),.01,.63),silicate=clamp(.26+.38*mix-(ice?.13:0),.03,.8),water=clamp((ice?.45:temperate?.27:.04)+rand(k+':water')*.23,0,.92),mag=(rand(k+':field')-.15)*25000;
 const pressure=gas?1.1e6:body.kind==='moon'?0:/vacuum|airless/.test(type)?0:(.015+rand(k+':pressure')*1.4)*101325;
 const baseK=(ice?155:volcanic?450:temperate?282:245)+70*(rand(k+':temp')-.5);
 return Object.freeze({bodyId:body.id,seed,model:'seeded approximation / not measured',silicateFraction:silicate,ironFraction:iron,waterIcePotential:water,temperatureK:baseK,pressurePa:pressure,magneticFieldNT:mag,iceDepthM:Math.max(0,(ice?1:water*.4)*rand(k+':depth')*60),seismicLevelMMs:(volcanic?.12:.015)*rand(k+':seismic'),biosignatureIndex:clamp((body.life&&body.kind!=='moon'&&temperate&&baseK>=235&&baseK<=335&&pressure>=1800? .35+.42*rand(k+':potential-organic'): .015+.055*rand(k+':abiotic-organics')),0,1),volatileFraction:clamp(1-iron-silicate,0,1)});}
function localTruth(body,seed,local,simTime=0){const p=profile(body,seed),vec=Array.isArray(local)?local:[0,1,0],lat=clamp(vec[1],-1,1),lon=Math.atan2(vec[2],vec[0]);const patch=rand(seed+':'+body.id+':patch:'+Math.floor(lat*38)+':'+Math.floor(lon*38)),diurnal=Math.sin(simTime*Math.PI*2/Math.max(30,body.spinPeriod||500)+lon);
 const geo=root.StarfallGeothermalLW01?.local(body,vec,simTime,seed,p.pressurePa,Math.max(.25,(body.gravity||1)*9.80665));const geothermalK=geo?.thermalExposure?Math.min(90,(geo.radiativeHeatFluxWm2||0)/30+geo.thermalExposure*8):0;const geothermalSeismic=geo?.thermalExposure?geo.thermalExposure*.14:0;
 const weather=root.StarfallMeteorologyLW03?.cell(body,vec,simTime,seed);const ambientK=weather&&!weather.vacuum?weather.temperatureK:p.temperatureK+12*diurnal*Math.cos(lat)+10*(patch-.5);
 const sys=root.StarfallRuntime?.galaxy?.byId?.get(body.systemId);
 const starWeather=sys&&root.StarfallSpaceWeatherLW06?.exposure(sys,body.position,simTime,seed);
 const magneticResponse=starWeather?
  starWeather.magneticDisturbanceNT*(1-Math.min(.85,Math.abs(p.magneticFieldNT)/35000)*.66)*Math.abs(.35+.65*lat):0;
 const intervention=root.StarfallRuntime?.planetaryEngineeringView?.(body.id,vec);
 return{...p,pressurePa:Math.max(0,p.pressurePa+(intervention?.pressureDeltaPa||0)),temperatureK:ambientK+geothermalK+(weather&&!weather.vacuum?0:(intervention?.anomalyK||0)),magneticFieldNT:p.magneticFieldNT+320*(patch-.5)+magneticResponse,silicateFraction:clamp(p.silicateFraction+(.12*(patch-.5)),0,1),ironFraction:clamp(p.ironFraction+.09*(patch-.5),0,1),seismicLevelMMs:Math.max(0,p.seismicLevelMMs*(.5+patch)+geothermalSeismic),iceDepthM:p.iceDepthM*(.7+.6*patch),biosignatureIndex:clamp(p.biosignatureIndex+(.16*(patch-.5)),0,1)};}
function sample({body,seed=742,local=[0,1,0],altitudeM=0,instrument,simTime=0,energyAvailableJ=Infinity,calibrated=true,nonce=0}){
 const spec=INSTRUMENTS[instrument];if(!spec)throw Error('Unknown instrument');if(!body?.landable)throw Error('Requires a solid planetary surface');if(!Array.isArray(local)||local.length!==3||!local.every(Number.isFinite))throw Error('Invalid local position');
 if(!Number.isFinite(altitudeM)||altitudeM<0||altitudeM>spec.maxAltitudeM)throw Error(spec.name+' out of range: maximum '+spec.maxAltitudeM+' m');
 if(energyAvailableJ<spec.powerW*spec.seconds)throw Error('Not enough electrical energy for '+spec.name);
 const truth=localTruth(body,seed,local,simTime);if(instrument==='barometer'&&truth.pressurePa===0)return makeObservation(0,spec,truth,body,local,simTime,calibrated,nonce,seed,'vacuum');
 let val=truth[spec.quantity];if(instrument==='barometer')val*=Math.exp(-altitudeM/8500);if(instrument==='thermometer'&&truth.pressurePa>0)val-=.0065*altitudeM;return makeObservation(val,spec,truth,body,local,simTime,calibrated,nonce,seed,'estimated');
}
function makeObservation(value,spec,truth,body,local,simTime,calibrated,nonce,seed,quality){const uncertainty=spec.uncertainty*(calibrated?1:2.5),locationKey=local.map(x=>Math.round(x*100000)).join(':'),identity=body.id+':'+spec.quantity+':'+locationKey+':'+nonce;
 const noise=quality==='vacuum'?0:(rand(seed+':noise:'+identity)-.5)*2*uncertainty,observed=quality==='vacuum'?0:Math.round((value+noise)/spec.resolution)*spec.resolution;
 return Object.freeze({id:'obs-'+hash(seed+':'+identity).toString(36),kind:'measurement',bodyId:body.id,instrument:Object.keys(INSTRUMENTS).find(k=>INSTRUMENTS[k]===spec),parameter:spec.quantity,value:Math.max(spec.unit==='fraction'||spec.unit==='index'||spec.unit==='Pa'||spec.unit==='m'||spec.unit==='mm/s'?0:-Infinity,observed),unit:spec.unit,uncertainty,calibrated,quality,location:local.map(x=>Math.round(x*1e7)/1e7),timeS:Number.isFinite(simTime)?simTime:0,model:'procedural estimate',powerJ:spec.powerW*spec.seconds});}
function journal(saved){const entries=Array.isArray(saved?.entries)?saved.entries.filter(x=>x?.id&&Number.isFinite(x.value)):[];const seen=new Set(entries.map(x=>x.id));return{list:()=>entries.slice(),add(entry){if(!entry||seen.has(entry.id))return false;entries.push(entry);seen.add(entry.id);if(entries.length>500){entries.pop();seen.delete(entry.id);throw Error('Science journal full (500); export/archive real evidence before collecting further readings');}return true;},serialize:()=>({version:1,entries:entries.slice()})};}
function csv(entries){const headers=['id','bodyId','instrument','parameter','value','unit','uncertainty','timeS','model','biome','location'];const encode=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return headers.join(',')+'\n'+entries.map(e=>headers.map(h=>encode(h==='location'?e.location?.join(' / '):e[h])).join(',')).join('\n')+'\n';}
root.StarfallFieldScience={hash,rand,profile,localTruth,sample,journal,csv,INSTRUMENTS};if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallFieldScience;
})(globalThis);
