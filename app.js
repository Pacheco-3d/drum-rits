'use strict';
const $ = id => document.getElementById(id);
// Timbre mode is independent of kit type. Acoustic combines embedded recordings
// with resonant percussion; synthetic uses parameterized oscillators and noise.
const kitProfiles={
 classic:{name:'Clássica',group:'Baterias',desc:'Equilibrada e versátil',sample:'acoustic-kit',pitch:1,decay:1,body:53,kickDecay:.30,snare:190,snareDecay:.17,bright:10400,hat:3000,wave:'triangle'},
 rock:{name:'Rock',group:'Baterias',desc:'Caixa encorpada e ataque forte',sample:'Kit3',pitch:1,decay:1.1,body:49,kickDecay:.34,snare:175,snareDecay:.22,bright:11000,hat:3200,wave:'triangle'},
 metal:{name:'Metal',group:'Baterias',desc:'Bumbo seco e toms definidos',sample:'Kit8',pitch:1.08,decay:.76,body:45,kickDecay:.21,snare:218,snareDecay:.12,bright:12500,hat:3700,wave:'triangle'},
 jazz:{name:'Jazz',group:'Baterias',desc:'Leve, aguda e ressonante',sample:'acoustic-kit',pitch:1.24,decay:.78,body:69,kickDecay:.22,snare:245,snareDecay:.14,bright:8300,hat:2650,wave:'sine'},
 vintage:{name:'Vintage',group:'Baterias',desc:'Textura quente e retrô',sample:'LINN',pitch:.95,decay:.95,body:60,kickDecay:.27,snare:162,snareDecay:.19,bright:7200,hat:2400,wave:'triangle'},
 studio:{name:'Estúdio',group:'Baterias',desc:'Ataque limpo e focado',sample:'R8',pitch:1,decay:1,body:57,kickDecay:.25,snare:205,snareDecay:.15,bright:9800,hat:3100,wave:'sine'},
 e808:{name:'Eletrônica 808',group:'Eletrônicas',desc:'Subgrave longo e redondo',sample:'CR78',pitch:.84,decay:1.35,body:42,kickDecay:.72,snare:180,snareDecay:.18,bright:9900,hat:3400,wave:'sine',electronic:true},
 e909:{name:'Eletrônica 909',group:'Eletrônicas',desc:'Punch e pratos abertos',sample:'R8',pitch:1.1,decay:.8,body:54,kickDecay:.34,snare:235,snareDecay:.16,bright:12600,hat:4200,wave:'triangle',electronic:true},
 electro:{name:'Electro',group:'Eletrônicas',desc:'Timbres curtos e brilhantes',sample:'LINN',pitch:1.2,decay:.62,body:67,kickDecay:.18,snare:285,snareDecay:.11,bright:12000,hat:3900,wave:'triangle',electronic:true},
 trap:{name:'Trap',group:'Eletrônicas',desc:'Graves profundos e hats curtos',sample:'CR78',pitch:.73,decay:1.65,body:37,kickDecay:.95,snare:155,snareDecay:.10,bright:10800,hat:4600,wave:'sine',electronic:true},
 hiphop:{name:'Hip-hop',group:'Eletrônicas',desc:'Grave pesado e caixa seca',sample:'Kit3',pitch:.83,decay:.88,body:46,kickDecay:.43,snare:145,snareDecay:.14,bright:6800,hat:2300,wave:'triangle',electronic:true},
 dance:{name:'Dance',group:'Eletrônicas',desc:'Bumbo firme para a pista',sample:'LINN',pitch:1.06,decay:.83,body:58,kickDecay:.38,snare:225,snareDecay:.20,bright:11600,hat:3550,wave:'triangle',electronic:true},
 brasil:{name:'Brasileira',group:'Percussão',desc:'Zabumba, triângulo e agogô',sample:'acoustic-kit',pitch:1,decay:1,body:59,kickDecay:.25,snare:390,snareDecay:.06,bright:10500,hat:2820,wave:'sine',percussion:true},
 samba:{name:'Percussão de samba',group:'Percussão',desc:'Graves abertos e metais vivos',sample:'Kit8',pitch:1.15,decay:.83,body:78,kickDecay:.32,snare:520,snareDecay:.045,bright:11800,hat:3350,wave:'triangle',percussion:true}
};
const kitLabels=Object.fromEntries(Object.entries(kitProfiles).map(([id,p])=>[id,p.percussion?
 (id==='brasil'?['Zabumba grave','Zabumba aguda','Triângulo fechado','Triângulo aberto','Agogô','Palmas']:['Surdo','Aro','Metal fechado','Metal aberto','Agogô agudo','Palmas']):
 ['Bumbo','Caixa','Chimbal fechado','Chimbal aberto','Tom','Palmas']]));
let soundMode='synthetic';
function setupKits(){
 for(const group of ['Baterias','Eletrônicas','Percussão']){
  const section=document.createElement('section');section.className='kit-section';
  const title=document.createElement('h3');title.textContent=group;section.append(title);
  const options=document.createElement('optgroup');options.label=group;
  for(const [id,p] of Object.entries(kitProfiles).filter(([,p])=>p.group===group)){
   const button=document.createElement('button');button.className='kit-option';button.dataset.kit=id;button.setAttribute('aria-pressed','false');
   const name=document.createElement('span');name.textContent=p.name;
   const desc=document.createElement('small');desc.textContent=p.desc;
   button.append(name,desc);section.append(button);
   const option=document.createElement('option');option.value=id;option.textContent=p.name;options.append(option);
  }
  $('kit-groups').append(section);$('kit').append(options);
 }
 document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>changeSoundMode(button.dataset.mode));
}
function syncSoundMode(){
 document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===soundMode)));
 $('kit-description').textContent=kitProfiles[kit].name+' · '+(soundMode==='acoustic'?'Acústico':'Sintético')+' — '+kitProfiles[kit].desc+'.';
}
function releaseKitVoices(){
 stopPreview();if(ctx)for(const voice of voices)if(voice.lane!==null)voice.stop(ctx.currentTime,.018);openHats.clear();
}
async function changeSoundMode(mode){
 if(mode===soundMode)return;const token=++kitChangeGeneration;
 try{if(ctx)await ensureKitSamples(kit,mode);if(token!==kitChangeGeneration)return;releaseKitVoices();soundMode=mode;replayQueuedNotes();render();save();if(!playing)previewKit()}
 catch(error){audioError(error)}
}

