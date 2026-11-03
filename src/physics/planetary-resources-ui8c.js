/* Update 8C — restrained Explore route prospecting with existing field instrument.
 * Shows modeled uncertainty, never exposes an unmeasured exact underground reserve.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Explore"]');
if(!host)return;
const rt=()=>root.StarfallRuntime,$=id=>document.getElementById(id);
const panel=document.createElement('section');panel.className='section';panel.id='resources8c-explore';
const heading=document.createElement('div');heading.className='section-title';heading.textContent='GEOLOGICAL PROSPECTING · 8C';
const scan=document.createElement('button');scan.className='site';scan.type='button';scan.textContent='Survey current surface sector';
const message=document.createElement('p');message.className='panel-note';message.setAttribute('role','status');
message.textContent='Exit the ship, stand on solid terrain and use the existing EVA spectrometer. Findings are modeled evidence, not measured reserves.';
const log=document.createElement('div');log.style.cssText='white-space:pre-wrap;font:10px/1.7 var(--mono);color:var(--muted);max-height:210px;overflow:auto';
function refresh(){
 const c=rt()?.scienceContext?.(),r=rt()?.resources8c;
 scan.disabled=!(c?.landed&&c?.mode==='EVA'&&c?.body?.landable&&c?.local);
 const records=(r?.observations()||[]).filter(x=>x.bodyId===c?.body?.id).slice(-8);
 log.textContent=records.length?records.map(x=>'SECTOR '+x.siteId.split(':').slice(-2).join('/')+
  ' · '+x.interpretedType.replace(/_/g,' ')+'\nEvidence '+Math.round(x.confidence*100)+'% confidence · '+x.gradeBand+
  ' indicated grade · '+x.estimatedAccessibleMassBand+' modeled extent\n'+x.instrument).join('\n\n'):
  'No local mineral surveys recorded for this body.';
}
scan.addEventListener('click',()=>{
 const c=rt()?.scienceContext?.(),resources=rt()?.resources8c;
 if(!(c?.landed&&c?.mode==='EVA'&&c?.local&&c.body?.landable)){message.textContent='Leave the spacecraft/truck and approach solid surface on foot.';return;}
 try{
  // A real configured, bounded 4A spectrometer reading is required; it is
  // not safe to convert a UI click into a confirmed ore sample.
  const evidence=rt().acquireFieldReading('spectrometer');
  if(!evidence||!Number.isFinite(evidence.value))throw Error('No valid spectral measurement');
  const site=root.StarfallResources8C.site(c.body,c.local,c.seed);
  if(!site){message.textContent='Spectrometer reading obtained. No accessible modeled deposit detected in this surface sector; no material was created.';refresh();return;}
  const observation=resources.survey(site,c.simTime,'EVA field spectrometer');
  if(!root.SF.save({resources8c:resources.serialize()}))message.textContent='Survey recorded in memory only. Save storage unavailable: export a recovery backup.';
  else message.textContent='Geological evidence saved: '+site.label+' in '+site.hostRock+
   '. Grade estimate '+observation.gradeBand+'; depth '+site.depthMinM+'–'+site.depthMaxM+
   ' m (modeled prior, high uncertainty). Mining is not available until 8D.';
  refresh();
 }catch(error){message.textContent='Survey unavailable: '+String(error.message||error);}
});
panel.append(heading,scan,message,log);host.append(panel);
root.StarfallProspectingUI8C={refresh,open:()=>{const b=document.querySelector('#ui21-navigation [data-route="Explore"]');b?.click();panel.scrollIntoView({block:'nearest'});}};
refresh();
})(globalThis);
