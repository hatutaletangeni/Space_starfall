'use strict';
/* Independent reference equations/targets; the code under test is the SAME
 * energy kernel used by planetary-climate8j.js, never a parallel demo solver. */
const E=require('../src/physics/climate-energy8j.js');
const YEAR=365.25*86400;
function validate(){const results=[];
 const record=(name,error,tolerance,unit,scope,details={})=>results.push({name,error,tolerance,unit,pass:Number.isFinite(error)&&error<=tolerance,scope,...details});
 let qerr=0;for(const n of [6,12,24])for(const angle of [0,.4091,-.4091,1.2]){const q=E.insolation(1360,n,angle);qerr=Math.max(qerr,Math.abs(q.reduce((s,v)=>s+v,0)/n-340));}
 record('Spherical solar budget, all tested seasons',qerr,1e-10,'W/m²','Conservation, not observational validation');
 let diffusionError=0,balanceError=0;for(const n of [6,12,24]){const h=2/n,p2=Array.from({length:n},(_,j)=>{const x=-1+(j+.5)*h;return(3*x*x-1)/2+h*h/8;}),L=E.transport(p2,.6);diffusionError=Math.max(diffusionError,...L.map((v,j)=>Math.abs(v+6*.6*p2[j])));balanceError=Math.max(balanceError,Math.abs(L.reduce((s,v)=>s+v,0)));}
 record('North spherical P2 diffusion eigenmode',diffusionError,1e-10,'W/m²','Analytical spatial-operator verification; North et al. 1981');
 record('No net energy from latitude transport',balanceError,1e-10,'W/m²','Closed polar boundary conservation');
 const Cs=7.3*YEAR,Co=106*YEAR,gamma=.73,lambda=1.13,F=3.7;
 const A=-(lambda+gamma)/Cs,D=-gamma/Co,disc=Math.sqrt((A-D)**2+4*gamma*gamma/(Cs*Co)),rf=(A+D-disc)/2,rs=(A+D+disc)/2,
  af=(-lambda/Cs-rs)/(rf-rs),bf=-rs/(rf-rs),eq=F/lambda;
 function reference(t){return{surface:eq*(1-af*Math.exp(rf*t)-(1-af)*Math.exp(rs*t)),deep:eq*(1-bf*Math.exp(rf*t)-(1-bf)*Math.exp(rs*t))};}
 function integrate(step,end){let s=0,d=0,work=0,maxResidual=0;for(let t=0;t<end;){const dt=Math.min(step,end-t),r=E.thermalStep({surfaceK:s,deepK:d,baseK:288,dt,forcingWm2:F,surfaceCapacity:Cs,deepCapacity:Co,exchange:gamma,linearFeedback:lambda});s=r.surfaceK;d=r.deepK;work+=r.radiationWm2*dt;maxResidual=Math.max(maxResidual,Math.abs(r.residualJm2));t+=dt;}return{s,d,energyError:Math.abs(Cs*s+Co*d-work),maxResidual};}
 let se=0,de=0,closure=0;const samples=[];
 for(const years of [1,10,50,100,200]){const actual=integrate(86400,years*YEAR),ref=reference(years*YEAR);se=Math.max(se,Math.abs(actual.s-ref.surface));de=Math.max(de,Math.abs(actual.d-ref.deep));closure=Math.max(closure,actual.energyError);samples.push({years,surfaceK:actual.s,referenceSurfaceK:ref.surface,deepK:actual.d,referenceDeepK:ref.deep});}
 record('Geoffroy two-layer step response, surface',se,.001,'K','Published EBM equations and reference parameters; not a historical climate hindcast',{samples,fastYears:-1/rf/YEAR,slowYears:-1/rs/YEAR});
 record('Geoffroy two-layer step response, deep ocean',de,.001,'K','Independent analytical matrix-exponential reference');
 record('Two-layer accumulated energy closure',closure,.01,'J/m²','Sensible storage equals integrated net radiative work');
 const end=YEAR,coarse=integrate(86400,end),fine=integrate(43200,end),exact=reference(end),ec=Math.abs(coarse.s-exact.surface),ef=Math.abs(fine.s-exact.surface);
 record('Time-step refinement',Math.abs(ec/ef-2),.03,'ratio error','First-order implicit convergence',{dailyErrorK:ec,halfDailyErrorK:ef,ratio:ec/ef});
 const solar=1360,albedo=.3,absorbed=solar*(1-albedo)/4,expected=(absorbed/E.SIGMA)**.25;
 let temp=-80;for(let n=0;n<3650;n++)temp=E.thermalStep({surfaceK:temp,deepK:0,baseK:250,dt:86400,forcingWm2:absorbed-E.SIGMA*250**4,exchange:0}).surfaceK;
 record('Nonlinear blackbody equilibrium',Math.abs(250+temp-expected),1e-6,'K','Independent Stefan-Boltzmann equilibrium',{expectedK:expected,computedK:250+temp});
 record('Earth effective emission temperature consistency',Math.abs(expected-254.5),.5,'K','Rounded published TOA budget consistency, not surface-temperature prediction',{computedK:expected,inputSolarWm2:solar,inputAlbedo:albedo,observationalTargetK:254.5});
 const sat=[{T:273.16,p:611.657},{T:300,p:3536.8},{T:373.1243,p:101325},{T:647.096,p:22064000}];
 record('Water saturation reference points',Math.max(...sat.map(x=>Math.abs(E.saturationPa(x.T)-x.p)/x.p)),1e-4,'relative','IAPWS saturation correlation / rounded thermodynamic check points',{points:sat.map(x=>({...x,computedPa:E.saturationPa(x.T)}))});
 record('Ice saturation at 200 K',Math.abs(E.saturationPa(200)-.16269),.00001,'Pa','Murphy & Koop ice parameterization reproduction; no independent field validation');
 const tiny=E.thermalStep({surfaceK:0,deepK:0,baseK:250,dt:1,forcingWm2:1e-20});
 record('Microscopic forcing retention',tiny.surfaceK>0?0:1,0,'failure count','Sub-ULP anomaly preserved; no visual amplification',{anomalyK:tiny.surfaceK});
 return{solverVersion:E.VERSION,allPassed:results.every(x=>x.pass),validationLevel:'numerical verification and reference-property checks',forecastSkillEstablished:false,results};
}
module.exports={validate};
if(require.main===module){const fs=require('node:fs'),path=require('node:path'),r=validate(),dir=process.argv[2]||'artifacts/climate-validation';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'climate-validation.json'),JSON.stringify(r,null,2)+'\n');
 const rows=r.results.map(x=>`| ${x.name} | ${x.error.toExponential(4)} | ${x.tolerance} ${x.unit} | ${x.pass?'PASS':'FAIL'} |`).join('\n');
 fs.writeFileSync(path.join(dir,'climate-validation.md'),`# Climate solver benchmark report\n\nSolver version: ${r.solverVersion}. Numerical/reference checks: ${r.allPassed?'PASS':'FAIL'}. Planetary forecast skill: **not established**.\n\n| Benchmark | Measured error | Acceptance limit | Result |\n|---|---:|---|---|\n${rows}\n\nThese tests verify equations, conservation and stated reference cases. They do not calibrate or validate the seeded planet inputs or establish forecast accuracy for Earth, other planets or alien atmospheres. See docs/CLIMATE-VALIDATION.md.\n`);
 console.log(JSON.stringify({allPassed:r.allPassed,cases:r.results.length,surfaceErrorK:r.results.find(x=>x.name.includes('response, surface')).error,report:dir}));process.exitCode=r.allPassed?0:1;}