const timbreDesigns={
 classic:{sample:'acoustic-kit',engine:'membrane',partials:[1,.18,.07],noise:2400,q:.7,hatType:'plate'},
 rock:{sample:'Kit3',engine:'membrane',partials:[1,.44,.22,.08],noise:1700,q:.85,hatType:'plate',click:.24},
 metal:{sample:'Kit8',engine:'punch',partials:[1,.32,.1,.05],noise:4100,q:.9,hatType:'bright',click:.4},
 jazz:{sample:'breakbeat8',engine:'brush',partials:[1,.06],noise:4800,q:.3,hatType:'brush',click:.04},
 vintage:{sample:'LINN',engine:'gated',partials:[1,.5,.14,.03],noise:1200,q:1.2,hatType:'pulse',click:.08},
 studio:{sample:'R8',engine:'membrane',partials:[1,.12,.19],noise:2900,q:.8,hatType:'plate',click:.15},
 e808:{sample:'CR78',engine:'sub',partials:[1],noise:2000,q:.6,hatType:'pulse',click:.06},
 e909:{sample:'KPR77',engine:'punch',partials:[1,.65,.16],noise:4300,q:.7,hatType:'bright',click:.32},
 electro:{sample:'4OP-FM',engine:'fm',partials:[1,.1,.4],noise:6200,q:1.4,hatType:'fm',click:.2},
 trap:{sample:'Stark',engine:'glide',partials:[1,.08],noise:1450,q:1.1,hatType:'tight',click:.035},
 hiphop:{sample:'breakbeat13',engine:'dust',partials:[1,.7,.25,.16],noise:1050,q:.95,hatType:'dark',click:.12},
 dance:{sample:'Techno',engine:'punch',partials:[1,.4,.35,.1],noise:3300,q:.65,hatType:'bright',click:.29},
 brasil:{engine:'skin'},samba:{engine:'samba'}
};
for(const [id,design] of Object.entries(timbreDesigns))Object.assign(kitProfiles[id],design);
kitProfiles.jazz.desc='Afinação alta e caixa suave';kitProfiles.rock.desc='Caixa grave e pele encorpada';
kitProfiles.metal.desc='Ataque seco, clique e pratos vivos';kitProfiles.hiphop.desc='Caixa escura e textura de breakbeat';
kitProfiles.electro.desc='Síntese FM e acentos metálicos';kitProfiles.e909.desc='Ataque firme e caixa brilhante';
kitLabels.samba=['Surdo','Caixa de samba','Ganzá','Pandeiro aberto','Tamborim','Palmas'];
let currentHit={velocity:1,lane:null},previousKit=null,previewGeneration=0;
function fmTone(at,start,end,duration,level,ratio=2,index=2){
 const carrier=ctx.createOscillator(),mod=ctx.createOscillator(),depth=ctx.createGain();
 carrier.frequency.setValueAtTime(start,at);carrier.frequency.exponentialRampToValueAtTime(end,at+.06);
 mod.frequency.setValueAtTime(start*ratio,at);mod.frequency.exponentialRampToValueAtTime(end*ratio,at+.06);
 depth.gain.setValueAtTime(start*index,at);depth.gain.exponentialRampToValueAtTime(.001,at+duration);
 mod.connect(depth);depth.connect(carrier.frequency);mod.start(at);mod.stop(at+duration+.02);
 return voice(carrier,null,at,duration,level,{cleanup:()=>{try{mod.stop()}catch{}mod.disconnect();depth.disconnect()}});
}
function syntheticDrum(r,at,p){
 if(r===0){
  if(p.engine==='fm')fmTone(at,p.body*3,p.body,p.kickDecay,.77,1.47,3.4);
  else{
   const sweep=p.engine==='glide'?.15:p.engine==='sub'?.045:.025;
   tone(at,p.body*(p.engine==='punch'?5:3),p.body,p.kickDecay,.84,'sine',{sweep,harmonics:p.partials});
   if(p.engine==='punch')tone(at,150,65,.075,.3,'triangle',{lowpass:3200,sweep:.018});
   if(p.engine==='membrane'||p.engine==='brush')tone(at,p.body*2.71,p.body*2.25,p.kickDecay*.42,p.engine==='brush'?.09:.24,'sine');
   if(p.engine==='dust'||p.engine==='gated')tone(at,p.body*1.8,p.body*1.12,.1,.19,'triangle',{lowpass:1200});
  }
  noise(at,p.engine==='brush'?.022:.008,p.click||.09,p.engine==='punch'?4500:1800,'bandpass',{ceiling:p.bright*.65,attack:.0004});
 }
 if(r===1){
  if(p.engine==='fm')fmTone(at,p.snare*1.5,p.snare*.7,p.snareDecay,.34,3.14,4.6);
  else tone(at,p.snare*1.2,p.snare*.82,p.snareDecay,p.engine==='brush'?.13:.35,'sine',{harmonics:p.partials,sweep:.024});
  const duration=p.engine==='brush'?.28:p.engine==='gated'?.075:p.snareDecay;
  noise(at,duration,p.engine==='brush'?.31:.53,p.noise,'bandpass',{q:p.q,ceiling:p.bright,attack:p.engine==='brush'?.012:.001});
  if(p.engine==='membrane'||p.engine==='punch')tone(at,p.snare*1.83,p.snare*1.6,.075,.13,'sine');
  if(p.engine==='dust')noise(at,.035,.12,530,'bandpass',{q:1.5,ceiling:3000});
 }
 if(r===2||r===3){
  if(r===2)chokeHats(at);
  const duration=(r===2?(p.hatType==='tight'?.025:.05):(p.hatType==='brush'?.46:.31))*Math.sqrt(p.decay);
  const freq=p.hatType==='dark'?3800:p.hatType==='brush'?5200:p.hat*1.9;
  noise(at,duration,p.hatType==='brush'?.16:.24,freq,'highpass',{pan:.17,ceiling:p.bright,lane:r});
  if(p.hatType==='fm')fmTone(at,p.hat,p.hat,duration,.07,2.71,3.2);
  else if(p.hatType!=='brush'&&p.hatType!=='dark'){
   const ratios=p.hatType==='pulse'?[1,1.342,1.789,2.123]:[1,1.47,1.93];
   ratios.forEach((ratio,i)=>tone(at,p.hat*ratio,p.hat*ratio,duration/(1+i*.2),.026/(1+i),p.hatType==='pulse'?'triangle':'sine',{pan:.17,lane:r,lowpass:p.bright}));
  }
 }
 if(r===4){
  if(p.engine==='fm')fmTone(at,p.snare*1.8,p.snare*.5,.33,.58,1.414,4);
  else{tone(at,p.snare*1.35,p.snare*.5,.32*p.decay,.57,'sine',{harmonics:p.partials,sweep:.07});tone(at,p.snare*2.3,p.snare*1.8,.14,.15,'sine');}
 }
 if(r===5)clap(at,p.electronic,p);
}
function sambaDrum(r,at,p){
 const natural=soundMode==='acoustic';
 if(r===0){tone(at,103,72,natural?.42:.23,.8,natural?'sine':'triangle',{sweep:.025,lowpass:1600});if(natural)tone(at,192,173,.16,.17);noise(at,.012,.15,1100);}
 if(r===1){tone(at,320,255,.055,.2,'triangle',{lowpass:6000});noise(at,natural?.09:.05,.53,natural?3300:2100,'bandpass',{q:.65,ceiling:9000});}
 if(r===2)noise(at,natural?.075:.043,.28,natural?4800:6500,'highpass',{pan:.22,ceiling:10500,attack:.004});
 if(r===3){noise(at,natural?.19:.1,.28,5100,'highpass',{ceiling:10000,pan:.15});tone(at,210,160,.075,.14,'triangle',{lowpass:2400});}
 if(r===4){tone(at,natural?720:910,natural?610:780,natural?.085:.045,.42,natural?'sine':'triangle',{lowpass:6000,sweep:.012});if(natural)tone(at,1190,1110,.035,.13);noise(at,.012,.22,3600,'bandpass',{ceiling:8000});}
 if(r===5)clap(at,!natural,p);
}
function sound(r,at,velocity=1,articulation='normal'){
 const previous=currentHit;currentHit={velocity:Math.min(1.2,Math.max(.05,velocity)),lane:r};
 try{
  const p=kitProfiles[kit];
  if(r>=6)additionalDrum(r,at,p,articulation);
  else if(r===1&&articulation==='rim'){
   tone(at,p.snare*4.1,p.snare*3.6,.035,.4,'triangle',{lowpass:p.bright*.65,sweep:.006});
   tone(at,p.snare*7.3,p.snare*7.1,.017,.13,'sine');noise(at,.008,.14,p.snare*10,'bandpass',{ceiling:7000});
  }else if(r===3&&articulation==='pedal'&&!p.percussion){
   chokeHats(at);noise(at,.045,.23,p.hat*1.8,'highpass',{ceiling:p.bright,pan:.18});
  }else if(kit==='samba')sambaDrum(r,at,p);
  else if(p.percussion)percussionDrum(r,at,p);
  else if(soundMode==='acoustic')sampledDrum(r,at,p);
  else syntheticDrum(r,at,p);
 }finally{currentHit=previous}
}

