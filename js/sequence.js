
let sequenceN=2;
let sequenceRecognition=null;
let sequencePracticeIndex=0;
let sequencePreviewTimeout=null;
let sequenceCountdownInterval=null;
let selectedVoice=null;

function seqVals(n){ return Array.from({length:10},(_,i)=>n*(i+1)); }

function pickNaturalGermanVoice(){
  if(!("speechSynthesis" in window)) return null;
  const voices=speechSynthesis.getVoices()||[];
  const preferred=/Anna|Helena|Petra|Marlene|Vicki|Katja|Sandy|Amelie|female|natural|premium|enhanced/i;
  return voices.find(v=>/^de(-|_)/i.test(v.lang||"") && preferred.test(v.name||""))
      || voices.find(v=>/^de(-|_)/i.test(v.lang||""))
      || null;
}
function refreshVoice(){ selectedVoice=pickNaturalGermanVoice(); }
if("speechSynthesis" in window){
  refreshVoice();
  speechSynthesis.onvoiceschanged=refreshVoice;
}

function clearPreviewTimers(){
  if(sequencePreviewTimeout) clearTimeout(sequencePreviewTimeout);
  if(sequenceCountdownInterval) clearInterval(sequenceCountdownInterval);
  sequencePreviewTimeout=null;
  sequenceCountdownInterval=null;
}

function showReferences(){
  document.querySelector("#sequence-steps")?.classList.remove("hidden");
  document.querySelector("#sequence-numberline")?.classList.remove("hidden");
  document.querySelector("#sequence-preview-note")?.classList.remove("hidden");
}
function hideReferences(){
  document.querySelector("#sequence-steps")?.classList.add("hidden");
  document.querySelector("#sequence-numberline")?.classList.add("hidden");
  document.querySelector("#sequence-preview-note")?.classList.add("hidden");
}

function previewThenHide(seconds=7, after=null){
  clearPreviewTimers();
  showReferences();

  const note=document.querySelector("#sequence-preview-note");
  let remaining=seconds;
  if(note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;

  sequenceCountdownInterval=setInterval(()=>{
    remaining--;
    if(remaining>0){
      if(note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;
    }else{
      clearInterval(sequenceCountdownInterval);
      sequenceCountdownInterval=null;
    }
  },1000);

  sequencePreviewTimeout=setTimeout(()=>{
    clearPreviewTimers();
    hideReferences();
    if(after) after();
  },seconds*1000);
}

function startSequence(){
  sequenceN=Number(document.querySelector("#sequence-select").value)||2;
  showView("sequence");
  renderSequence();
}

function renderSequence(){
  clearPreviewTimers();
  const vals=seqVals(sequenceN);
  document.querySelector("#sequence-title").textContent=`${sequenceN}er-Reihe`;
  const steps=document.querySelector("#sequence-steps");
  const line=document.querySelector("#sequence-numberline");
  steps.innerHTML="";
  line.innerHTML="";

  vals.forEach((v,i)=>{
    const d=document.createElement("div");
    d.className="sequence-step";
    d.dataset.i=i;
    d.innerHTML=`<small>${i+1}×${sequenceN}</small><br>${v}`;
    steps.appendChild(d);
  });
  vals.forEach(v=>{
    const d=document.createElement("div");
    d.className="sequence-hop";
    d.innerHTML=`<small>+${sequenceN}</small><strong>${v}</strong>`;
    line.appendChild(d);
  });

  document.querySelector("#sequence-speech-box").classList.add("hidden");
  document.querySelector("#sequence-practice-box").classList.add("hidden");
  document.querySelector("#sequence-feedback").textContent="";
  showReferences();
  const note=document.querySelector("#sequence-preview-note");
  if(note) note.textContent="👀 Schau dir die Reihe an.";
}

function speakOne(text,onend){
  if(!("speechSynthesis" in window)){ onend?.(); return; }
  const u=new SpeechSynthesisUtterance(String(text));
  u.lang="de-DE";
  u.rate=.78;
  u.pitch=1.0;
  if(selectedVoice)u.voice=selectedVoice;
  u.onend=()=>onend?.();
  speechSynthesis.speak(u);
}

function speakSequence(){
  const vals=seqVals(sequenceN);
  if(!("speechSynthesis" in window)){
    document.querySelector("#sequence-feedback").textContent="Sprachausgabe wird auf diesem Gerät nicht unterstützt.";
    return;
  }
  speechSynthesis.cancel();
  showReferences();
  let i=0;
  const next=()=>{
    if(i>=vals.length){
      previewThenHide(7);
      return;
    }
    document.querySelectorAll(".sequence-step").forEach(x=>x.classList.remove("active"));
    document.querySelector(`.sequence-step[data-i="${i}"]`)?.classList.add("active");
    speakOne(vals[i],()=>{i++;setTimeout(next,150);});
  };
  next();
}

function parseGermanNumbers(text){
  const normalized=String(text||"").toLowerCase()
    .replace(/\bsex\b/g,"sechs")
    .replace(/\bsix\b/g,"sechs")
    .replace(/[.,;:!?]/g," ");
  const simple={
    null:0,eins:1,ein:1,eine:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9,
    zehn:10,elf:11,"zwölf":12,zwoelf:12,dreizehn:13,vierzehn:14,"fünfzehn":15,funfzehn:15,sechzehn:16,siebzehn:17,
    achtzehn:18,neunzehn:19,zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,
    siebzig:70,achtzig:80,neunzig:90
  };
  const ones={eins:1,ein:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9};
  const tens={zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90};
  const out=[];
  for(const w of normalized.split(/\s+/).filter(Boolean)){
    if(/^\d+$/.test(w)){out.push(Number(w));continue;}
    if(simple[w]!==undefined){out.push(simple[w]);continue;}
    let found=null;
    for(const [ow,ov] of Object.entries(ones)){
      for(const [tw,tv] of Object.entries(tens)){
        if(w===ow+"und"+tw){found=ov+tv;break;}
      }
      if(found!==null)break;
    }
    if(found!==null)out.push(found);
  }
  return out;
}

function compareSequence(nums){
  const exp=seqVals(sequenceN);
  let wrong=-1;
  for(let i=0;i<exp.length;i++){
    if(nums[i]!==exp[i]){wrong=i;break;}
  }
  if(wrong===-1 && nums.length>=exp.length){
    document.querySelector("#sequence-feedback").textContent=`🎉 Super! Die ${sequenceN}er-Reihe war vollständig richtig.`;
  }else{
    const idx=wrong===-1?nums.length:wrong;
    const prev=idx>0?exp[idx-1]:null;
    const target=exp[idx];
    document.querySelector("#sequence-feedback").textContent=prev!==null?`Fast. Nach ${prev} kommt ${target}.`:`Die Reihe beginnt mit ${target}.`;
  }
}

function beginRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    document.querySelector("#speech-status-text").textContent="Spracherkennung ist in diesem Browser nicht verfügbar.";
    return;
  }
  if(sequenceRecognition){try{sequenceRecognition.stop()}catch{}}
  sequenceRecognition=new SR();
  sequenceRecognition.lang="de-DE";
  sequenceRecognition.continuous=false;
  sequenceRecognition.interimResults=true;
  let finalText="";

  sequenceRecognition.onstart=()=>{
    document.querySelector("#speech-status-text").textContent=`Jetzt die ${sequenceN}er-Reihe ohne Ablesen aufsagen.`;
    document.querySelector("#speech-live").textContent="Ich höre zu …";
  };
  sequenceRecognition.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal)finalText+=" "+t; else interim+=t;
    }
    const nums=parseGermanNumbers((finalText+" "+interim).trim());
    document.querySelector("#speech-live").textContent=nums.length?nums.join(" · "):"Ich höre zu …";
  };
  sequenceRecognition.onend=()=>{
    const nums=parseGermanNumbers(finalText);
    if(nums.length)compareSequence(nums);
  };
  try{sequenceRecognition.start()}catch{}
}

