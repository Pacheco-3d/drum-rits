const libraryStatus=message=>$('library-status').textContent=message;
function savedPresets(){try{const value=JSON.parse(localStorage.getItem('drumrits-user-presets')||'[]');return Array.isArray(value)?value.slice(0,128):[]}catch{return []}}
function makePreset(){
 return {schema:6,name:$('preset-name').value.trim()||presets[selected].name,selected,rhythm:'custom',pattern:pattern.map(r=>[...r]),velocities:velocities.map(r=>[...r]),stepCount,tempo:Number($('tempo').value),volume:Number($('volume').value),kit,soundMode,trackGains:[...trackGains],trackMuted:[...trackMuted],trackSolo:[...trackSolo],effectId};
}
function validatePreset(data){
 if(!data||![5,6].includes(data.schema)||!Array.isArray(data.pattern)||![6,10].includes(data.pattern.length)||![8,12,16,24,32].includes(data.stepCount)||!data.pattern.every(row=>Array.isArray(row)&&row.length===data.stepCount&&row.every(v=>typeof v==='boolean')))throw Error('Preset incompatível.');
 if(!Object.hasOwn(presets,data.selected)||!Object.hasOwn(kitProfiles,data.kit)||!['acoustic','synthetic'].includes(data.soundMode)||!Number.isFinite(Number(data.tempo))||Number(data.tempo)<40||Number(data.tempo)>240)throw Error('Preset com ritmo, bateria ou andamento inválido.');
 if(data.velocities&&(!Array.isArray(data.velocities)||data.velocities.length!==data.pattern.length||!data.velocities.every(row=>Array.isArray(row)&&row.length===data.stepCount&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1.2))))throw Error('Força de notas inválida.');
 return {...data,name:String(data.name||'Meu ritmo').slice(0,80),rhythm:'custom'};
}
function loadUserPreset(data){
 const p=validatePreset(data);stop();localStorage.setItem('drumrits-v6',JSON.stringify(p));if(!restore())throw Error('Não foi possível abrir este preset.');updateMixer();applyEffect();libraryStatus('Preset aberto: '+p.name);
}
function renderSavedPresets(){
 $('saved-presets').replaceChildren();const values=savedPresets();
 if(!values.length){const empty=document.createElement('p');empty.className='dialog-hint';empty.textContent='Seus ritmos salvos aparecerão aqui.';$('saved-presets').append(empty)}
 values.forEach((p,index)=>{
  const row=document.createElement('div');row.className='saved-preset';const open=document.createElement('button');open.textContent=String(p.name||'Meu ritmo');open.onclick=()=>{try{loadUserPreset(p);$('library-picker').close()}catch(e){libraryStatus(e.message)}};
  const remove=document.createElement('button');remove.textContent='Excluir';remove.setAttribute('aria-label','Excluir preset '+String(p.name));remove.onclick=()=>{const a=savedPresets();a.splice(index,1);localStorage.setItem('drumrits-user-presets',JSON.stringify(a));renderSavedPresets()};row.append(open,remove);$('saved-presets').append(row);
 });
}
async function describeLibrary(){try{const manifest=await DrumLibrary.manifest();$('library-summary').textContent=manifest.name+' · '+Object.keys(manifest.samples).length+' sons · versão '+manifest.version;await renderFactoryPresets(manifest)}catch{$('library-summary').textContent='Modo sintético disponível. Importe a biblioteca para usar os samples.'}}
async function renderFactoryPresets(manifest){
 $('factory-presets').replaceChildren();if(!manifest.factoryPresets)return;
 const bank=await DrumLibrary.readJson(manifest.factoryPresets);if(!Array.isArray(bank.presets))return;
 for(const candidate of bank.presets.slice(0,32)){
  const preset=validatePreset(candidate),button=document.createElement('button');button.className='factory-preset';button.textContent=preset.name;
  button.onclick=()=>{try{loadUserPreset(preset);$('library-picker').close()}catch(e){libraryStatus(e.message)}};$('factory-presets').append(button);
 }
}
async function reloadImportedLibrary(){
 stop();clearSampleCache();const manifest=await DrumLibrary.reload();await activateLibrary(manifest);
}
async function activateLibrary(manifest){
 const currentRhythm=$('rhythms').value;await loadLibraryDefinitions(manifest);setupMenus();setupLibrary();$('rhythms').value=currentRhythm;render();
 if(manifest.userPresets){
  const imported=await DrumLibrary.readJson(manifest.userPresets);if(!Array.isArray(imported)||imported.length>128)throw Error('Lista de presets incompatível.');
  const values=savedPresets();for(const candidate of imported){const preset=validatePreset(candidate);if(!values.some(p=>JSON.stringify(p)===JSON.stringify(preset))){if(values.some(p=>p.name===preset.name))preset.name=(preset.name+' (importado)').slice(0,80);values.push(preset)}}localStorage.setItem('drumrits-user-presets',JSON.stringify(values.slice(-128)));renderSavedPresets();
 }
 if(ctx)await ensureKitSamples(kit);applyEffect();await describeLibrary();libraryStatus('Biblioteca importada e pronta para tocar.');
}
function downloadFile(name,content,mime='application/json'){
 const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('open-library').onclick=()=>{$('library-picker').showModal();renderSavedPresets();describeLibrary()};
$('import-library').onclick=()=>{if(window.DrumRitsAndroid){DrumRitsAndroid.importLibrary();libraryStatus('Escolha druns-biblioteca.zip na pasta druns do Drive.')}else $('library-folder').click()};
$('library-folder').onchange=async event=>{try{stop();const manifest=await DrumLibrary.importFolder(event.target.files);clearSampleCache();await activateLibrary(manifest)}catch(e){libraryStatus(e.message)}};
$('refresh-library').onclick=()=>{if(window.DrumRitsAndroid){DrumRitsAndroid.refreshLibrary();libraryStatus('Atualizando a biblioteca selecionada…')}else $('library-folder').click()};
$('export-library').onclick=()=>{if(window.DrumRitsAndroid){DrumRitsAndroid.exportLibrary(JSON.stringify({presets:savedPresets(),effects:effectPresets}));libraryStatus('Escolha onde salvar a biblioteca; use druns no Google Drive.')}else libraryStatus('No computador, a biblioteca está na pasta library. Copie essa pasta para druns no Drive.')};
$('import-preset').onclick=()=>{if(window.DrumRitsAndroid){DrumRitsAndroid.importPreset();libraryStatus('Escolha o arquivo de preset no Drive ou no celular.')}else $('preset-file').click()};
$('preset-file').onchange=async event=>{try{const f=event.target.files[0];if(!f||f.size>256*1024)throw Error('Escolha um preset JSON de até 256 KB.');loadUserPreset(JSON.parse(await f.text()))}catch(e){libraryStatus(e.message)}finally{event.target.value=''}};
$('save-local-preset').onclick=()=>{try{const preset=makePreset(),values=savedPresets(),index=values.findIndex(p=>p.name===preset.name);if(index<0)values.push(preset);else values[index]=preset;localStorage.setItem('drumrits-user-presets',JSON.stringify(values.slice(-128)));renderSavedPresets();libraryStatus('Preset salvo no aplicativo: '+preset.name)}catch(e){libraryStatus('Não foi possível salvar: '+e.message)}};
$('save-drive-preset').onclick=async()=>{
 try{
  const preset=makePreset(),name=preset.name.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,60)||'meu-ritmo',text=JSON.stringify(preset,null,2),filename=name+'.drumrits.json';
  if(window.DrumRitsAndroid){DrumRitsAndroid.savePreset(filename,text);libraryStatus('Escolha Google Drive e a pasta druns para salvar o preset.');return}
  const file=new File([text],filename,{type:'application/json'});
  if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:preset.name});libraryStatus('Preset enviado ao aplicativo escolhido.')}else{downloadFile(filename,text);libraryStatus('Preset exportado. Salve-o na pasta druns do Drive.')}
 }catch(e){if(e.name!=='AbortError')libraryStatus(e.message)}
};
window.onDrumRitsNative=async(type,data)=>{
 try{
  await window.drumRitsReady;
  if(type==='library'){await reloadImportedLibrary();libraryStatus('Biblioteca importada de '+(data.source||'Arquivos do Android')+'.')}
  else if(type==='preset'){loadUserPreset(JSON.parse(data.content));renderSavedPresets()}
  else if(type==='saved')libraryStatus('Arquivo salvo pelo seletor do Android. O Google Drive faz a sincronização da pasta escolhida.');
  else if(type==='cancelled')libraryStatus('Operação cancelada.');
  else if(type==='error')libraryStatus(data.message||'Não foi possível concluir a operação.');
 }catch(e){libraryStatus(e.message)}
};
function setView(view){
 if(!['studio','pads','sequence'].includes(view))return;
 document.querySelector('.machine').dataset.view=view;
 document.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.view===view))});
 try{localStorage.setItem('drumrits-view',view)}catch{}if(!meterFrame)paintMeter();
}
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
let initialView;try{initialView=localStorage.getItem('drumrits-view')}catch{}
setView(initialView||(innerWidth<650?'pads':'studio'));
window.pauseDrumRits=()=>{stop();if(ctx&&ctx.state==='running')ctx.suspend()};

$('toggle-mixer').onclick=()=>{mixerVisible=!mixerVisible;buildGrid();render()};
window.drumRitsReady=(async()=>{
 try{await loadLibraryDefinitions()}catch(error){libraryStatus('Biblioteca externa indisponível: '+error.message)}
 initializeApp();
})();