// As seis pistas compartilham funções rítmicas: grave, acento, condução,
// condução aberta, tom/agogô e palmas. Cada kit dá a elas seu próprio timbre.
const presets = {
  baiao:{name:'Baião',group:'Brasileiros',bpm:100,meter:2,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[3,7,11,15],[],[]],info:'Grave sincopado e condução de triângulo. Experimente com Percussão brasileira.'},
  sertanejo:{name:'Sertanejo',group:'Brasileiros',bpm:112,hits:[[0,6,8,10],[4,12],[0,2,4,6,8,10,12,14],[14],[15],[]],info:'Base de sertanejo com caixa nos tempos 2 e 4.'},
  vaneirao:{name:'Vaneirão',group:'Brasileiros',bpm:150,meter:2,hits:[[0,4,8,12],[2,6,10,14],[0,2,4,6,8,10,12,14],[],[7,15],[]],info:'Base gaúcha rápida, com alternância de grave e caixa.'},
  arrocha:{name:'Arrocha (arroxa)',group:'Brasileiros',bpm:92,hits:[[0,6,8,14],[4,12],[0,2,3,6,8,10,11,14],[7,15],[],[4,12]],info:'Base lenta e sincopada, com caixa e palmas marcadas.'},
  xaxado:{name:'Xaxado',group:'Brasileiros',bpm:112,meter:2,hits:[[0,6,8,14],[2,4,10,12],[0,2,4,6,8,10,12,14],[7,15],[],[]],info:'Acentos secos e sincopados em dois tempos.'},
  vaneira:{name:'Vaneira',group:'Brasileiros',bpm:104,meter:2,hits:[[0,8],[4,12],[0,2,4,6,8,10,12,14],[6,14],[7,15],[]],info:'Base gaúcha em andamento moderado, com alternância de acentos.'},
  xote:{name:'Xote',group:'Brasileiros',bpm:82,meter:2,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[],[]],info:'Base de forró mais cadenciada, em dois tempos.'},
  forro:{name:'Forró',group:'Brasileiros',bpm:132,meter:2,hits:[[0,3,6,8,11,14],[4,12],[0,2,4,6,8,10,12,14],[3,7,11,15],[15],[]],info:'Base de forró acelerada, com grave e condução sincopados.'},
  samba:{name:'Samba',group:'Brasileiros',bpm:104,meter:2,hits:[[0,6,8,14],[2,5,8,10,13],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[6,14],[0,3,6,10,12],[]],info:'Adaptação para seis pistas, com grave e acentos de samba.'},
  pagode:{name:'Pagode',group:'Brasileiros',bpm:96,meter:2,hits:[[0,6,8,14],[3,6,10,14],[0,2,4,6,8,10,12,14],[7,15],[2,5,9,12],[]],info:'Adaptação com grave, condução e acentos sincopados.'},
  bossa:{name:'Bossa nova',group:'Brasileiros',bpm:126,meter:2,hits:[[0,6,8,14],[0,3,6,10,13],[0,2,4,6,8,10,12,14],[],[],[]],info:'Base leve de bossa nova, com síncopes na caixa.'},
  maracatu:{name:'Maracatu',group:'Brasileiros',bpm:100,meter:2,hits:[[0,3,6,8,11,14],[4,7,12,15],[0,2,4,6,8,10,12,14],[],[0,6,10,14],[]],info:'Adaptação de acentos do maracatu para as seis pistas.'},
  frevo:{name:'Frevo',group:'Brasileiros',bpm:160,meter:2,hits:[[0,4,8,12],[2,3,6,7,10,11,14,15],[0,2,4,6,8,10,12,14],[7,15],[6,14],[]],info:'Base rápida com caixa movimentada e acentos em dois tempos.'},
  funk:{name:'Funk brasileiro',group:'Brasileiros',bpm:130,hits:[[0,3,6,10],[4,12],[0,2,4,6,8,10,11,14],[15],[7,15],[]],info:'Base de funk com graves e acentos deslocados.'},
  valsa:{name:'Valsa',group:'Salão',bpm:120,meter:3,steps:12,hits:[[0],[4,8],[0,2,4,6,8,10],[],[],[]],info:'Três tempos: grave no primeiro, caixa no segundo e terceiro.'},
  pop:{name:'Pop',group:'Pop e outros',bpm:110,hits:[[0,8],[4,12],[0,2,4,6,8,10,12,14],[],[14],[]],info:'Base de quatro tempos com caixa nos tempos 2 e 4.'},
  poprock:{name:'Pop rock',group:'Pop e outros',bpm:120,hits:[[0,6,8,10],[4,12],[0,2,4,6,8,10,12,14],[15],[14],[]],info:'Base de pop rock com bumbo mais movimentado.'},
  rock:{name:'Rock',group:'Pop e outros',bpm:128,hits:[[0,2,8,10],[4,12],[0,2,4,6,8,10,12,14],[6,14],[15],[]],info:'Base de rock com bumbo duplo e caixa marcada.'},
  reggae:{name:'Reggae',group:'Pop e outros',bpm:76,hits:[[8],[8],[2,6,10,14],[],[],[]],info:'Base one drop: bumbo e caixa no terceiro tempo.'},
  disco:{name:'Disco',group:'Pop e outros',bpm:118,hits:[[0,4,8,12],[4,12],[0,4,8,12],[2,6,10,14],[],[4,12]],info:'Bumbo nos quatro tempos e chimbal nos contratempos.'},
  hiphop:{name:'Hip-hop',group:'Eletrônicos',bpm:88,hits:[[0,6,8,11],[4,12],[0,2,4,6,8,10,12,14],[],[],[12]],info:'Base de hip-hop com grave sincopado.'},
  house:{name:'House',group:'Eletrônicos',bpm:124,hits:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[2,6,10,14],[],[4,12]],info:'Bumbo constante e chimbal aberto nos contratempos.'},
  baiao_balancado:{name:'Baião balanceado',group:'Brasileiros',bpm:108,meter:2,hits:[[0,3,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[3,7,11,15],[10],[]],info:'Variação com antecipação no grave e um acento de agogô. Experimente a percussão.'},
  xote_universitario:{name:'Xote universitário',group:'Brasileiros',bpm:88,meter:2,hits:[[0,6,8,11,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[],[12]],info:'Xote com grave mais movimentado e palmas no segundo compasso.'},
  forro_universitario:{name:'Forró universitário',group:'Brasileiros',bpm:126,meter:2,hits:[[0,3,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[3,7,15],[10,15],[4,12]],info:'Base de forró com palmas e pequenas respostas no tom ou agogô.'},
  arrastape:{name:'Arrasta-pé',group:'Brasileiros',bpm:158,meter:2,hits:[[0,4,8,12],[2,6,10,14],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[7,15],[],[6,14]],info:'Marcação rápida em dois tempos para a festa junina.'},
  piseiro:{name:'Piseiro',group:'Brasileiros',bpm:160,meter:2,hits:[[0,3,6,8,10,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[],[4,10,12]],info:'Base de piseiro com bumbo eletrônico, palmas e contratempos.'},
  sertanejo_universitario:{name:'Sertanejo universitário',group:'Brasileiros',bpm:124,hits:[[0,3,6,8,10,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[14,15],[4,12]],info:'Versão mais cheia, com bumbo sincopado, palmas e virada curta.'},
  sertanejo_raiz:{name:'Sertanejo raiz',group:'Brasileiros',bpm:96,meter:2,hits:[[0,8],[4,12],[0,4,8,12],[6,14],[7],[]],info:'Base simples em dois tempos, deixando espaço para viola e voz.'},
  modao:{name:'Modão em 3 tempos',group:'Brasileiros',bpm:96,meter:3,steps:12,hits:[[0,10],[4,8],[0,2,4,6,8,10],[],[11],[]],info:'Acompanhamento ternário de modão, com aproximação para o primeiro tempo.'},
  vaneira_campeira:{name:'Vaneira campeira',group:'Brasileiros',bpm:112,meter:2,hits:[[0,6,8],[4,12],[0,2,4,6,8,10,12,14],[6,14],[3,11],[]],info:'Vaneira com respostas no tom e grave antecipado no primeiro compasso.'},
  vaneirao_sincopado:{name:'Vaneirão sincopado',group:'Brasileiros',bpm:156,meter:2,hits:[[0,3,4,8,11,12],[2,6,10,14],[0,2,4,6,8,10,12,14],[7,15],[13,15],[]],info:'Vaneirão rápido com antecipações de bumbo e resposta de tom.'},
  arrocha_romantico:{name:'Arrocha romântico',group:'Brasileiros',bpm:80,hits:[[0,6,8,11],[4,12],[0,2,6,8,10,14],[15],[7],[4,12]],info:'Arrocha mais espaçado, com condução leve e palmas na caixa.'},
  samba_reggae:{name:'Samba-reggae',group:'Brasileiros',bpm:98,meter:2,hits:[[0,4,8,12],[3,6,11,14],[0,2,4,6,8,10,12,14],[7,15],[2,6,10,14],[4,12]],info:'Adaptação do diálogo entre graves e acentos do samba-reggae para seis pistas.'},
  axe:{name:'Axé',group:'Brasileiros',bpm:116,meter:2,hits:[[0,6,8,12],[4,12],[0,2,4,6,8,10,12,14],[3,7,11,15],[2,10,14],[4,12]],info:'Base festiva com bumbo, contratempos e respostas de percussão.'},
  carimbo:{name:'Carimbó',group:'Brasileiros',bpm:112,meter:2,hits:[[0,3,8,11],[4,6,12,14],[0,2,4,6,8,10,12,14],[7,15],[2,6,10,14],[]],info:'Adaptação dos acentos do carimbó para grave, caixa e percussão.'},
  lambada:{name:'Lambada',group:'Brasileiros',bpm:118,meter:2,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[3,7,11,15],[2,5,10,13],[4]],info:'Base dançante com grave sincopado e respostas nos instrumentos agudos.'},
  samba_rock:{name:'Samba-rock',group:'Brasileiros',bpm:110,hits:[[0,3,6,8,11,14],[4,12],[0,2,4,6,8,10,12,14],[6,14],[3,10],[]],info:'Mistura de caixa marcada e bumbo sincopado, adaptada à bateria.'},
  partido_alto:{name:'Partido-alto',group:'Brasileiros',bpm:96,meter:2,hits:[[0,6,8,14],[0,3,6,8,10,13],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[7,15],[2,5,10,13],[4,12]],info:'Base simplificada de partido-alto, com acentos cruzados na caixa e na percussão.'},
  funk150:{name:'Funk 150 BPM',group:'Brasileiros',bpm:150,hits:[[0,3,6,8,11,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[2,7,10,15],[4,12]],info:'Base acelerada com graves, tom e palmas. Experimente a bateria eletrônica.'},
  pagode_baiano:{name:'Pagode baiano',group:'Brasileiros',bpm:140,meter:2,hits:[[0,3,6,8,10,14],[4,7,12,15],[0,2,4,6,8,10,12,14],[3,11],[2,6,9,13],[4,12]],info:'Adaptação com grave forte e respostas sincopadas de percussão.'},
  ijexa:{name:'Ijexá',group:'Brasileiros',bpm:92,meter:2,hits:[[0,6,8,12],[4,10,14],[0,2,4,6,8,10,12,14],[7,15],[0,3,6,8,11,14],[]],info:'Adaptação instrumental dos acentos do ijexá, com a linha aguda em destaque.'},
  salsa:{name:'Salsa',group:'Latinos',bpm:180,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[],[0,3,6,10,14],[4,10]],info:'Base latina simplificada para seis pistas, com tumbao e acentos agudos.'},
  merengue:{name:'Merengue',group:'Latinos',bpm:132,meter:2,hits:[[0,4,8,12],[2,6,10,14],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[],[3,7,11,15],[6,14]],info:'Marcação rápida e regular com condução contínua e respostas agudas.'},
  bachata:{name:'Bachata',group:'Latinos',bpm:124,hits:[[0,8],[4,12],[0,2,4,6,8,10,12,14],[6,14],[0,3,6,8,11,14],[15]],info:'Adaptação com grave espaçado e respostas agudas inspiradas no bongô.'},
  cumbia:{name:'Cumbia',group:'Latinos',bpm:94,meter:2,hits:[[0,4,8,12],[6,14],[0,2,4,6,8,10,12,14],[2,10],[3,7,11,15],[]],info:'Base de cumbia com grave regular e condução em contratempo.'},
  reggaeton:{name:'Reggaeton',group:'Latinos',bpm:94,hits:[[0,8],[3,6,11,14],[0,2,4,6,8,10,12,14],[],[],[3,11]],info:'Base de dembow: caixa deslocada sobre o grave nos tempos 1 e 3.'},
  mambo:{name:'Mambo',group:'Latinos',bpm:168,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[7,15],[0,2,6,8,10,14],[3,11]],info:'Adaptação de mambo com marcação aguda e antecipações no grave.'},
  chachacha:{name:'Cha-cha-chá',group:'Latinos',bpm:120,hits:[[0,8],[4,12],[0,4,8,12],[2,6,10,14],[2,6,10,12,14],[12,14]],info:'Base de dança com resposta curta de três acentos no fim da frase.'},
  bolero:{name:'Bolero',group:'Latinos',bpm:76,hits:[[0,8],[4,12],[0,2,4,6,8,10,12,14],[],[3,6,11,14],[15]],info:'Base lenta de bolero, com respostas suaves de percussão.'},
  tango:{name:'Tango',group:'Salão',bpm:120,hits:[[0,4,8,12],[4,10,12],[0,4,8,12],[],[14,15],[]],info:'Adaptação de tango com quatro tempos marcados e aproximação no final.'},
  valsa_lenta:{name:'Valsa lenta',group:'Salão',bpm:84,meter:3,steps:12,hits:[[0],[4,8],[0,4,8],[10],[],[8]],info:'Valsa espaçada, em três tempos, para acompanhar melodias lentas.'},
  balada:{name:'Balada pop',group:'Pop e outros',bpm:72,hits:[[0,7,8],[4,12],[0,2,4,6,8,10,12,14],[15],[],[12]],info:'Base lenta e aberta, com antecipação de bumbo e palmas discretas.'},
  soul:{name:'Soul',group:'Pop e outros',bpm:92,hits:[[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[10],[15],[4]],info:'Base de soul em subdivisão reta, com acentos de caixa bem marcados.'},
  rnb:{name:'R&B',group:'Pop e outros',bpm:78,hits:[[0,3,7,10],[4,12],[0,2,3,6,8,10,11,14],[15],[],[4,12]],info:'Base de R&B com bumbo deslocado e pequenos detalhes no chimbal.'},
  hardrock:{name:'Hard rock',group:'Pop e outros',bpm:136,hits:[[0,2,6,8,10,14],[4,12],[0,2,4,6,8,10,12,14],[4,12],[14,15],[]],info:'Bumbo mais pesado, caixa forte e uma virada curta no tom.'},
  punk:{name:'Punk rock',group:'Pop e outros',bpm:184,hits:[[0,2,8,10],[4,12],[0,2,4,6,8,10,12,14],[0,8],[14,15],[4,12]],info:'Base rápida de punk com condução aberta e acentos de caixa.'},
  trap:{name:'Trap',group:'Eletrônicos',bpm:140,hits:[[0,7,10],[8],[0,2,4,6,7,8,10,12,13,14,15],[6],[],[8]],info:'Sensação de meio-tempo, caixa no terceiro tempo e pequenas rajadas de chimbal.'},
  techno:{name:'Techno',group:'Eletrônicos',bpm:132,hits:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[2,6,10,14],[3,11],[12]],info:'Bumbo nos quatro tempos e camadas agudas com resposta de tom.'},
  drumandbass:{name:'Drum and bass',group:'Eletrônicos',bpm:172,hits:[[0,7,10],[4,12],[0,2,4,6,8,10,12,14],[3,11],[15],[12]],info:'Base rápida com bumbo deslocado e caixa nos tempos 2 e 4.'}
};
// Levas de acompanhamento em semicolcheias. BPM = semínimas por minuto.
// Há variantes regionais: o nome da família e os acentos descrevem esta versão.
function grooveRow(events,length){
 const row=Array(length).fill(0);
 for(const event of events){const [position,velocity]=Array.isArray(event)?event:[event,.78];row[position]=velocity}
 return row;
}
function repeatBar(events,length=8,bars=2){
 return Array.from({length:bars},(_,bar)=>events.map(event=>{const [s,v]=Array.isArray(event)?event:[event,.78];return [bar*length+s,v]})).flat();
}
const eighths=(length,off=.55,on=.68)=>Array.from({length:length/2},(_,i)=>[i*2,i%2?off:on]);
const sixteenths=(length,values=[.62,.30,.82,.38])=>Array.from({length},(_,s)=>[s,values[s%values.length]]);
function brazilGroove(id,bpm,meter,range,recommendedKit,info,rows,options={}){
 const length=options.steps||16,p=presets[id];
 const velocities=rows.map(events=>grooveRow(events,length));
 Object.assign(p,{bpm,meter,steps:length,bpmRange:range,recommendedKit,info,velocities,hits:velocities.map(row=>row.flatMap((v,s)=>v>0?[s]:[])),articulations:options.articulations||[],family:options.family||p.name});
}
const zabumba=repeatBar([[0,.95],[3,.65],[6,.85]]);
const bacalhau=repeatBar([[4,.85],[7,.28]]);
const triangleClosed=repeatBar([[0,.5],[1,.28],[2,.8],[4,.55],[5,.3],[6,.85]]);
const triangleOpen=repeatBar([[3,.65],[7,.75]]);
brazilGroove('baiao',112,2,[90,140],'brasil','Baião de zabumba: grave em 1, na última semicolcheia de 1 e no contratempo de 2; bacalhau no segundo tempo. Triângulo alterna golpes fechados e abertos.',[zabumba,bacalhau,triangleClosed,triangleOpen,[],[]]);
brazilGroove('baiao_balancado',120,2,[95,145],'brasil','Variação de baião com resposta de agogô e antecipação do grave no fim da frase.',[zabumba.concat([[15,.5]]),repeatBar([[4,.9],[5,.3],[7,.35]]),triangleClosed,triangleOpen,[[2,.6],[10,.5],[13,.7]],[]]);
brazilGroove('xote',84,2,[70,100],'brasil','Xote em dois tempos: graves regulares e resposta aguda nos contratempos. O andamento é mais cadenciado que o baião.',[repeatBar([[0,.9],[4,.8]]),repeatBar([[2,.8],[6,.9],[7,.25]]),repeatBar([[0,.48],[2,.7],[4,.5],[6,.75]]),repeatBar([[3,.48],[7,.6]]),[],[]]);
brazilGroove('xote_universitario',92,2,[78,106],'brasil','Xote com antecipação no fim do segundo compasso e palmas leves nos contratempos.',[repeatBar([[0,.9],[4,.8]]).concat([[15,.55]]),repeatBar([[2,.85],[6,.9]]),triangleClosed,triangleOpen,[],[[6,.45],[14,.6]]]);
brazilGroove('forro',132,2,[112,155],'brasil','Esta base de forró usa a levada do baião em andamento rápido, com triângulo em semicolcheias e resposta seca da zabumba.',[repeatBar([[0,.95],[3,.65],[6,.85]]),repeatBar([[4,.9],[5,.3],[7,.4]]),triangleClosed,triangleOpen,[[10,.45],[15,.65]],[]],{family:'Forró · baião rápido'});
brazilGroove('forro_universitario',108,2,[90,128],'brasil','Forró universitário apoiado no xote: graves nos tempos, resposta nos contratempos e pequenos reforços de palmas.',[repeatBar([[0,.9],[4,.82]]).concat([[11,.45],[15,.5]]),repeatBar([[2,.85],[6,.9]]),triangleClosed,triangleOpen,[[13,.45]],[[6,.5],[14,.6]]],{family:'Forró universitário · xote'});
brazilGroove('arrastape',160,2,[140,180],'brasil','Arrasta-pé de festa junina: marcação binária rápida, alternância de grave e agudo e condução contínua do triângulo.',[repeatBar([[0,.95],[4,.85]]),repeatBar([[2,.85],[6,1]]),repeatBar([[0,.5],[1,.32],[2,.7],[4,.5],[5,.32],[6,.78]]),triangleOpen,[[7,.45],[15,.6]],[[14,.4]]]);
const habanera=repeatBar([[0,1],[3,.6],[4,.85],[6,.6]]);
brazilGroove('vaneira',104,2,[90,120],'studio','Vaneira de base habanera: grave pontuado, resposta nos contratempos e acentos regulares em dois tempos.',[habanera,repeatBar([[2,.82],[6,.95]]),eighths(16,.62,.5),[[7,.35],[15,.5]],[],[]]);
brazilGroove('vaneira_campeira',112,2,[96,126],'studio','Vaneira com desenho de habanera, aro mais seco e uma pequena resposta de tom no segundo compasso.',[habanera,repeatBar([[2,.85],[6,.95]]).concat([[15,.28]]),eighths(16,.72,.48),[[7,.4]],[[11,.4],[15,.6]],[]]);
brazilGroove('vaneirao',144,2,[125,165],'studio','Vaneirão: levada binária rápida da família da vaneira, com acentos de caixa nos contratempos e reforços curtos de condução.',[habanera,repeatBar([[2,.9],[6,1],[7,.28]]),sixteenths(16,[.52,.25,.78,.28]),[[15,.45]],[],[]]);
brazilGroove('vaneirao_sincopado',152,2,[132,172],'studio','Vaneirão com antecipações no grave e resposta curta de tom ao fechar os dois compassos.',[habanera.concat([[11,.5],[15,.55]]),repeatBar([[2,.9],[6,1]]),sixteenths(16,[.55,.3,.82,.32]),[[7,.4]],[[13,.45],[15,.7]],[]]);
brazilGroove('xaxado',116,2,[100,140],'brasil','Xaxado seco, em dois tempos: grave sincopado e resposta aguda em 1-e e no segundo tempo; golpes finais mais suaves.',[repeatBar([[0,.95],[3,.6],[6,.8]]),repeatBar([[2,.8],[4,.95],[7,.3]]),eighths(16,.78,.48),[[7,.5],[15,.6]],[],[]]);
brazilGroove('sertanejo',108,4,[92,124],'studio','Levada de sertanejo pop em quatro tempos: caixa em 2 e 4, bumbo sincopado e chimbal alternando acentos.',[[[0,1],[6,.68],[8,.9],[10,.65],[14,.7]],[[4,.9],[12,1]],eighths(16,.5,.7),[[15,.4]],[],[]],{family:'Sertanejo · pop 4/4'});
brazilGroove('sertanejo_universitario',124,4,[110,138],'rock','Sertanejo universitário em 4/4, com caixa e palmas em 2 e 4; grave antecipado no fim da frase.',[[[0,1],[3,.6],[6,.75],[8,.92],[10,.65],[14,.8],[15,.35]],[[4,.95],[12,1]],sixteenths(16,[.6,.24,.7,.25]),[[7,.4]],[[15,.45]],[[4,.5],[12,.6]]]);
brazilGroove('sertanejo_raiz',96,2,[80,112],'vintage','Base de polca para sertanejo raiz: grave nos tempos e aro nos contratempos. As formas ternárias estão no modão e na valsa.',[repeatBar([[0,.9],[4,.8]]),repeatBar([[2,.8],[6,.9]]),eighths(16,.62,.4),[],[[15,.35]],[]],{family:'Sertanejo raiz · polca 2/4',articulations:['','rim']});
brazilGroove('modao',96,3,[78,116],'vintage','Modão ternário: grave no primeiro tempo, resposta em 2 e 3 e aproximação suave antes da volta ao primeiro tempo.',[[[0,.95],[10,.38]],[[4,.65],[8,.82]],eighths(12,.4,.52),[],[[11,.3]],[]],{steps:12,family:'Modão · base ternária',articulations:['','rim']});
brazilGroove('arrocha',92,4,[78,108],'e808','Arrocha romântico em 4/4: caixa em 2 e 4 e síncopes do grave entre os tempos. A condução tem respostas, em vez de golpes todos iguais.',[[[0,.95],[3,.55],[6,.78],[8,.9],[11,.5],[14,.82]],[[4,.9],[12,1]],[[0,.55],[2,.4],[3,.28],[6,.65],[8,.5],[10,.42],[11,.28],[14,.7]],[[7,.38],[15,.5]],[],[[4,.4],[12,.55]]]);
brazilGroove('arrocha_romantico',80,4,[68,94],'hiphop','Arrocha mais lento: grave espaçado, caixa firme e notas de aproximação discretas.',[[[0,.9],[6,.7],[8,.85],[14,.6]],[[4,.8],[12,.9]],eighths(16,.36,.5),[[15,.4]],[[11,.3]],[[12,.4]]]);
brazilGroove('piseiro',156,2,[140,174],'e808','Piseiro em dois tempos: grave sincopado, caixa eletrônica e palmas em resposta; notas leves de condução deixam espaço para a marcação principal.',[repeatBar([[0,1],[3,.75],[6,.85]]).concat([[12,.55]]),repeatBar([[4,1],[7,.25]]),sixteenths(16,[.55,.22,.7,.25]),[[15,.4]],[],[[4,.55],[12,.65]]]);
const sambaBass=repeatBar([[0,.48],[3,.55],[4,1],[7,.68]],8,4);
const sambaRide=sixteenths(32,[.44,.28,.72,.32]);
brazilGroove('samba',104,2,[88,124],'samba','Samba em 2/4: surdo forte no segundo tempo, aproximações antes dos tempos e frase sincopada de agudo ao longo de quatro compassos.',[sambaBass,[[2,.4],[5,.65],[8,.3],[10,.6],[13,.7],[18,.42],[21,.65],[24,.3],[26,.62],[29,.8]],sambaRide,[[6,.4],[14,.48],[22,.4],[30,.55]],[[0,.65],[3,.8],[6,.7],[10,.85],[12,.6],[16,.65],[19,.78],[22,.68],[25,.7],[28,.9]],[]],{steps:32});
brazilGroove('pagode',92,2,[78,110],'samba','Pagode com surdo no segundo tempo, condução leve e resposta sincopada de tamborim. Notas intermediárias são mais suaves que os acentos.',[sambaBass,[[3,.5],[6,.8],[10,.65],[14,.85],[17,.35],[19,.5],[22,.8],[26,.7],[30,.9]],sixteenths(32,[.5,.28,.65,.35]),[[7,.48],[15,.55],[23,.45],[31,.6]],[[2,.6],[5,.7],[9,.55],[12,.8],[18,.6],[21,.72],[24,.6],[28,.85]],[[12,.35],[28,.45]]],{steps:32});
brazilGroove('bossa',128,2,[96,156],'jazz','Bossa nova: bumbo suave com antecipações, clave de aro em frase longa e condução leve. Quatro compassos de 2/4; não é uma caixa pop em 2 e 4.',[repeatBar([[0,.55],[6,.42]],8,4),[[0,.62],[6,.55],[12,.65],[20,.58],[26,.68]],eighths(32,.35,.48),[[4,.25],[12,.3],[20,.25],[28,.3]],[],[]],{steps:32,articulations:['','rim','','pedal']});
brazilGroove('maracatu',96,2,[82,112],'samba','Adaptação de baque virado: graves dialogam com os acentos de caixa; o agudo mantém uma linha de sino, em vez de um chimbal de rock.',[repeatBar([[0,.9],[3,.6],[6,1]],8,4),repeatBar([[2,.45],[4,.8],[7,.6]],8,4),eighths(32,.48,.6),[],[[0,.65],[3,.85],[6,.65],[8,.72],[10,.6],[14,.88],[16,.65],[19,.82],[22,.68],[24,.72],[27,.6],[30,.92]],[]],{steps:32});
brazilGroove('frevo',160,2,[140,184],'metal','Frevo em dois tempos: bumbo marcado e caixa em semicolcheias, com golpes fracos entre acentos e uma resposta final de tom.',[repeatBar([[0,.8],[4,.95]]),sixteenths(16,[.52,.27,.86,.38]),eighths(16,.55,.65),[[7,.55],[15,.7]],[[14,.35],[15,.55]],[]]);
brazilGroove('funk',130,4,[120,140],'e808','Funk carioca: base de tamborzão, com graves e respostas em síncope. A condução não repete o chimbal de pop sobre todas as colunas.',[[[0,1],[3,.85],[6,.95],[10,.9]],[[4,.72],[12,.85]],[[2,.35],[6,.45],[10,.35],[14,.48]],[],[[2,.78],[7,.92],[9,.68],[14,.88]],[[4,.65],[12,.75]]],{family:'Funk carioca · tamborzão'});
brazilGroove('funk150',150,4,[145,160],'trap','Funk 150: resposta de grave e tom em posições diferentes do tamborzão de 130 BPM, com caixa curta e detalhes agudos discretos.',[[[0,1],[3,.9],[6,.92],[8,.85],[11,.9]],[[4,.85],[12,.95]],[[0,.32],[6,.42],[10,.32],[14,.5],[15,.22]],[],[[2,.9],[7,.85],[10,.8],[14,.92]],[[4,.55],[12,.65]]]);
brazilGroove('samba_reggae',100,2,[88,116],'samba','Samba-reggae em dois tempos: graves marcam o pulso, vozes médias respondem em síncope e o agudo desenha a frase de quatro compassos.',[repeatBar([[0,.65],[4,1]],8,4),repeatBar([[3,.72],[6,.92]],8,4),eighths(32,.5,.45),[],[[2,.7],[6,.85],[10,.65],[14,.9],[18,.72],[21,.65],[24,.8],[30,.95]],[[12,.45],[28,.55]]],{steps:32});
brazilGroove('axe',116,2,[102,132],'samba','Axé apoiado no samba-reggae: segundo tempo forte e resposta de agudos e palmas ao fim da frase.',[repeatBar([[0,.6],[4,1]],8,4),repeatBar([[3,.72],[6,.88]],8,4),sixteenths(32,[.45,.2,.6,.25]),[[7,.4],[23,.45]],[[2,.72],[6,.85],[10,.68],[14,.9],[18,.72],[22,.85],[25,.65],[30,.95]],[[12,.5],[28,.65]]],{steps:32,family:'Axé · base samba-reggae'});
brazilGroove('carimbo',112,2,[96,132],'samba','Adaptação de carimbó com diálogo entre grave e agudo e condução de ganzá. Os acentos fecham a frase em dois tempos.',[repeatBar([[0,.95],[3,.65],[4,.75]]),repeatBar([[2,.6],[6,.95]]),sixteenths(16,[.5,.25,.72,.32]),[],repeatBar([[3,.65],[7,.85]]),[]]);
brazilGroove('lambada',118,2,[104,132],'brasil','Lambada em dois tempos, com antecipações de grave e respostas agudas. O fechamento do segundo compasso varia a primeira célula.',[repeatBar([[0,.9],[3,.7],[6,.85]]),repeatBar([[4,.8],[7,.45]]),eighths(16,.65,.48),[[7,.45],[15,.55]],[[2,.6],[5,.8],[10,.65],[13,.78],[15,.45]],[]]);
brazilGroove('samba_rock',112,4,[98,128],'studio','Samba-rock em 4/4: caixa em 2 e 4, bumbo sincopado e resposta de condução. É uma adaptação para bateria, não a levada de surdo do samba.',[[[0,.95],[3,.65],[6,.8],[8,.9],[11,.68],[14,.82]],[[4,.9],[7,.3],[12,1]],eighths(16,.58,.7),[[6,.4],[14,.5]],[[10,.4]],[]]);
brazilGroove('partido_alto',100,2,[84,116],'samba','Partido-alto com resposta sincopada em frase longa. O surdo mantém o segundo tempo forte enquanto caixa e tamborim cruzam os tempos.',[sambaBass,[[0,.75],[3,.55],[6,.85],[10,.7],[13,.9],[18,.78],[21,.6],[24,.85],[28,.72],[31,.9]],sambaRide,[[6,.38],[14,.45],[22,.4],[30,.5]],[[2,.55],[5,.72],[8,.6],[12,.8],[16,.62],[19,.72],[22,.65],[26,.85],[29,.7]],[[12,.4],[28,.5]]],{steps:32});
brazilGroove('pagode_baiano',136,2,[120,152],'samba','Pagode baiano: grave forte e respostas curtas de caixa e agudos em síncope, com fechamento diferente no segundo par de compassos.',[repeatBar([[0,.9],[3,.65],[6,1]],8,4),repeatBar([[4,.9],[7,.6]],8,4),sixteenths(32,[.5,.22,.7,.3]),[],[[2,.82],[6,.9],[9,.62],[13,.85],[18,.8],[22,.95],[25,.65],[29,.9],[31,.55]],[[4,.4],[12,.55],[20,.4],[28,.6]]],{steps:32});
brazilGroove('ijexa',94,2,[80,110],'samba','Adaptação instrumental de ijexá: linha aguda assimétrica e diálogo dos graves em quatro compassos, com golpes de ligação mais leves.',[repeatBar([[0,.82],[6,.92]],8,4),repeatBar([[4,.72],[7,.35]],8,4),eighths(32,.55,.4),[],[[0,.8],[3,.6],[6,.9],[8,.65],[11,.75],[14,.92],[16,.8],[19,.6],[22,.9],[24,.65],[27,.78],[30,.95]],[]],{steps:32});
brazilGroove('valsa',120,3,[96,156],'classic','Valsa em 3/4: um grave forte seguido de dois tempos mais leves. Um compasso tem três semínimas, não quatro.',[[[0,.95]],[[4,.55],[8,.7]],eighths(12,.35,.5),[],[],[]],{steps:12});
brazilGroove('valsa_lenta',84,3,[66,96],'jazz','Valsa lenta em 3/4, com primeiro tempo forte e acompanhamento leve nos tempos 2 e 3.',[[[0,.85]],[[4,.45],[8,.58]],[[0,.42],[4,.35],[8,.4]],[[10,.2]],[],[]],{steps:12,articulations:['','rim']});

function defaultVelocities(){
 for(const [id,labels] of Object.entries(kitLabels)){
  labels[4]=id==='brasil'?'Agogô':id==='samba'?'Tamborim':'Tom médio';
  labels.push(...(id==='brasil'?['Agogô agudo','Zabumba grave 2','Ride','Crash']:id==='samba'?['Repique','Surdo grave','Ride','Crash']:['Tom agudo','Tom grave','Ride','Crash']));
 }
 for(const p of Object.values(presets)){
  const n=p.steps||16;while(p.hits.length<TRACK_COUNT)p.hits.push([]);if(p.velocities)while(p.velocities.length<TRACK_COUNT)p.velocities.push(Array(n).fill(0));
  if(!p.velocities)p.velocities=p.hits.map((row,r)=>Array.from({length:n},(_,s)=>row.includes(s)?r===2?(s%4===0?.65:.45):r===1?.9:.8:0));
  if(!p.bpmRange)p.bpmRange=[Math.max(40,p.bpm-20),Math.min(240,p.bpm+20)];
  if(!p.recommendedKit)p.recommendedKit=p.group==='Eletrônicos'?'e808':'classic';
 }
}
defaultVelocities();
function copyVelocities(n=stepCount){return Array.from({length:TRACK_COUNT},(_,r)=>Array.from({length:n},(_,s)=>presets[selected].velocities[r]?.[s]||.75))}
function renderRhythmTiming(){
 const p=presets[selected],beats=p.meter||4,bars=stepCount/(beats*4),bpm=Number($('tempo').value)||p.bpm;
 $('rhythm-timing').textContent=`${beats}/4 · ${beats} tempos por compasso · ${bars} compasso${bars>1?'s':''} por volta · ♩ = ${bpm} BPM`;
 $('tempo-guide').textContent=`Andamento de referência: ${p.bpm} BPM · faixa sugerida: ${p.bpmRange[0]}–${p.bpmRange[1]} BPM.`;
 $('recommended-kit').textContent='Usar '+kitProfiles[p.recommendedKit].name;
 $('recommended-kit').title='Conjunto sugerido para '+p.name+'; você também pode escolher outra bateria.';
 $('recommended-kit').disabled=kit===p.recommendedKit;
 $('compare-kit').disabled=playing||!previousKit;
 $('compare-kit').textContent=previousKit?'Ouvir anterior: '+kitProfiles[previousKit].name:'Ouvir bateria anterior';
}
function save(){try{
 localStorage.setItem('drumrits-v6',JSON.stringify({schema:6,trackGains,trackMuted,trackSolo,effectId,soundMode,pattern,velocities,tempo:$('tempo').value,volume:$('volume').value,selected,rhythm:$('rhythms').value,kit,stepCount,click:$('beat-click').checked}));
 $('storage-status').textContent='✓ Salvo neste navegador';
}catch{$('storage-status').textContent='Salvamento indisponível neste navegador'}}
function restore(){try{
 const data=JSON.parse(localStorage.getItem('drumrits-v6')||localStorage.getItem('drumrits-v5')||localStorage.getItem('drumrits-v4')||localStorage.getItem('drumrits-v2')||localStorage.getItem('drumrits-v1'));
 if(!data||!Array.isArray(data.pattern))return false;
 let count=data.stepCount||16;
 if(![8,12,16,24,32].includes(count)||![6,TRACK_COUNT].includes(data.pattern.length)||!data.pattern.every(row=>Array.isArray(row)&&row.length===count&&row.every(v=>typeof v==='boolean')))return false;
 selected=Object.hasOwn(presets,data.selected)?data.selected:'pop';const p=presets[selected],custom=data.rhythm==='custom';
 if(count%((p.meter||4)*4)!==0)return false;
 if(!custom){count=p.steps||16;pattern=p.hits.map(row=>Array.from({length:count},(_,s)=>row.includes(s)))}else pattern=data.pattern.map(row=>[...row]);while(pattern.length<TRACK_COUNT)pattern.push(Array(count).fill(false));
 stepCount=count;
 const validVel=data.schema>=5&&Array.isArray(data.velocities)&&[6,TRACK_COUNT].includes(data.velocities.length)&&data.velocities.every(row=>Array.isArray(row)&&row.length===count&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1.2));
 velocities=validVel?data.velocities.map(row=>[...row]):copyVelocities(count);while(velocities.length<TRACK_COUNT)velocities.push(Array(count).fill(.75));
  trackGains=Array.from({length:TRACK_COUNT},(_,i)=>Number.isFinite(data.trackGains?.[i])?Math.min(1.25,Math.max(0,data.trackGains[i])):1);
  trackMuted=Array.from({length:TRACK_COUNT},(_,i)=>data.trackMuted?.[i]===true);trackSolo=Array.from({length:TRACK_COUNT},(_,i)=>data.trackSolo?.[i]===true);effectId=Object.hasOwn(effectPresets,data.effectId)?data.effectId:'dry';$('effect').value=effectId;
 const oldKit={synthetic:'classic',acoustic:'classic',electronic:'e808',percussion:'brasil',studio:'studio'};
 const restoredKit=data.schema>=4?data.kit:oldKit[data.kit];kit=Object.hasOwn(kitLabels,restoredKit)?restoredKit:'classic';$('kit').value=kit;
 soundMode=data.schema>=4&&data.soundMode==='acoustic'?'acoustic':'synthetic';
 $('tempo').value=Math.min(240,Math.max(40,Number(data.tempo)||p.bpm));$('volume').value=Math.min(100,Math.max(0,Number(data.volume)||0));
 $('beat-click').checked=data.click===true;$('rhythms').value=custom?'custom':selected;buildGrid();render();$('storage-status').textContent='✓ Sua última sessão foi recuperada';return true;
}catch{return false}}
function stopPreview(){
 previewGeneration++;previewStarting=false;clearTimeout(previewTimer);
 if(ctx)for(const voice of previewVoices)voice.stop(ctx.currentTime,.012);
 previewVoices.clear();$('preview-kit').textContent='▶︎ Ouvir conjunto';$('preview-status').textContent='Compare os tipos com a mesma levada em 120 BPM.';
}
let previewStarting=false;
async function previewKit(auditionKit=kit){
 if(playing)return;
 if(previewStarting||previewVoices.size){stopPreview();return}
 const token=++previewGeneration;previewStarting=true;
 try{
  await initAudio();if(playing||token!==previewGeneration)return;
  const before=new Set(voices),at=ctx.currentTime+.03,selectedKit=kit;
  try{
   kit=auditionKit;
   for(let s=0;s<16;s++){
    if([0,6,8].includes(s))sound(0,at+s*.125,s===0?1:.8);
    if([4,12].includes(s))sound(1,at+s*.125,.9);
    if(s%2===0)sound(2,at+s*.125,s%4===0?.65:.45);
    if(s===14||s===15)sound(4,at+s*.125,s===14?.65:.85);
   }
  }finally{kit=selectedKit}
  for(const voice of voices)if(!before.has(voice))previewVoices.add(voice);
  $('preview-kit').textContent='■ Parar prévia';$('preview-status').textContent='Ouvindo '+kitProfiles[auditionKit].name+' · '+(soundMode==='acoustic'?'Acústico':'Sintético')+' · 120 BPM';
  previewTimer=setTimeout(stopPreview,2800);
 }catch(error){audioError(error)}finally{if(token===previewGeneration)previewStarting=false}
}

let pattern, velocities, selected='pop', kit='classic', stepCount=16, ctx, master, noiseBuffer, timer;
let playing=false, starting=false, step=0, nextTime=0, epoch=0;
const pending=new Set(), voices=new Set(), cells=[], numbers=[];
const trackColors=['#c2d99a','#e0bd8f','#95c7ab','#9ebdd4','#c3b1d5','#d5a99f','#b2c9d4','#b8c99b','#d5bd85','#d9ad85'];
let libraryFilter='all', undoPattern=null;
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function setupLibrary(){
  $('rhythm-list').replaceChildren();
  $('rhythm-count').textContent=Object.keys(presets).length+' para explorar';
  for(const [id,p] of Object.entries(presets).sort(([,a],[,b])=>a.name.localeCompare(b.name,'pt-BR'))){
    const button=document.createElement('button');button.className='rhythm-choice';button.dataset.rhythm=id;
    button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',p.name+', '+p.bpm+' BPM');
    const icon=document.createElement('span');icon.className='rhythm-icon';icon.textContent='≋';icon.setAttribute('aria-hidden','true');
    const text=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('span');
    name.className='rhythm-name';name.textContent=p.name;meta.className='rhythm-meta';meta.textContent=p.bpm+' BPM · '+(p.meter||4)+'/4';
    text.append(name,meta);const check=document.createElement('span');check.className='choice-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
    button.append(icon,text,check);button.onclick=()=>{loadPreset(id);if($('rhythm-picker').open)$('rhythm-picker').close()};$('rhythm-list').append(button);
  }
  $('rhythm-search').oninput=refreshLibrary;
  document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{libraryFilter=button.dataset.filter;refreshLibrary()});
  document.querySelectorAll('[data-kit]').forEach(button=>button.onclick=()=>{$('kit').value=button.dataset.kit;$('kit').dispatchEvent(new Event('change'));if($('kit-picker').open)$('kit-picker').close()});
  refreshLibrary();
}
function refreshLibrary(){
  const query=normalize($('rhythm-search').value.trim());let count=0;
  document.querySelectorAll('[data-rhythm]').forEach(button=>{
    const p=presets[button.dataset.rhythm],brazil=p.group==='Brasileiros';
    const matches=normalize(p.name+' '+p.group).includes(query)&&(libraryFilter==='all'||(libraryFilter==='brazil'?brazil:!brazil));
    button.hidden=!matches;if(matches)count++;
    button.setAttribute('aria-pressed',String($('rhythms').value===button.dataset.rhythm));
  });
  document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===libraryFilter)));
  $('no-results').hidden=count>0;
}
function syncUi(){
  document.querySelectorAll('[data-kit]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kit===kit)));
  $('volume-value').textContent=$('volume').value+'%';
  $('current-rhythm').textContent=$('rhythms').value==='custom'?'Seu ritmo':presets[selected].name;
  $('meter-badge').textContent=(presets[selected].meter||4)+'/4';
  $('undo').hidden=!undoPattern;refreshLibrary();syncSoundMode();renderRhythmTiming();
}
function setupMenus(){
  $('rhythms').replaceChildren();
  for(const group of [...new Set(Object.values(presets).map(p=>p.group))]){
    const optgroup=document.createElement('optgroup');optgroup.label=group;
    for(const [id,p] of Object.entries(presets).filter(([,p])=>p.group===group)){
      const option=document.createElement('option');option.value=id;option.textContent=p.name;optgroup.append(option);
    }
    $('rhythms').append(optgroup);
  }
  const custom=document.createElement('option');custom.value='custom';custom.textContent='Personalizado';$('rhythms').append(custom);
}
function buildGrid(){
  document.querySelector('.machine').dataset.mixer=mixerVisible?'visible':'hidden';$('toggle-mixer').setAttribute('aria-pressed',String(mixerVisible));$('grid').replaceChildren();cells.length=0;numbers.length=0;
  $('grid').style.gridTemplateColumns=`${innerWidth<650?100:120}px repeat(${stepCount},minmax(30px,1fr)) ${mixerVisible?110:0}px`;
  $('grid').style.minWidth=((innerWidth<650?100:120)+(mixerVisible?110:0)+stepCount*35)+'px';
  $('grid').setAttribute('aria-label',`Grade de ${stepCount} passos`);
  const corner=document.createElement('span');corner.className='corner';corner.textContent='INSTRUMENTOS';$('grid').append(corner);
  const beats=presets[selected].meter||4;
  for(let s=0;s<stepCount;s++){
    const n=document.createElement('span');n.className='number'+(s%4===0?' beat':'');
    n.textContent=s%4===0?String(Math.floor(s/4)%beats+1):['','e','&','a'][s%4];n.title='Compasso '+(Math.floor(s/(beats*4))+1)+', tempo '+(Math.floor(s/4)%beats+1)+', passo '+(s+1);
    numbers.push(n);$('grid').append(n);
  }
  const mixTitle=document.createElement('span');mixTitle.className='mixer-corner';mixTitle.textContent='M · S · VOLUME';$('grid').append(mixTitle);
  kitLabels[kit].forEach((name,r)=>{
    const label=document.createElement('div');label.className='instrument';label.style.setProperty('--track-color',trackColors[r]);
    const audition=document.createElement('button');audition.title='Ouvir '+name;audition.setAttribute('aria-label','Ouvir '+name);
    const dot=document.createElement('span');dot.className='track-dot';dot.setAttribute('aria-hidden','true');
    const title=document.createElement('span');title.textContent=name;audition.append(dot,title);
    audition.onclick=async()=>{try{await initAudio();sound(r,ctx.currentTime)}catch(error){audioError(error)}};
    label.append(audition);$('grid').append(label);cells[r]=[];
    for(let s=0;s<stepCount;s++){
      const b=document.createElement('button');b.className='step'+(Math.floor(s/4)%2===0?' group':'');
      b.style.setProperty('--track-color',trackColors[r]);
      b.setAttribute('aria-label',name+', passo '+(s+1));
      b.onclick=event=>{if(event.shiftKey&&pattern[r][s]){velocities[r][s]=velocities[r][s]<.5?.7:velocities[r][s]<.9?1:.35}else{pattern[r][s]=!pattern[r][s];if(pattern[r][s]&&!velocities[r][s])velocities[r][s]=.75}undoPattern=null;$('rhythms').value='custom';render();save()};
      cells[r][s]=b;$('grid').append(b);
    }
    appendMixerRow(r,name);
  });
  const bars=stepCount/(beats*4);
  $('meter-info').textContent=`${stepCount} passos · ${bars} compasso${bars>1?'s':''} · cada 4 passos = 1 tempo`;
}
function render(){
  cells.forEach((row,r)=>row.forEach((b,s)=>{b.classList.toggle('on',pattern[r][s]);b.setAttribute('aria-pressed',String(pattern[r][s]));const intensity=velocities[r][s]<.5?'suave':velocities[r][s]>.85?'forte':'médio';b.dataset.dynamic=intensity;b.title=kitLabels[kit][r]+', passo '+(s+1)+', '+(pattern[r][s]?intensity:'desligado');b.setAttribute('aria-label',b.title)}));
  const p=presets[selected];
  $('rhythm-info').textContent=($('rhythms').value==='custom'?'Personalizado a partir de '+p.name+'. ':p.name+' · ')+p.info;
  syncUi();updateMixer();syncPadLabels();
}
function loadPreset(name){
  const resume=playing;if(resume)stop();
  undoPattern=null;selected=name;const p=presets[name];stepCount=p.steps||16;
  pattern=kitLabels[kit].map((_,r)=>Array.from({length:stepCount},(_,s)=>p.hits[r].includes(s)));
  velocities=copyVelocities();$('rhythms').value=name;$('tempo').value=p.bpm;buildGrid();render();save();
  if(resume)toggle();
}
let previewTimer;
const previewVoices=new Set(),openHats=new Map();
function chokeHats(at){for(const voice of voices)if(voice.kit===kit&&voice.lane===3&&voice.at<=at)voice.stop(at,.012);openHats.delete(kit)}
function connectOutput(context,volume){return createOutput(context,volume)}
async function initAudio(){
  if(!ctx){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Áudio indisponível');
    ctx=new Audio();master=connectOutput(ctx,Number($('volume').value)/100*.75);
    noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const samples=noiseBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running')throw Error('Áudio suspenso');
  await loadSamples();startMeter();
}
function voice(source,filters,at,duration,level,options={}){
  level*=currentHit.velocity;const gain=ctx.createGain(),attack=options.attack??.0015;
  const nodes=filters?(Array.isArray(filters)?filters:[filters]):[];
  let node=source;nodes.forEach(filter=>{node.connect(filter);node=filter});
  node.connect(gain);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+attack);
  gain.gain.exponentialRampToValueAtTime(.0001,at+Math.max(duration,attack+.002));
  const pan=ctx.createStereoPanner();pan.pan.value=options.pan||0;gain.connect(pan);pan.connect(trackBus(ctx,options.lane??currentHit.lane));
  const handle={kit,mode:soundMode,lane:options.lane??currentHit.lane,at,end:at+duration,source,gain,level,attack,
    stop(time=ctx.currentTime,fade=.012){
      if(time>=this.end)return;
      if(time<=at){source.stop(Math.max(0,time));this.end=time;return}
      // Explicitly anchor the exponential envelope, including future scheduled chokes.
      const elapsed=time-at;
      const value=elapsed<attack?level*elapsed/attack:level*Math.pow(.0001/level,(elapsed-attack)/Math.max(.002,duration-attack));
      gain.gain.cancelScheduledValues(time);gain.gain.setValueAtTime(Math.max(.0001,value),time);
      gain.gain.linearRampToValueAtTime(0,time+fade);source.stop(time+fade+.002);this.end=time+fade;
    }
  };
  voices.add(handle);source.onended=()=>{voices.delete(handle);source.disconnect();nodes.forEach(n=>n.disconnect());gain.disconnect();pan.disconnect();if(openHats.get(handle.kit)===handle)openHats.delete(handle.kit);if(options.cleanup)options.cleanup()};
  source.start(at);source.stop(at+duration+.01);return handle;
}
function tone(at,start,end,duration,level,type='sine',options={}){
  const osc=ctx.createOscillator();osc.type=type;if(options.harmonics)osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(options.harmonics.length+1),new Float32Array([0,...options.harmonics])));osc.frequency.setValueAtTime(start,at);
  osc.frequency.exponentialRampToValueAtTime(end,at+(options.sweep??Math.min(duration,.08)));
  let filter;
  if(options.lowpass){filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=options.lowpass;filter.Q.value=.5}
  return voice(osc,filter,at,duration,level,options);
}
function noise(at,duration,level,freq,type='bandpass',options={}){
  const src=ctx.createBufferSource();src.buffer=noiseBuffer;
  const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=freq;filter.Q.value=options.q||.65;
  const soft=ctx.createBiquadFilter();soft.type='lowpass';soft.frequency.value=options.ceiling||11000;soft.Q.value=.5;
  return voice(src,[filter,soft],at,duration,level,options);
}
function clap(at,electronic,p=kitProfiles[kit]){
 const natural=soundMode==='acoustic',width=(natural?.008:electronic?.012:.01)/p.pitch;
 [0,width,width*2].forEach((offset,i)=>noise(at+offset,i===2?(natural?.15:.19):.016,i===2?.36:.23,p.snare*(natural?10:8),'bandpass',{pan:i===0?-.18:i===1?.18:0,ceiling:p.bright,attack:.0008}));
}
function sampledDrum(r,at,p){
 if(r===5){clap(at,false,p);return}
 const name=({0:'kick',1:'snare',2:'hihat',3:'hihat',4:'tom2',6:'tom1',7:'tom3'})[r];
 const asset=decodedSamples[p.sample+'-'+name];if(!asset)throw Error('Amostra de bateria não carregada');
 if(r===2)chokeHats(at);
 const source=ctx.createBufferSource();source.buffer=asset.buffer;
 const rate=p.pitch*(r===3?.88:1);source.playbackRate.value=rate;
 const duration=r===2?Math.min(.09,.075*p.decay):asset.buffer.duration/rate*Math.min(1,p.decay);
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=Math.min(15000,r===0?p.bright*.72:p.bright);filter.Q.value=.5;
 const level=({0:.9,1:.73,2:.29,3:.27,4:.72,6:.7,7:.75})[r]*asset.level*(kit==='jazz'?.8:1);
 const handle=voice(source,filter,at,duration,level,{pan:({0:0,1:-.06,2:.2,3:.2,4:-.1,6:-.3,7:.3})[r],lane:r,attack:.0005});
 const actualLevel=handle.level;
 handle.gain.gain.cancelScheduledValues(at);handle.gain.gain.setValueAtTime(0,at);handle.gain.gain.linearRampToValueAtTime(actualLevel,at+.0005);
 handle.gain.gain.setValueAtTime(actualLevel,at+Math.max(.001,duration-.016));handle.gain.gain.linearRampToValueAtTime(0,at+duration);
 handle.sampled=true;
 const release=handle.stop.bind(handle);
 handle.stop=(time=ctx.currentTime,fade=.012)=>{
  if(time<=at||time>=handle.end){release(time,fade);return}
  handle.gain.gain.cancelScheduledValues(time);handle.gain.gain.setValueAtTime(actualLevel,time);
  handle.gain.gain.linearRampToValueAtTime(0,time+fade);source.stop(time+fade+.002);handle.end=time+fade;
 };
 if(r===3)openHats.set(kit,handle);
 if(r===0&&p.electronic)tone(at,p.body*1.7,p.body,p.kickDecay,.22,'sine',{sweep:.04});
}
function percussionDrum(r,at,p){
 const natural=soundMode==='acoustic';
 if(r===0){tone(at,p.body*1.75,p.body,p.kickDecay,natural?.74:.84,natural?'sine':'triangle',{sweep:.025,lowpass:natural?5500:1800});if(natural){tone(at,p.body*2.8,p.body*2.2,.14,.18);noise(at,.018,.19,1100,'bandpass',{ceiling:3800})}}
 if(r===1){tone(at,p.snare,p.snare*.8,p.snareDecay,.36,natural?'triangle':'sine',{sweep:.009,lowpass:4500});if(natural)tone(at,p.snare*2.36,p.snare*2.17,.027,.15);noise(at,.022,natural?.27:.12,p.snare*6,'bandpass',{ceiling:6500});}
 if(r===2||r===3){
  if(r===2)chokeHats(at);
  const duration=r===2?.055:natural?1.1:.34;
  const modes=natural?[1,1.513,2.12,2.785]:[1,2.04];
  modes.forEach((ratio,i)=>{
   const handle=tone(at,p.hat*ratio,p.hat*ratio,duration/(1+i*.35),.12/(1+i*.5),natural?'sine':'triangle',{pan:.2,attack:.0005,lane:r,lowpass:natural?15000:9800});
   if(r===3&&i===0)openHats.set(kit,handle);
  });
  noise(at,.008,.045,6500,'highpass',{ceiling:10500});
 }
 if(r===4){
  (natural?[790,1235,1861,2540]:[870,1740]).forEach((frequency,i)=>tone(at,frequency*p.pitch,frequency*p.pitch,(natural?.26:.14)/(1+i*.4),.25/(1+i),natural?'sine':'triangle',{pan:-.2,attack:.0008,lowpass:natural?12000:6000}));
  if(natural)noise(at,.009,.1,2900);
 }
 if(r===5)clap(at,!natural,p);
}
async function changeKit(){
 const next=$('kit').value,token=++kitChangeGeneration;
 try{if(ctx)await ensureKitSamples(next);if(token!==kitChangeGeneration)return;if(next!==kit)previousKit=kit;releaseKitVoices();kit=next;replayQueuedNotes();buildGrid();render();save();if(!playing)previewKit()}
 catch(error){$('kit').value=kit;audioError(error)}
}

