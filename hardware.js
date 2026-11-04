// Pads use the same kit, mode, dynamics and output stage as the sequencer.
const padDefinitions=[
 {id:'kick',name:'Bumbo',r:0,code:'KeyQ',key:'Q'},
 {id:'snare',name:'Caixa',r:1,code:'KeyW',key:'W'},
 {id:'rim',name:'Aro',r:1,articulation:'rim',code:'KeyE',key:'E'},
 {id:'closed',name:'Chimbal',r:2,code:'KeyR',key:'R'},
 {id:'open',name:'Chimbal aberto',r:3,code:'KeyA',key:'A'},
 {id:'ride',name:'Ride',r:8,code:'KeyS',key:'S'},
 {id:'bell',name:'Campana',r:8,articulation:'bell',code:'KeyD',key:'D'},
 {id:'crash',name:'Crash',r:9,code:'KeyF',key:'F'},
 {id:'high',name:'Tom agudo',r:6,code:'KeyZ',key:'Z'},
 {id:'tom',name:'Tom médio',r:4,code:'KeyX',key:'X'},
 {id:'low',name:'Tom grave',r:7,code:'KeyC',key:'C'},
 {id:'clap',name:'Palmas',r:5,code:'KeyV',key:'V'}
];
function syncPadLabels(){
 for(const pad of padDefinitions){const label=document.querySelector('[data-pad="'+pad.id+'"] [data-pad-label]');if(label)label.textContent=pad.articulation?pad.name:kitLabels[kit][pad.r]}
}
const padFlashTimers=new Map();
async function hitPad(id){
 const pad=padDefinitions.find(p=>p.id===id);if(!pad)return;
 const button=document.querySelector('[data-pad="'+id+'"]');
 clearTimeout(padFlashTimers.get(id));button.classList.add('is-hit');
 padFlashTimers.set(id,setTimeout(()=>{button.classList.remove('is-hit');padFlashTimers.delete(id)},140));
 try{await initAudio();sound(pad.r,ctx.currentTime+.005,.9,pad.articulation||'normal')}catch{audioError()}
}
for(const [i,pad] of padDefinitions.entries()){
 const button=document.createElement('button');button.type='button';button.className='drum-pad';button.dataset.pad=pad.id;
 button.setAttribute('aria-label','Tocar '+pad.name+' — tecla '+pad.key);
 const key=document.createElement('span');key.className='pad-key';key.textContent=pad.key;key.setAttribute('aria-hidden','true');
 const number=document.createElement('span');number.className='pad-number';number.textContent=String(i+1).padStart(2,'0');number.setAttribute('aria-hidden','true');
 const name=document.createElement('span');name.dataset.padLabel='';name.textContent=pad.name;
 button.append(key,number,name);
 button.addEventListener('pointerdown',event=>{if(event.button===0){event.preventDefault();button.focus();hitPad(pad.id)}});
 button.addEventListener('click',event=>{if(event.detail===0)hitPad(pad.id)});
 $('pad-bank').append(button);
}
document.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||document.querySelector('dialog[open]'))return;
 const target=document.activeElement;if(target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(target?.tagName))return;
 const pad=padDefinitions.find(p=>p.code===event.code);if(pad){event.preventDefault();hitPad(pad.id)}
});
let liveAnalyser=null,meterFrame=0,lastMeterText=0;
function meterCanvas(){
 const canvas=$('output-spectrum'),ratio=Math.min(2,window.devicePixelRatio||1),rect=canvas.getBoundingClientRect();
 const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 return {canvas,g:canvas.getContext('2d'),width,height,ratio};
}
function paintMeter(frequency=null,peak=0){
 const {g,width,height,ratio}=meterCanvas();g.clearRect(0,0,width,height);g.fillStyle='#13212b';g.fillRect(0,0,width,height);
 g.strokeStyle='#233b47';g.lineWidth=ratio;
 for(let y=1;y<4;y++){g.beginPath();g.moveTo(0,y*height/4);g.lineTo(width,y*height/4);g.stroke()}
 const bars=40,gap=2*ratio,barWidth=(width-12*ratio)/bars;
 for(let i=0;i<bars;i++){
  const value=frequency?frequency[Math.floor(i*frequency.length/bars)]/255:0;
  const barHeight=Math.max(ratio,value*(height-9*ratio));
  g.fillStyle=value>.82?'#ed7954':'#d4ac53';g.fillRect(6*ratio+i*barWidth,height-3*ratio-barHeight,Math.max(ratio,barWidth-gap),barHeight);
 }
 if(performance.now()-lastMeterText>120||!frequency){
  $('output-level').textContent=peak>.003?Math.max(-60,20*Math.log10(peak)).toFixed(0)+' dBFS':'— dBFS';
  $('signal-status').textContent=peak>.008?'Áudio ativo':'Em espera';lastMeterText=performance.now();
 }
}
function startMeter(){
 if(meterFrame||!liveAnalyser)return;
 const freq=new Uint8Array(liveAnalyser.frequencyBinCount),time=new Uint8Array(liveAnalyser.fftSize);
 function draw(){
  if(!liveAnalyser){meterFrame=0;paintMeter();return}
  liveAnalyser.getByteFrequencyData(freq);liveAnalyser.getByteTimeDomainData(time);
  let peak=0;for(const value of time)peak=Math.max(peak,Math.abs(value-128)/128);
  paintMeter(freq,peak);
  if(playing||previewStarting||previewVoices.size||voices.size)meterFrame=requestAnimationFrame(draw);
  else{meterFrame=0;paintMeter()}
 }
 meterFrame=requestAnimationFrame(draw);
}
function stopMeter(){if(meterFrame)cancelAnimationFrame(meterFrame);meterFrame=0;paintMeter()}
window.addEventListener('resize',()=>{if(!meterFrame)paintMeter()});
paintMeter();