/* STARFALL 2B/2D optional observatory UI. Lazy, accessible and exportable. */
(function(root){'use strict';
const P=root.StarfallPhysics,RT=root.StarfallRuntime;if(!P||!RT)return;
const $=id=>document.getElementById(id);let selected=null,items=[],lastInfo=0;
const fmt=(v,unit='',digits=3)=>Number.isFinite(v)?Number(v).toLocaleString(undefined,{maximumSignificantDigits:digits})+(unit?' '+unit:''):'—';
const entry=(label,value,quality='Modelled')=>({label,value,quality});
function compositionRows(profile){
 const c=profile?.composition;if(!c)return [];
 const fmtPercent=v=>(100*v).toFixed(1)+'%';
 const names=Object.entries(c.kind==='star'?c.elementMassFractions:c.bulkComponentMassFractions||{})
   .filter(([,v])=>Number.isFinite(v)&&v>0.0001).sort((a,b)=>b[1]-a[1]).slice(0,5)
   .map(([key,v])=>key+' '+fmtPercent(v)).join(' · ');
 const atm=Object.entries(c.atmosphereMoleFractions||{}).filter(([,v])=>v>0.0001)
   .sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key,v])=>key+' '+fmtPercent(v)).join(' · ');
 const rows=[entry('CW composition version','v'+c.schema,'Seeded model — not measured'),
 entry('Bulk constituents (mass %)',names||'Unknown','Modelled prior; uncertain')];
 if(c.kind==='star'){
   rows.push(entry('Stellar metallicity',fmtPercent(c.metallicityMassFraction),'Seeded abundance prior'));
   const spectrum=selected&&root.StarfallStellarSpectraCW02?.profile(selected);
   if(spectrum)rows.push(entry('UV / visible / IR model fractions',
     ['ultraviolet','visible','infrared'].map(k=>k+' '+fmtPercent(spectrum.radiationBandFractions[k])).join(' · '),
     'Blackbody approximation — not an instrument reading'));
 }
 else {
   rows.push(entry('Atmospheric species (mole %)',atm||'Vacuum / unmodelled','Modeled mixture, not a gas reading'));
   const optics=selected&&root.StarfallAtmosphereCW05?.optical(selected,RT.galaxy.seed);
   if(optics?.meanMolarMassKgMol)rows.push(entry('Mean modeled molar mass',fmt(optics.meanMolarMassKgMol*1000,'g/mol'),
    'Computed from seeded gas mixture; not a pressure measurement'));
   const phase=profile.volatilePhases;
   if(phase?.volatiles?.H2O)rows.push(entry('H₂O phase screen',phase.volatiles.H2O.state,'High uncertainty — equilibrium T, legacy pressure'));
 }
 return rows;
}
function geothermalRows(profile){
 if(profile?.kind==='star'||!selected?.landable||!root.StarfallGeothermalLW01)return [];
 const sites=root.StarfallGeothermalLW01.sources(selected,RT.galaxy.seed);
 const grouped={};for(const site of sites)grouped[site.kind]=(grouped[site.kind]||0)+1;
 const summary=Object.entries(grouped).map(([name,count])=>name+' ×'+count).join(' · ');
 return [entry('Geothermal site candidates',summary||'None','Seeded model, not mapped or confirmed'),
   entry('Geothermal interpretation','Pressure-driven cycles; local vents must be surveyed','Analytical model, not verified eruption animation')];
}
function livingGeologyRows(profile){
 const geo=root.StarfallGeologyLW02,engine=root.Starfall3D;
 if(profile?.kind==='star'||!selected?.landable||!geo)return[];
 const sites=geo.sites(selected,RT.galaxy.seed),dir=sites[0]?.local||[0,1,0];
 const height=engine?.groundHeight?engine.groundHeight(dir,selected):0;
 const regional=geo.landform(selected,dir,height,engine?.field?.(dir,selected.seed)??.5);
 return [entry('Subsurface candidate passages',sites.length+' · '+sites.map(x=>x.kind).join(' / '),
   'Deterministic candidates; entrances require surface approach'),
   entry('Regional landform',regional?.kind||'Unknown',regional?.cause||'Procedural geological prior'),
   entry('Terrain compatibility','Original heights unchanged','Preserves all existing saves, structures and landing sites')];
}
function rows(profile){if(!profile)return [];
 if(profile.kind==='star')return [entry('Stellar classification',profile.spectralClass),entry('Effective temperature',fmt(profile.effectiveTemperatureK,'K')),entry('Estimated mass',fmt(profile.massKg/P.MSUN,'M☉')),entry('Visual radius',fmt(profile.radiusM/1000,'km'),'Fictional render scale'),entry('Luminosity',fmt(profile.luminosityW/P.LSUN,'L☉')),entry('Gravitational parameter',fmt(profile.mu,'m³/s²')),...compositionRows(profile),...profile.warnings.map(w=>entry('Scale warning',w,'Compatibility'))];
 return [entry('Classification',profile.type+' '+profile.kind),entry('Bulk density',fmt(profile.bulkDensityKgM3,'kg/m³')),entry('Mass',fmt(profile.massKg,'kg')),entry('Surface gravity',fmt(profile.surfaceGravityMS2,'m/s²')),entry('Radius',fmt(profile.radiusM/1000,'km'),'Render-to-SI mapping'),entry('Bond albedo',fmt(profile.albedo)),entry('Equilibrium temperature',fmt(profile.estimatedEquilibriumTemperatureK,'K')+' ±'+fmt(profile.temperatureUncertaintyK,'K'),'Estimated (not measured)'),entry('Atmosphere at reference level',fmt(profile.atmospherePressurePa/1000,'kPa'),'Seeded approximation'),entry('Orbital semimajor axis',fmt(profile.orbit.semiMajorAxisM/1000,'km')),entry('Eccentricity',fmt(profile.orbit.eccentricity)),entry('Inclination',fmt(profile.orbit.inclinationRad*180/Math.PI,'°')),entry('Physical Kepler period',fmt(profile.orbit.keplerPeriodS/3600,'h')),entry('Legacy visual period',fmt(profile.orbit.legacyPeriodS/3600,'h'),'Compatibility'),entry('Visible illuminated fraction',fmt(profile.illuminatedFraction*100,'%'),'Geometry-derived'),entry('Planetary eclipse',profile.approximateEclipse?'Yes (simplified)':'No (simplified)','Geometry-derived'),entry('Sidereal spin period',fmt(profile.spinPeriodS,'s')),entry('Axial tilt',fmt(profile.axialTiltRad*180/Math.PI,'°')),entry('Geology signature',profile.geologySignature),entry('Water evidence',profile.waterEvidence,'Unverified'),entry('Life evidence',profile.lifeEvidence,'Unknown'),...compositionRows(profile),...geothermalRows(profile),...livingGeologyRows(profile),...profile.warnings.map(w=>entry('Physical deviation',w,'Compatibility'))];}