function highlight(s){const beats=presets[selected].meter||4;$('beat-count').textContent=s<0?'— / '+beats:String(Math.floor(s/4)%beats+1)+' / '+beats;numbers.forEach((n,i)=>n.classList.toggle('current',i===s));cells.forEach(row=>row.forEach((b,i)=>b.classList.toggle('current',i===s)))}
let pendingAction=null,activeAction=null,finishing=false;
const actionNames={fill1:'Virada 1',fill2:'Virada 2',ending:'Término'};
function syncPerformance(){
 document.querySelectorAll('[data-action]').forEach(button=>{
  const action=button.dataset.action;
  const active=activeAction?.type===action,queued=pendingAction===action;
  button.disabled=!playing||finishing||activeAction?.type==='ending'||(pendingAction==='ending'&&action!=='ending');
  button.setAttribute('aria-pressed',String(active||queued));button.dataset.state=active?'active':queued?'queued':'';
 });
}
function resetPerformance(){pendingAction=null;activeAction=null;finishing=false;syncPerformance();$('performance-status').textContent='Toque o ritmo para usar as viradas e o término.'}
function queueAction(type){
 if(!playing||finishing||activeAction?.type==='ending'||!Object.hasOwn(actionNames,type))return;
 if(pendingAction==='ending'&&type!=='ending')return;
 if(pendingAction===type){pendingAction=null;$('performance-status').textContent='Agendamento cancelado.'}
 else{pendingAction=type;$('performance-status').textContent=actionNames[type]+' agendado para o próximo compasso.'}
 syncPerformance();
}
function atTime(at,callback){
 const token=epoch,t=setTimeout(()=>{pending.delete(t);if(playing&&epoch===token)callback()},Math.max(0,(at-ctx.currentTime)*1000));pending.add(t);
}
function performanceNotes(position,at){
 const barSteps=(presets[selected].meter||4)*4;
 if(activeAction?.type==='ending'&&activeAction.phase===barSteps){
  queueSound(0,at,1);queueSound(9,at,.85);queueSound(7,at,.65);
  finishing=true;syncPerformance();$('status').textContent='Encerrando…';$('performance-status').textContent='Acorde final. Deixando os sons terminarem.';
  atTime(at,()=>highlight(0));
  atTime(at+3.5,()=>{stop();$('status').textContent='Música encerrada';$('performance-status').textContent='Final concluído. Clique em Tocar para recomeçar.'});
  return false;
 }
 if(!activeAction&&pendingAction&&position%barSteps===0){
  activeAction={type:pendingAction,phase:0};pendingAction=null;
  $('performance-status').textContent=actionNames[activeAction.type]+' em execução.';syncPerformance();
 }
 let notes=pattern.map(row=>row[position]),noteVelocities=velocities.map(row=>row[position]||.75),isFill=false;
 if(activeAction){
  const {type,phase}=activeAction;
  const length=type==='fill1'?4:Math.min(8,barSteps),start=barSteps-length;
  if(phase>=start){
   const sequence=type==='fill1'?[1,1,6,4]:type==='fill2'?[1,1,6,6,4,4,7,7]:[1,6,null,4,1,null,7,7];
   const index=phase-start,lane=sequence[index];notes=Array(TRACK_COUNT).fill(false);isFill=true;noteVelocities=Array(TRACK_COUNT).fill(index%2===0?.95:.6);
   if(lane!==null)notes[lane]=true;
   if(index===0||index===4)notes[0]=true;
   if(type==='fill1'&&index%2===0)notes[2]=true;
  }
  activeAction.phase++;
  if(activeAction.phase===barSteps&&type!=='ending'){
   activeAction=null;syncPerformance();
   atTime(at+60/Math.min(240,Math.max(40,Number($('tempo').value)||110))/4,()=>{if(!activeAction&&!pendingAction)$('performance-status').textContent='Virada concluída. Ritmo retomado.'});
  }
 }
 notes.forEach((on,r)=>{if(on)queueSound(r,at,noteVelocities[r],isFill?'normal':presets[selected].articulations?.[r]||'normal')});return true;
}
function schedule(){
 if(!playing||finishing)return;
 if(nextTime<ctx.currentTime-.15)nextTime=ctx.currentTime;
 while(nextTime<ctx.currentTime+.09){
  const s=step;if(s%4===0&&$('beat-click').checked)tone(nextTime,s%((presets[selected].meter||4)*4)===0?1200:850,850,.03,.16,'sine',{sweep:.015});if(!performanceNotes(s,nextTime))return;
  atTime(nextTime,()=>highlight(s));
  nextTime+=60/Math.min(240,Math.max(40,Number($('tempo').value)||110))/4;step=(step+1)%stepCount;
 }
}

