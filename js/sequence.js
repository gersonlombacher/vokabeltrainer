
let sequenceN=2;
let sequenceRecognition=null;
let sequencePracticeIndex=3;
let previewTimer=null;
let selectedVoice=null;

function seqVals(n){ return Array.from({length:10},(_,i)=>n*(i+1)); }

function pickNaturalGermanVoice(){
  if(!("speechSynthesis" in window)) return null;
  const voices=speechSynthesis.getVoices()||[];
  const preferred=[
    /Anna/i,/Helena/i,/Petra/i,/Marlene/i,/Vicki/i,/Katja/i,/Sandy/i,/Amelie/i,/female/i
  ];
  for(const p of preferred){
    const v=voices.find(v=>/^de(-|_)/i.test(v.lang||"") && p.test(v.name||""));
    if(v) return v;
  }
  return voices.find(v=>/^de(-|_)/i.test(v.lang||"") && /enhanced|premium|natural/i.test(v.name||""))
      || voices.find(v=>/^de(-|_)/i.test(v.lang||""))
      || null;
}
function refreshVoice(){ selectedVoice=pickNaturalGermanVoice(); }
if("speechSynthesis" in window){
  refreshVoice();
  speechSynthesis.onvoiceschanged=refreshVoice;
}

function startSequence(){
  sequenceN=Number(document.querySelector("#sequence-select").value)||2;
  showView("sequence");
  renderSequence();
}

function clearPreviewTimer(){
  if(previewTimer){ clearTimeout(previewTimer); previewTimer=null; }
}

function revealSequence(){
  clearPreviewTimer();
  document.querySelectorAll(".sequence-step,.sequence-hop").forEach(el=>el.classList.remove("preview-hidden"));
  const note=document.querySelector("#sequence-preview-note");
  if(note) note.textContent="👀 Schau dir die Reihe kurz an. Danach wird sie ausgeblendet.";
}

