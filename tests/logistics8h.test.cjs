const assert=require('node:assert/strict');
// Narrow contract test with mocked 8A transfer API; NOT a real 8A integration test.
const H=require('../src/physics/logistics8h.js');
global.StarfallMaterials8A={create(snapshot){const state=JSON.parse(JSON.stringify(snapshot));return{reserve(id,lotId,destinationId,massKg){const x=state.lots.find(l=>l.id===lotId);if(!x||massKg>x.massKg)throw Error('Stock missing');this.move={id,lotId,destinationId,massKg};},commit(id){const m=this.move;const x=state.lots.find(l=>l.id===m.lotId);x.massKg-=m.massKg;state.lots.push({...x,id:'transfer:'+id,containerId:m.destinationId,massKg:m.massKg});return{id,status:'COMMITTED'};},snapshot(){return state}}}};
const materials={schema:1,lots:[{id:'ore',containerId:'mine',materialId:'iron_ore',massKg:10,volumeM3:1}],containers:[],operations:[]};
const carrier={id:'truck1',location:{kind:'surface',bodyId:'planet1'},bodyId:'planet1',destinationBodyId:'planet1',arrived:true,capacityKg:50,requiredJ:1000};
const result=H.deliver({transferId:'shipment1',sourceLotId:'ore',destinationId:'refinery',massKg:4,carrier,materials,energyReceipt:{operationId:'shipment1',sourceId:'battery1',usedJ:1000}});
assert.equal(result.materials.lots.reduce((a,b)=>a+b.massKg,0),10);assert.equal(result.receipt.status,'COMMITTED');
assert.throws(()=>H.deliver({transferId:'2',sourceLotId:'ore',destinationId:'refinery',massKg:4,carrier:{...carrier,arrived:false},materials,energyReceipt:{operationId:'2',sourceId:'battery1',usedJ:1000}}),/No arrived/);
console.log('PASS: 8H isolated interface checks (mocked stock API only)');