function stop(){queuedNotes=[];stopPreview();$('preview-kit').disabled=false;$('compare-kit').disabled=!previousKit;playing=false;epoch++;clearInterval(timer);pending.forEach(clearTimeout);pending.clear();voices.forEach(v=>{try{v.stop()}catch{}});resetPerformance();highlight(-1);$('play').textContent='▶︎ Tocar';$('play').setAttribute('aria-pressed','false');document.querySelector('.transport').classList.remove('is-playing');$('status').textContent='Parado'}
function audioError(error){$('status').textContent=error?.message||'Não foi possível iniciar o áudio. Abra a biblioteca para conferir os sons.'}
async function toggle(){
  if(starting)return;if(playing){stop();return}starting=true;
  try{await initAudio();stopPreview();$('preview-kit').disabled=true;$('compare-kit').disabled=true;playing=true;step=0;nextTime=ctx.currentTime+.05;$('play').textContent='■ Parar';$('play').setAttribute('aria-pressed','true');document.querySelector('.transport').classList.add('is-playing');$('status').textContent='Tocando';syncPerformance();schedule();timer=setInterval(schedule,25)}catch(error){stop();audioError(error)}finally{starting=false}
}
function initializeApp(){
setupKits();setupMenus();setupLibrary();if(!restore())loadPreset('pop');syncPerformance();
document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>queueAction(button.dataset.action));
$('play').onclick=toggle;
$('preview-kit').onclick=()=>previewKit();
$('compare-kit').onclick=()=>{if(previousKit){stopPreview();previewKit(previousKit)}};
$('recommended-kit').onclick=()=>{$('kit').value=presets[selected].recommendedKit;changeKit()};
$('beat-click').onchange=save;
$('effect').onchange=()=>{effectId=$('effect').value;applyEffect();save()};
$('rhythms').onchange=()=>{if(Object.hasOwn(presets,$('rhythms').value))loadPreset($('rhythms').value);else{render();save()}};
$('kit').onchange=changeKit;
$('clear').onclick=()=>{if(pattern.flat().some(Boolean))undoPattern={pattern:pattern.map(row=>[...row]),velocities:velocities.map(row=>[...row]),rhythm:$('rhythms').value};pattern=kitLabels[kit].map(()=>Array(stepCount).fill(false));velocities=Array.from({length:TRACK_COUNT},()=>Array(stepCount).fill(0));$('rhythms').value='custom';render();save()};
$('undo').onclick=()=>{if(!undoPattern)return;pattern=undoPattern.pattern;velocities=undoPattern.velocities;$('rhythms').value=undoPattern.rhythm;undoPattern=null;render();save()};
$('reset').onclick=()=>loadPreset(selected);
$('tempo').onchange=()=>{$('tempo').value=Math.min(240,Math.max(40,Number($('tempo').value)||110));renderRhythmTiming();applyEffect();save()};
$('volume').oninput=()=>{if(master)master.gain.setTargetAtTime(Number($('volume').value)/100*.75,ctx.currentTime,.015);$('volume-value').textContent=$('volume').value+'%';save()};
for(const [id,delta] of [['tempo-down',-5],['tempo-up',5]])$(id).onclick=()=>{$('tempo').value=Math.min(240,Math.max(40,(Number($('tempo').value)||110)+delta));$('tempo').dispatchEvent(new Event('change'))};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY'].includes(document.activeElement.tagName)){e.preventDefault();toggle()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)stop()});
window.addEventListener('pagehide',stop);


// Native HTML dialogs keep the main sequencer compact; sound and rhythm state
// are shared with the existing selectors, so opening a picker never resets them.
function openPicker(id){
  const dialog=$(id);if(!dialog.open)dialog.showModal();
  if(id==='rhythm-picker')$('rhythm-search').focus();
  else dialog.querySelector('[data-kit="'+kit+'"]')?.focus();
}
$('browse-rhythms').onclick=()=>openPicker('rhythm-picker');
$('browse-kits').onclick=()=>openPicker('kit-picker');
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
for(const id of ['rhythm-picker','kit-picker'])$(id).addEventListener('click',event=>{
  const rect=$(id).getBoundingClientRect();
  if(event.target===$(id)&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))$(id).close();
});


}