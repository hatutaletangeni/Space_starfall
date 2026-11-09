/* 8K — read-only acceptance evidence inside existing Records workspace.
 * No separate HUD. Never confuses model-only or test-fixture checks with a
 * finished no-cheat expedition.
 */
(function(root){'use strict';
const host=document.querySelector('#ui21-pages .ui21-page[data-page="Records"]');
if(!host||!root.StarfallExpeditionAudit8K||!root.SF?.load)return;
const section=document.createElement('section');section.className='section';section.id='expedition-audit8k';
const details=document.createElement('details');
const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:650;padding:9px';
summary.textContent='8K · Full industrial expedition — release evidence and missing work';
const intro=document.createElement('p');intro.className='panel-note';
intro.textContent='Evidence only. Checks actual saved 8A stock, 8C depletion, 8E/8F production, 8G asset IDs, 8H cargo, 8I habitat and 8J atmospheric receipts. Unit tests and fixtures are NOT a complete unassisted two-world expedition; real GPU and legacy-save checks remain separate gates.';
const list=document.createElement('div');list.setAttribute('role','status');list.style.cssText='display:grid;gap:5px;font-size:12px';
const verdict=document.createElement('p');verdict.className='panel-note';
const refresh=document.createElement('button');refresh.type='button';refresh.className='science-action';
refresh.textContent='REFRESH ORIGINAL EXPEDITION EVIDENCE';
details.append(summary,intro,refresh,list,verdict);section.append(details);host.append(section);
function redraw(){
 const audit=root.StarfallExpeditionAudit8K.evaluate(root.SF.load());
 summary.textContent='8K · Industrial expedition evidence '+audit.observed+'/'+audit.total+' · NOT RELEASE CERTIFIED';
 list.replaceChildren();
 for(const m of audit.stages){const line=document.createElement('div');
  const state=m.status==='EVIDENCE'?'OBSERVED':'NOT VERIFIED';
  line.textContent=(state==='OBSERVED'?'✓ ':'○ ')+m.title+' · '+state;
  line.title=m.requirement;line.style.opacity=m.status==='EVIDENCE'?'1':'.76';
  list.append(line);}
 verdict.textContent=audit.claim+
  (audit.integrity.suspiciousFixtureLots?(' · WARNING: '+audit.integrity.suspiciousFixtureLots+' test/debug lot(s) currently in this save.'):'');
}
refresh.addEventListener('click',redraw);
details.addEventListener('toggle',()=>{if(details.open)redraw()});
root.StarfallExpeditionAuditUI8K={refresh:redraw};
})(globalThis);