function getProfile(){RT.galaxy.observerPosition=RT.scenePosition;return selected?P.scienceProfile(RT.galaxy,selected):null;}
function fillBodies(){const focus=RT.target;let sys=focus.kind==='star'?RT.galaxy.byId.get(focus.systemId):RT.galaxy.byId.get(focus.systemId);
 if(sys?.dormant)RT.galaxy.activate(sys);
 RT.galaxy.pinnedSystemId=sys?.id||RT.galaxy.pinnedSystemId;
 items=sys?[sys.star,...sys.planets,...sys.planets.flatMap(p=>p.moons)]:[focus];
 const sel=$('obs-body');sel.replaceChildren();items.forEach(b=>{const opt=document.createElement('option');opt.value=b.id;opt.textContent=(b.kind==='star'?'✦ ':'◦ ')+b.name;sel.append(opt);});
 selected=items.find(b=>b.id===focus.id)||items[0];sel.value=selected.id;
}
function renderProfile(){const p=getProfile(),list=$('obs-grid');list.replaceChildren();$('obs-name').textContent=selected?.name||'—';$('obs-quality').textContent=p?.classification||'Unknown';
 const journal=root.StarfallScienceUI?.journal||[],observed=journal.filter(x=>x.bodyId===selected?.id&&
 (Number.isFinite(x.receivedAtS)||x.kind==='measurement')&&Number.isFinite(x.timeS)&&Number.isFinite(x.value));
 const latest=observed.sort((a,b)=>b.timeS-a.timeS).slice(0,6);
 for(const r of [{label:'Instrument evidence state',value:latest.length?'OBSERVED (seeded measurements)':'INFERRED / UNSCANNED',quality:latest.length?'Real source journal receipts, NOT calibrated astronomical truth':'Procedural catalogue only'},
 ...latest.map(x=>({label:'Observed '+x.instrument,value:String(x.value)+' '+(x.unit||'')+' at T+'+x.timeS.toFixed(1)+' s',quality:'Source '+(x.satelliteId||x.probeId||x.sourceAssetId||'field journal')+' · observation '+x.id})),
 ...rows(p)]){const tr=document.createElement('div');tr.className='science-row';const name=document.createElement('span');name.textContent=r.label;const val=document.createElement('strong');val.textContent=r.value;const quality=document.createElement('small');quality.textContent=r.quality;tr.append(name,val,quality);list.append(tr);}
 if(selected?.landable&&root.StarfallGeothermalLW01&&RT.plotSurfaceWaypoint){
  const vents=root.StarfallGeothermalLW01.sources(selected,RT.galaxy.seed);
  vents.forEach((site,i)=>{
   const button=document.createElement('button');button.type='button';button.className='site';
   const lat=Math.asin(site.direction[1])*180/Math.PI,lon=Math.atan2(site.direction[2],site.direction[0])*180/Math.PI;
   button.textContent='PLOT GEO '+(i+1)+' · '+site.kind+' · '+lat.toFixed(1)+'° / '+lon.toFixed(1)+'°';
   button.title='Set a normal flight waypoint to this seeded modeled vent; no teleport';
   button.onclick=()=>{try{RT.plotSurfaceWaypoint(selected.id,site.direction,site.kind+' vent '+(i+1));}
    catch(error){$('obs-caution').textContent=error.message;}};
   list.append(button);
  });
 }
 if(selected?.landable&&root.StarfallGeologyLW02&&RT.plotSurfaceWaypoint){
  const caves=root.StarfallGeologyLW02.sites(selected,RT.galaxy.seed);
  caves.forEach((site,i)=>{
   const button=document.createElement('button');button.type='button';button.className='site';
   const lat=Math.asin(site.local[1])*180/Math.PI,lon=Math.atan2(site.local[2],site.local[0])*180/Math.PI;
   button.textContent='PLOT CAVE '+(i+1)+' · '+site.kind+' · '+lat.toFixed(1)+'° / '+lon.toFixed(1)+'°';
   button.title='Normal flight waypoint to a deterministic cave entrance. Walk there in EVA and press X.';
   button.onclick=()=>{try{RT.plotSurfaceWaypoint(selected.id,site.local,site.kind+' cave '+(i+1));}
    catch(error){$('obs-caution').textContent=error.message;}};
   list.append(button);
  });
 }
 $('obs-caution').textContent=p?.notes||'Data is a deterministic procedural physical model. It is not an astronomical observation.';
}
function dataSnapshot(){const p=getProfile();return{schema:'starfall-science-v1',exportedSimulationSeconds:RT.time,galaxySeed:RT.galaxy.seed,bodyId:selected?.id,profile:p,assumptions:{sceneUnitMetres:P.SCENE_METERS_PER_UNIT,temperatureModel:'airless equilibrium, uniform redistribution',measurements:'Procedurally estimated; not direct instrument readings'}};}
function download(name,contents,type){const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvEscape(s){const t=String(s??'');return /[,\n\"]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}
function updateComputer(){const info=RT.engineeringInfo(),box=$('flight-data');if(!info){box.textContent='No local body in range.';return;}
 const e=info.elements;
 const stats=[['Inertial speed',fmt(info.inertialVelocityMS,'m/s')],['Ground-relative speed',fmt(info.groundVelocityMS,'m/s')],['Circular orbital speed',e?fmt(e.circularSpeedMS,'m/s'):'—'],['Apoapsis altitude',e&&Number.isFinite(e.apoapsisM)?fmt((e.apoapsisM-info.physical.radiusM)/1000,'km'):e?'ESCAPE':'—'],['Periapsis altitude',e?fmt((e.periapsisM-info.physical.radiusM)/1000,'km'):'—'],['Inclination',e?fmt(e.inclinationRad*180/Math.PI,'°'):'—'],['Estimated Δv',fmt(info.deltaVMS,'m/s')],['Wet mass',fmt(info.vehicle.massKg,'kg')],['Engine thrust',fmt(info.vehicle.thrustN/1000,'kN')],['TWR at surface',fmt(info.vehicle.thrustN/Math.max(1,info.vehicle.massKg*info.physical.surfaceGravityMS2),'×')],['Engine power',fmt(info.vehicle.enginePowerW,'W')],['Rated burn duration',fmt(info.vehicle.burnSeconds,'s')],['Battery charge',fmt(info.power?.state?.energyJ??RT.vehicleStore.get('ship').state.energyJ,'J')],['Fuel',fmt(info.craft.fuelKg,'kg')],['Drag',fmt(info.dragN,'N')],['Entry heating',fmt(info.heatingW,'W')],['Hull temp.',fmt(info.temperatureK,'K')]];
 box.replaceChildren();for(const [name,value] of stats){const row=document.createElement('div');row.className='fc-row';const a=document.createElement('span');a.textContent=name;const b=document.createElement('b');b.textContent=value;row.append(a,b);box.append(row);}
 drawTrajectory(info);
}
function drawTrajectory(info){const canvas=$('flight-trajectory');if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1720';ctx.fillRect(0,0,w,h);
 const r=info.rM,v=info.vMS,mu=info.physical.mu,R=info.physical.radiusM;
 let points=[];try{const period=info.elements?.bound?Math.min(info.elements.periodS,1e6):6000,step=period/60;points=StarfallFlightPhysics.predictTrajectory({rM:r,vMS:v},{mu,radiusM:R},64,step);}catch(_){points=[];}
 if(points.length<2){ctx.fillStyle='#9cabb3';ctx.font='11px Consolas';ctx.fillText('Orbit prediction unavailable',13,22);return;}
 const rr=P.vec.norm(r),normal=P.vec.norm(P.vec.cross(r,v)),t=P.vec.norm(P.vec.cross(normal,rr));
 const xy=points.map(p=>[P.vec.dot(p,rr),P.vec.dot(p,t)]),size=Math.max(R*1.1,...xy.map(p=>Math.hypot(...p))),scale=.44*Math.min(w,h)/Math.max(size,1);
 ctx.beginPath();ctx.arc(w/2,h/2,R*scale,0,2*Math.PI);ctx.fillStyle='#395466';ctx.fill();ctx.strokeStyle='#9ba7b6';ctx.stroke();
 ctx.beginPath();xy.forEach(([x,y],i)=>{const xx=w/2+x*scale,yy=h/2+y*scale;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});ctx.strokeStyle='#e7ba81';ctx.lineWidth=1.5;ctx.stroke();
 ctx.beginPath();ctx.arc(w/2+xy[0][0]*scale,h/2+xy[0][1]*scale,4,0,2*Math.PI);ctx.fillStyle='#86dce6';ctx.fill();
 ctx.font='10px Consolas';ctx.fillStyle='#c2d0d5';ctx.fillText('PREDICTED UNPOWERED ORBIT • LOCAL TWO-BODY',10,14);
 }
$('obs-open').onclick=()=>{fillBodies();renderProfile();$('observatory').hidden=false;};
$('obs-close').onclick=()=>{$('observatory').hidden=true;};
$('observatory').addEventListener('click',e=>{if(e.target===$('observatory'))$('observatory').hidden=true;});
$('obs-body').onchange=e=>{selected=items.find(b=>b.id===e.target.value)||null;renderProfile();};
$('obs-json').onclick=()=>download('starfall-'+(selected?.id||'science')+'.json',JSON.stringify(dataSnapshot(),null,2),'application/json');
$('obs-csv').onclick=()=>download('starfall-'+(selected?.id||'science')+'.csv','Property,Value,Quality\n'+rows(getProfile()).map(r=>[r.label,r.value,r.quality].map(csvEscape).join(',')).join('\n'),'text/csv');
$('orbit-model').onchange=e=>{if(e.target.checked&&RT.landed){alert('Experimental orbit switching is unavailable while landed. Fly to orbit first to avoid surface-coordinate discontinuities.');e.target.checked=false;return;}if(e.target.checked){const agree=confirm('Experimental Kepler orbits use a compatibility mass to preserve period, but eccentricity can move planets and landed assets. Switch visual orbits ON?');if(!agree){e.target.checked=false;return;}}
 RT.galaxy.physicsOrbits.setEnabled(e.target.checked);};
$('fc-mode').value=RT.engineering?'Engineering':'Assisted';$('fc-mode').onchange=e=>{RT.setFlightPhysicsMode(e.target.value);updateComputer();};
$('fc-attitude').value=RT.attitude;$('fc-attitude').onchange=e=>RT.setAttitude(e.target.value);
$('fc-toggle').onclick=()=>{$('fc-inner').hidden=!$('fc-inner').hidden;$('fc-toggle').setAttribute('aria-expanded',String(!$('fc-inner').hidden));updateComputer();};
addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('observatory').hidden){$('observatory').hidden=true;e.stopImmediatePropagation();}});
setInterval(()=>{if(document.hidden||$('fc-inner').hidden)return;updateComputer();},800);
root.StarfallObservatory={open:()=>{$('obs-open').click();},profile:()=>getProfile(),refresh:renderProfile};
})(globalThis);
