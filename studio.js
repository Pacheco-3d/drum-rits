/* Lightweight mixer and effects. Audio stays inside the Web Audio graph. */
const TRACK_COUNT=10;
let trackGains=Array(TRACK_COUNT).fill(1),trackMuted=Array(TRACK_COUNT).fill(false),trackSolo=Array(TRACK_COUNT).fill(false),effectId='dry';
let mixerVisible=innerWidth>=650;
const trackGraphs=new WeakMap(),outputGraphs=new WeakMap();
const effectPresets={
 dry:{name:'Seco',room:0,echo:0,drive:0,cutoff:18000},
 studio:{name:'Sala de estúdio',room:.13,echo:0,drive:.025,cutoff:16000},
 vintage:{name:'Vintage',room:.06,echo:0,drive:.16,cutoff:7800},
 echo:{name:'Eco curto',room:.04,echo:.16,drive:.025,cutoff:13000}
};
function channelLevel(r){return trackMuted[r]||(trackSolo.some(Boolean)&&!trackSolo[r])?0:trackGains[r]}
function trackBus(context,r){
 if(!Number.isInteger(r)||r<0||r>=TRACK_COUNT)return master;
 let graph=trackGraphs.get(context);if(!graph||graph.master!==master){graph={master,buses:new Map()};trackGraphs.set(context,graph)}
 if(!graph.buses.has(r)){const gain=context.createGain();gain.gain.value=channelLevel(r);gain.connect(master);graph.buses.set(r,gain)}
 return graph.buses.get(r);
}
function updateMixer(){
 if(ctx){const graph=trackGraphs.get(ctx);if(graph)for(const [r,gain] of graph.buses)gain.gain.setTargetAtTime(channelLevel(r),ctx.currentTime,.012)}
 document.querySelectorAll('[data-mute]').forEach(b=>b.setAttribute('aria-pressed',String(trackMuted[Number(b.dataset.mute)])));
 document.querySelectorAll('[data-solo]').forEach(b=>b.setAttribute('aria-pressed',String(trackSolo[Number(b.dataset.solo)])));
}
function appendMixerRow(r,name){
 const row=document.createElement('div');row.className='track-mixer';
 for(const [kind,text,label] of [['mute','M','Silenciar'],['solo','S','Solo']]){
  const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset[kind]=r;button.setAttribute('aria-label',label+' '+name);
  button.onclick=()=>{const state=kind==='mute'?trackMuted:trackSolo;state[r]=!state[r];updateMixer();save()};row.append(button);
 }
 const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='125';volume.value=String(Math.round(trackGains[r]*100));volume.setAttribute('aria-label','Volume de '+name);
 volume.oninput=()=>{trackGains[r]=Number(volume.value)/100;updateMixer()};volume.onchange=save;row.append(volume);$('grid').append(row);
}
function createOutput(context,volume){
 const gain=context.createGain(),rumble=context.createBiquadFilter(),compressor=context.createDynamicsCompressor(),drive=context.createWaveShaper(),tone=context.createBiquadFilter(),mix=context.createGain(),safety=context.createWaveShaper();
 gain.gain.value=volume;rumble.type='highpass';rumble.frequency.value=25;rumble.Q.value=.5;
 compressor.threshold.value=-10;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.12;
 tone.type='lowpass';tone.Q.value=.5;
 const curve=new Float32Array(8193);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=.96*Math.tanh(x/.96)}safety.curve=curve;safety.oversample='2x';
 gain.connect(rumble);rumble.connect(compressor);compressor.connect(drive);drive.connect(tone);tone.connect(mix);mix.connect(safety);
 const room=context.createGain(),echo=context.createGain(),delay=context.createDelay(1),feedback=context.createGain();
 for(const [i,time] of [.0297,.0371,.0411,.0437].entries()){
  const d=context.createDelay(.1),f=context.createGain(),damp=context.createBiquadFilter(),pan=context.createStereoPanner();d.delayTime.value=time;f.gain.value=.49;damp.type='lowpass';damp.frequency.value=4200;pan.pan.value=i%2?.55:-.55;
  tone.connect(d);d.connect(damp);damp.connect(f);f.connect(d);damp.connect(pan);pan.connect(room);
 }
 room.connect(mix);tone.connect(delay);delay.connect(echo);echo.connect(mix);delay.connect(feedback);feedback.connect(delay);feedback.gain.value=.24;
 outputGraphs.set(context,{drive,tone,room,echo,delay});applyEffect(context);
 if(!('startRendering' in context)){liveAnalyser=context.createAnalyser();liveAnalyser.fftSize=256;safety.connect(liveAnalyser);liveAnalyser.connect(context.destination)}else safety.connect(context.destination);
 return gain;
}
function applyEffect(context=ctx){
 if(!context)return;const graph=outputGraphs.get(context);if(!graph)return;
 const fx=effectPresets[effectId]||effectPresets.dry,t=context.currentTime;
 const curve=new Float32Array(2049),strength=1+fx.drive*7;
 for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=fx.drive?Math.tanh(x*strength)/Math.tanh(strength):x}graph.drive.curve=curve;
 graph.tone.frequency.setTargetAtTime(fx.cutoff,t,.025);graph.room.gain.setTargetAtTime(fx.room,t,.025);graph.echo.gain.setTargetAtTime(fx.echo,t,.025);
 graph.delay.delayTime.setTargetAtTime(Math.min(.9,60/(Number($('tempo').value)||110)/2),t,.025);
}