function hideSequenceAfter(seconds=7){
  clearPreviewTimer();
  revealSequence();
  const note=document.querySelector("#sequence-preview-note");
  let remaining=seconds;
  if(note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;
  const tick=setInterval(()=>{
    remaining--;
    if(note && remaining>0) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;
    if(remaining<=0) clearInterval(tick);
  },1000);
  previewTimer=setTimeout(()=>{
    document.querySelectorAll(".sequence-step,.sequence-hop").forEach(el=>el.classList.add("preview-hidden"));
    if(note) note.textContent="🙈 Jetzt ohne Ablesen.";
  },seconds*1000);
}

function renderSequence(){
  const vals=seqVals(sequenceN);
  document.querySelector("#sequence-title").textContent=`${sequenceN}er-Reihe`;
  const steps=document.querySelector("#sequence-steps"); steps.innerHTML="";
  vals.forEach((v,i)=>{
    const d=document.createElement("div");
    d.className="sequence-step"; d.dataset.i=i;
    d.innerHTML=`<small>${i+1}×${sequenceN}</small><br>${v}`;
    steps.appendChild(d);
  });
  const line=document.querySelector("#sequence-numberline"); line.innerHTML="";
  vals.forEach(v=>{
    const d=document.createElement("div");
    d.className="sequence-hop";
    d.innerHTML=`<small>+${sequenceN}</small><strong>${v}</strong>`;
    line.appendChild(d);
  });
  document.querySelector("#sequence-feedback").textContent="";
  document.querySelector("#sequence-speech-box").classList.add("hidden");
  document.querySelector("#sequence-practice-box").classList.add("hidden");
  revealSequence();
}

function speakOne(text, onend){
  if(!("speechSynthesis" in window)){ onend?.(); return; }
  const u=new SpeechSynthesisUtterance(String(text));
  u.lang="de-DE";
  u.rate=.78;
  u.pitch=1.0;
  if(selectedVoice) u.voice=selectedVoice;
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
  revealSequence();
  let i=0;
  const next=()=>{
    if(i>=vals.length){
      hideSequenceAfter(7);
      return;
    }
    document.querySelectorAll(".sequence-step").forEach(x=>x.classList.remove("active"));
    document.querySelector(`.sequence-step[data-i="${i}"]`)?.classList.add("active");
    speakOne(vals[i],()=>{i++;setTimeout(next,160)});
  };
  next();
}

function parseGermanNumbers(text){
  const normalized=String(text||"").toLowerCase()
    .replace(/\bsex\b/g,"sechs")
    .replace(/\bsix\b/g,"sechs")
    .replace(/[.,;:!?]/g," ");
  const dict={
    null:0,eins:1,ein:1,eine:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9,
    zehn:10,elf:11,"zwölf":12,zwoelf:12,dreizehn:13,vierzehn:14,"fünfzehn":15,funfzehn:15,sechzehn:16,siebzehn:17,achtzehn:18,neunzehn:19,
    zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90
  };
  const ones={eins:1,ein:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9};
  const tens={zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90};
  const out=[];
  for(const w of normalized.split(/\s+/).filter(Boolean)){
    if(/^\d+$/.test(w)){out.push(Number(w));continue;}
    if(dict[w]!==undefined){out.push(dict[w]);continue;}
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
  document.querySelectorAll(".sequence-step").forEach((el,i)=>{
    el.classList.remove("sequence-success","sequence-error");
    if(nums[i]===exp[i])el.classList.add("sequence-success");
    else if(i<nums.length)el.classList.add("sequence-error");
  });
  let wrong=-1;
  for(let i=0;i<exp.length;i++){ if(nums[i]!==exp[i]){wrong=i;break;} }
  if(wrong===-1 && nums.length>=exp.length){
    document.querySelector("#sequence-feedback").textContent=`🎉 Super! Die ${sequenceN}er-Reihe war vollständig richtig.`;
    const p=profile(); if(p){p.xp=(p.xp||0)+20;p.today=(p.today||0)+1;saveDB();renderHome();burst(p.theme==="cats"?"🐾":"⚽");}
  }else{
    const idx=wrong===-1?nums.length:wrong;
    const prev=idx>0?exp[idx-1]:null;
    const target=exp[idx];
    document.querySelector("#sequence-feedback").textContent=prev!==null
      ? `Fast. Nach ${prev} kommt ${target}.`
      : `Die ${sequenceN}er-Reihe beginnt mit ${target}.`;
  }
}

function startSpeechRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  document.querySelector("#sequence-speech-box").classList.remove("hidden");
  hideSequenceAfter(7);
  if(!SR){
    document.querySelector("#speech-status-text").textContent="Spracherkennung ist in diesem Browser nicht verfügbar.";
    document.querySelector("#speech-live").textContent="Vorlesen und Lückenübungen funktionieren trotzdem.";
    return;
  }
  if(sequenceRecognition){try{sequenceRecognition.stop()}catch{}}
  sequenceRecognition=new SR();
  sequenceRecognition.lang="de-DE";
  sequenceRecognition.continuous=false;
  sequenceRecognition.interimResults=true;
  let finalText="";
  sequenceRecognition.onstart=()=>{
    document.querySelector("#speech-status-text").textContent=`Schau noch kurz – danach sage die ${sequenceN}er-Reihe ohne Ablesen.`;
    document.querySelector("#speech-live").textContent="Ich höre zu …";
  };
  sequenceRecognition.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal)finalText+=" "+t; else interim+=t;
    }
    const liveNums=parseGermanNumbers((finalText+" "+interim).trim());
    document.querySelector("#speech-live").textContent=liveNums.length ? liveNums.join(" · ") : "Ich höre zu …";
  };
  sequenceRecognition.onerror=e=>{
    document.querySelector("#speech-status-text").textContent="Ich konnte nicht zuverlässig zuhören.";
    if(e.error==="not-allowed")document.querySelector("#speech-live").textContent="Bitte Mikrofonzugriff erlauben.";
  };
  sequenceRecognition.onend=()=>{
    const nums=parseGermanNumbers(finalText);
    if(nums.length)compareSequence(nums);
    else if(finalText.trim())document.querySelector("#sequence-feedback").textContent="Bitte etwas langsamer und mit kleinen Pausen sprechen.";
  };
  try{sequenceRecognition.start()}catch{}
}

function stopSpeech(){ if(sequenceRecognition){try{sequenceRecognition.stop()}catch{} sequenceRecognition=null;} }

function openPractice(){
  stopSpeech();
  revealSequence();
  document.querySelector("#sequence-practice-box").classList.remove("hidden");
  const vals=seqVals(sequenceN);
  sequencePracticeIndex=Math.floor(Math.random()*8)+1;
  // Show full row for 7 sec, then hide all except a few anchors and the gap.
  document.querySelector("#practice-line").textContent=vals.join("  ·  ");
  document.querySelector("#practice-input").value="";
  document.querySelector("#sequence-feedback").textContent="Schau dir die Reihe kurz an.";
  setTimeout(()=>{
    const masked=vals.map((v,i)=>{
      if(i===sequencePracticeIndex)return "?";
      // hide most values, keep every third as anchor
      return (i%3===0) ? String(v) : "•";
    });
    document.querySelector("#practice-line").textContent=masked.join("  ·  ");
    document.querySelector("#sequence-feedback").textContent="Jetzt ohne Abschreiben.";
    document.querySelector("#practice-input").focus();
  },7000);
}

function checkPractice(){
  const expected=seqVals(sequenceN)[sequencePracticeIndex];
  const v=Number(document.querySelector("#practice-input").value);
  if(v===expected){
    document.querySelector("#sequence-feedback").textContent="✅ Richtig!";
    setTimeout(openPractice,700);
  }else{
    document.querySelector("#sequence-feedback").textContent=`Noch nicht. Richtig ist ${expected}.`;
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