function startSpeechRecognition(){
  document.querySelector("#sequence-speech-box").classList.remove("hidden");
  document.querySelector("#speech-status-text").textContent="Schau dir die Reihe noch kurz an.";
  previewThenHide(7,beginRecognition);
}

function stopSpeech(){
  if(sequenceRecognition){try{sequenceRecognition.stop()}catch{}}
  sequenceRecognition=null;
}

function openPractice(){
  stopSpeech();
  document.querySelector("#sequence-practice-box").classList.remove("hidden");
  const vals=seqVals(sequenceN);
  sequencePracticeIndex=Math.floor(Math.random()*8)+1;

  document.querySelector("#practice-line").textContent=vals.join(" · ");
  document.querySelector("#practice-input").value="";
  document.querySelector("#sequence-feedback").textContent="Schau dir die Reihe kurz an.";

  previewThenHide(7,()=>{
    const masked=vals.map((v,i)=>{
      if(i===sequencePracticeIndex)return "?";
      return i%3===0?String(v):"•";
    });
    document.querySelector("#practice-line").textContent=masked.join(" · ");
    document.querySelector("#sequence-feedback").textContent="Jetzt ohne Abschreiben.";
    document.querySelector("#practice-input").focus();
  });
}

function checkPractice(){
  const expected=seqVals(sequenceN)[sequencePracticeIndex];
  const v=Number(document.querySelector("#practice-input").value);
  if(v===expected){
    document.querySelector("#sequence-feedback").textContent="✅ Richtig!";
    setTimeout(openPractice,700);
  }else{
    document.querySelector("#sequence-feedback").textContent="Noch nicht. Versuch es noch einmal.";
    document.querySelector("#practice-input").select();
  }
}

document.querySelector("#sequence-start").addEventListener("click",startSequence);
document.querySelector("#sequence-play").addEventListener("click",speakSequence);
document.querySelector("#sequence-practice").addEventListener("click",openPractice);
document.querySelector("#sequence-speak").addEventListener("click",startSpeechRecognition);
document.querySelector("#speech-stop").addEventListener("click",stopSpeech);
document.querySelector("#speech-retry").addEventListener("click",startSpeechRecognition);
document.querySelector("#practice-check").addEventListener("click",checkPractice);
document.querySelector("#practice-input").addEventListener("keydown",e=>{if(e.key==="Enter")checkPractice();});
