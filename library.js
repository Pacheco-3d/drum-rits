/* Private libraries are opened through user-authorized files, never by an email/password. */
if(!Object.hasOwn)Object.hasOwn=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
window.DrumLibrary=(()=>{
 let manifestValue=null,manifestPromise=null,files=null,folderRoot='';
 const root=new URL('library/',document.baseURI);
 function safePath(value){return typeof value==='string'&&value.length<240&&!value.startsWith('/')&&!value.includes('\\')&&!value.includes(':')&&value.split('/').every(p=>p&&p!=='.'&&p!=='..')}
 function validate(manifest){
  if(manifest?.schema!==1||!manifest.samples||typeof manifest.samples!=='object'||Array.isArray(manifest.samples))throw Error('A biblioteca precisa de um manifest.json compatível.');
  const entries=Object.entries(manifest.samples);if(!entries.length||entries.length>512)throw Error('Tamanho de biblioteca inválido.');
  for(const [id,s] of entries)if(!s||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!safePath(s.file)||!s.file.startsWith('sons/')||!/^([a-f0-9]{64})$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1||s.bytes>32*1024*1024)throw Error('Arquivo inválido na biblioteca.');
  return manifest;
 }
 async function raw(path){
  if(!safePath(path))throw Error('Caminho de biblioteca inválido.');
  if(files){const file=files.get(folderRoot+path);if(!file)throw Error('Arquivo ausente: '+path);return file.arrayBuffer()}
  const response=await fetch(new URL(path,root));if(!response.ok)throw Error('Não foi possível ler '+path);return response.arrayBuffer();
 }
 async function manifest(){
  if(manifestValue)return manifestValue;
  if(!manifestPromise)manifestPromise=(async()=>{
   if(window.DRUMRITS_EMBEDDED_LIBRARY)return validate(window.DRUMRITS_EMBEDDED_LIBRARY.manifest);
   return validate(JSON.parse(new TextDecoder().decode(await raw('manifest.json'))));
  })().then(value=>manifestValue=value).catch(error=>{manifestPromise=null;throw error});
  return manifestPromise;
 }
 async function sample(id){
  const m=await manifest(),entry=m.samples[id];if(!entry)throw Error('Som ausente na biblioteca: '+id);
  let content;
  if(window.DRUMRITS_EMBEDDED_LIBRARY){const b=window.DRUMRITS_EMBEDDED_LIBRARY.samples[id];content=Uint8Array.from(atob(b),c=>c.charCodeAt(0)).buffer}
  else content=await raw(entry.file);
  if(content.byteLength!==entry.bytes)throw Error('Som incompleto: '+id);
  if(crypto.subtle){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',content)),b=>b.toString(16).padStart(2,'0')).join('');if(digest!==entry.sha256)throw Error('A integridade do som não confere: '+id)}
  return content;
 }
 async function importFolder(fileList){
  const selected=Array.from(fileList),candidate=selected.find(f=>f.name==='manifest.json');if(!candidate)throw Error('Selecione a pasta druns que contém manifest.json.');
  if(selected.length>512||selected.reduce((n,f)=>n+f.size,0)>128*1024*1024||candidate.size>1024*1024)throw Error('Biblioteca grande demais.');
  const previous={files,folderRoot,manifestValue,manifestPromise};
  try{
   const parsed=validate(JSON.parse(await candidate.text()));
   folderRoot=candidate.webkitRelativePath.slice(0,-candidate.name.length);
   files=new Map(selected.map(f=>[f.webkitRelativePath,f]));
   for(const s of Object.values(parsed.samples))if(!files.has(folderRoot+s.file))throw Error('A pasta não contém todos os sons.');
   manifestValue=parsed;manifestPromise=null;for(const id of Object.keys(parsed.samples))await sample(id);return parsed;
  }catch(e){({files,folderRoot,manifestValue,manifestPromise}=previous);throw e}
 }
 async function reload(){manifestValue=null;manifestPromise=null;files=null;folderRoot='';return manifest()}
 async function readJson(path){const bytes=await raw(path);if(bytes.byteLength>512*1024)throw Error('Arquivo JSON grande demais.');return JSON.parse(new TextDecoder().decode(bytes))}
 return {manifest,sample,readJson,importFolder,reload,safePath};
})();