const decodedSamples={},samplePromises=new Map();
let kitChangeGeneration=0,queuedNotes=[];
async function decodeSample(id){
 if(decodedSamples[id])return decodedSamples[id];
 if(!samplePromises.has(id))samplePromises.set(id,(async()=>{
  const bytes=await DrumLibrary.sample(id),buffer=await ctx.decodeAudioData(bytes);
  let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(v));
  const value={buffer,level:Math.min(3,.88/Math.max(peak,.01))};decodedSamples[id]=value;return value;
 })().catch(error=>{samplePromises.delete(id);throw error}));
 return samplePromises.get(id);
}
async function ensureKitSamples(id,mode=soundMode){
 if(mode!=='acoustic')return;
 const profile=kitProfiles[id];
 const names=profile.percussion?[]:['kick','snare','hihat','tom1','tom2','tom3'].map(n=>profile.sample+'-'+n);
 names.push('vsco-crash-soft','vsco-crash-hard','vsco-ride-soft','vsco-ride-hard','vsco-ride-bell-soft','vsco-ride-bell-hard');
 await Promise.all(names.map(decodeSample));
}
function loadSamples(){return ensureKitSamples(kit)}
function clearSampleCache(){for(const key of Object.keys(decodedSamples))delete decodedSamples[key];samplePromises.clear()}
function queueSound(r,at,velocity=1,articulation='normal'){
 queuedNotes=queuedNotes.filter(n=>n.at>=ctx.currentTime-.02);queuedNotes.push({r,at,velocity,articulation});
 return sound(r,at,velocity,articulation);
}
function replayQueuedNotes(){
 if(!ctx||!playing)return;queuedNotes=queuedNotes.filter(n=>n.at>=ctx.currentTime+.004);
 for(const n of queuedNotes)sound(n.r,n.at,n.velocity,n.articulation);
}
function extraSample(id,at,p,r){
 const asset=decodedSamples[id];if(!asset)throw Error('Carregue os sons deste conjunto na biblioteca.');
 const source=ctx.createBufferSource();source.buffer=asset.buffer;source.playbackRate.value=Math.max(.7,Math.min(1.4,p.pitch));
 const duration=Math.min(3.4,asset.buffer.duration/source.playbackRate.value),filter=ctx.createBiquadFilter();
 filter.type='lowpass';filter.frequency.value=Math.min(18000,p.bright*1.2);filter.Q.value=.5;
 const handle=voice(source,filter,at,duration,(r===9?.45:.32)*asset.level,{pan:r===9?-.2:.27,lane:r,attack:.0008});
 const level=handle.level;handle.gain.gain.cancelScheduledValues(at);handle.gain.gain.setValueAtTime(0,at);handle.gain.gain.linearRampToValueAtTime(level,at+.0008);
 handle.gain.gain.setValueAtTime(level,at+Math.max(.002,duration-.05));handle.gain.gain.linearRampToValueAtTime(0,at+duration);
 handle.stop=(time=ctx.currentTime,fade=.018)=>{if(time>=handle.end)return;if(time<=at){source.stop(time);handle.end=time;return}handle.gain.gain.cancelScheduledValues(time);handle.gain.gain.setValueAtTime(level,time);handle.gain.gain.linearRampToValueAtTime(0,time+fade);source.stop(time+fade+.002);handle.end=time+fade};
}
function additionalDrum(r,at,p,articulation){
 if(r===6||r===7){
  if(p.percussion){percussionDrum(r===6?4:0,at,{...p,pitch:p.pitch*(r===6?1.32:.78),body:p.body*.75});return}
  if(soundMode==='acoustic')sampledDrum(r,at,p);
  else syntheticDrum(4,at,{...p,snare:p.snare*(r===6?1.35:.72),decay:p.decay*(r===6?.85:1.15)});
  return;
 }
 if(soundMode==='acoustic'){
  const layer=currentHit.velocity>.65?'hard':'soft';
  extraSample('vsco-'+(r===9?'crash':articulation==='bell'?'ride-bell':'ride')+'-'+layer,at,p,r);return;
 }
 const bell=articulation==='bell',duration=r===9?1.6:bell?.65:1.1,base=p.hat*(r===9?.72:bell?.6:1);
 if(!bell)noise(at,duration,r===9?.3:.17,5000,'highpass',{ceiling:Math.min(16000,p.bright*1.3),pan:r===9?-.2:.25,attack:.001});
 [1,1.37,1.93,2.41,2.83].forEach((ratio,i)=>tone(at,base*ratio,base*ratio,duration/(1+i*.4),(bell?.075:.027)/(1+i),'sine',{pan:r===9?-.2:.25,attack:.0006,lowpass:15000}));
}