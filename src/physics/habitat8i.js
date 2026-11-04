/* STARFALL 8I — closed-volume gas/thermal/water ledger, first-order approximation. */
(function(root){'use strict';const copy=x=>JSON.parse(JSON.stringify(x));const R=8.314462618;
function advance(saved,{seconds,powerJ=0,waterInputKg=0,oxygenInputKg=0,carbonDioxideInputKg=0}){
 let s=copy(saved);if(!s||s.schema!==1||![s.volumeM3,s.temperatureK,s.oxygenKg,s.co2Kg,s.nitrogenKg,s.waterKg].every(x=>Number.isFinite(x)&&x>=0)||s.volumeM3<=0||s.temperatureK<=0)throw Error('Invalid habitat state');
 if(![seconds,powerJ,waterInputKg,oxygenInputKg,carbonDioxideInputKg].every(x=>Number.isFinite(x)&&x>=0)||seconds>86400)throw Error('Invalid process step');
 if(powerJ<seconds*100)throw Error('Life support underpowered');
 s.waterKg+=waterInputKg;s.oxygenKg+=oxygenInputKg;s.co2Kg+=carbonDioxideInputKg;
 const leakFraction=Math.min(1,(s.leakRatePerS||0)*seconds);for(const gas of ['oxygenKg','co2Kg','nitrogenKg'])s[gas]*=(1-leakFraction);
 const co2Removed=Math.min(s.co2Kg,seconds*0.000001);s.co2Kg-=co2Removed;s.capturedCo2Kg=(s.capturedCo2Kg||0)+co2Removed;
 const n=s.oxygenKg/.031998+s.co2Kg/.04401+s.nitrogenKg/.028014;
 s.pressurePa=n*R*s.temperatureK/s.volumeM3;
 return s;
}
root.StarfallHabitat8I=Object.freeze({advance});if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallHabitat8I;
})(typeof globalThis!=='undefined'?globalThis:this);