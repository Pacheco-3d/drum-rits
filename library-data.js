// The same data-only library supplies rhythms and effects on desktop and Android.
const originalRhythms=JSON.parse(JSON.stringify(presets));
const originalEffects=JSON.parse(JSON.stringify(effectPresets));
function validateRhythm(id,value){
 if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(id)||['constructor','prototype','custom'].includes(id)||!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80)throw Error('Nome de ritmo inválido na biblioteca.');
 const steps=value.steps||16,meter=value.meter||4;
 if(![8,12,16,24,32].includes(steps)||![2,3,4].includes(meter)||steps%(meter*4)!==0||!Number.isFinite(value.bpm)||value.bpm<40||value.bpm>240)throw Error('Compasso ou BPM inválido: '+value.name);
 if(!Array.isArray(value.hits)||![6,10].includes(value.hits.length)||!value.hits.every(row=>Array.isArray(row)&&row.length<=steps&&row.every(s=>Number.isInteger(s)&&s>=0&&s<steps)))throw Error('Notas inválidas: '+value.name);
 const hits=Array.from({length:10},(_,r)=>[...new Set(value.hits[r]||[])]);
 if(value.velocities&&(!Array.isArray(value.velocities)||value.velocities.length!==value.hits.length||!value.velocities.every(row=>Array.isArray(row)&&row.length===steps&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1.2))))throw Error('Dinâmica inválida: '+value.name);
 const velocities=Array.from({length:10},(_,r)=>Array.from({length:steps},(_,s)=>value.velocities?.[r]?.[s]??(hits[r].includes(s)?.78:0)));
 const range=value.bpmRange;
 return {name:value.name,group:String(value.group||'Biblioteca').slice(0,60),info:String(value.info||'Ritmo da sua biblioteca.').slice(0,2000),family:String(value.family||value.name).slice(0,80),bpm:value.bpm,steps,meter,hits,velocities,
  bpmRange:Array.isArray(range)&&range.length===2&&range.every(v=>Number.isFinite(v)&&v>=40&&v<=240)&&range[0]<=range[1]?range:[Math.max(40,value.bpm-20),Math.min(240,value.bpm+20)],
  recommendedKit:Object.hasOwn(kitProfiles,value.recommendedKit)?value.recommendedKit:'classic',
  articulations:Array.from({length:10},(_,r)=>['normal','rim','pedal','bell'].includes(value.articulations?.[r])?value.articulations[r]:'normal')};
}
function validEffect(id,fx){
 return /^[a-z][a-z0-9_-]{0,30}$/.test(id)&&!['constructor','prototype'].includes(id)&&fx&&typeof fx.name==='string'&&fx.name.length<=60&&Number.isFinite(fx.room)&&fx.room>=0&&fx.room<=.4&&Number.isFinite(fx.echo)&&fx.echo>=0&&fx.echo<=.3&&Number.isFinite(fx.drive)&&fx.drive>=0&&fx.drive<=.3&&Number.isFinite(fx.cutoff)&&fx.cutoff>=400&&fx.cutoff<=20000;
}
async function loadLibraryDefinitions(manifest){
 const m=manifest||await DrumLibrary.manifest(),rhythms=JSON.parse(JSON.stringify(originalRhythms)),effects={...originalEffects};
 if(m.rhythms){
  const bank=await DrumLibrary.readJson(m.rhythms),entries=Object.entries(bank.rhythms||{});
  if(bank.schema!==1||!entries.length||entries.length>256)throw Error('Catálogo de ritmos incompatível.');
  for(const [id,value] of entries)rhythms[id]=validateRhythm(id,value);
 }
 if(m.effects){
  const bank=await DrumLibrary.readJson(m.effects),entries=Object.entries(bank.effects||{});
  if(bank.schema!==1||entries.length>32)throw Error('Catálogo de efeitos incompatível.');
  for(const [id,fx] of entries){if(!validEffect(id,fx))throw Error('Efeito inválido na biblioteca.');effects[id]={...fx}}
 }
 // Commit only after every definition validates, preserving the previous catalog on errors.
 for(const id of Object.keys(presets))delete presets[id];Object.assign(presets,rhythms);
 for(const id of Object.keys(effectPresets))delete effectPresets[id];Object.assign(effectPresets,effects);
 $('effect').replaceChildren();for(const [id,fx] of Object.entries(effects)){const option=document.createElement('option');option.value=id;option.textContent=fx.name;$('effect').append(option)}
 if(!Object.hasOwn(effects,effectId))effectId='dry';$('effect').value=effectId;
 return m;
}