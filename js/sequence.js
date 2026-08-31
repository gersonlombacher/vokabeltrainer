
let sequenceN=2;
let sequenceRecognition=null;
let sequencePracticeIndex=0;
let sequencePreviewTimer=null;
let selectedVoice=null;

function seqVals(n){
  return Array.from({length:10},(_,i)=>n*(i+1));
}

function pickNaturalGermanVoice(){
  if(!("speechSynthesis" in window)) return null;
  const voices=speechSynthesis.getVoices()||[];
  const femaleNames=/Anna|Helena|Petra|Marlene|Vicki|Katja|Sandy|Amelie|female|natural|premium|enhanced/i;
  return voices.find(v=>/^de(-|_)/i.test(v.lang||"") && femaleNames.test(v.name||""))
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

function clearSequencePreview(){
  if(sequencePreviewTimer){
    clearTimeout(sequencePreviewTimer);
    sequencePreviewTimer=null;
  }
}

function renderSequence(){
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
  steps.classList.remove("hidden");
  line.classList.remove("hidden");
  document.querySelector("#sequence-preview-note")?.classList.remove("hidden");
}

function hideReferenceRows(){
  document.querySelector("#sequence-steps")?.classList.add("hidden");
  document.querySelector("#sequence-numberline")?.classList.add("hidden");
  document.querySelector("#sequence-preview-note")?.classList.add("hidden");
}

function showReferenceRowsFor(ms=7000, after=null){
  clearSequencePreview();
  const steps=document.querySelector("#sequence-steps");
  const line=document.querySelector("#sequence-numberline");
  const note=document.querySelector("#sequence-preview-note");

  steps?.classList.remove("hidden");
  line?.classList.remove("hidden");
  note?.classList.remove("hidden");
  if(note) note.textContent="👀 Schau dir die Reihe kurz an. Danach verschwindet sie.";

  sequencePreviewTimer=setTimeout(()=>{
    hideReferenceRows();
    if(after) after();
  },ms);
}

function speakOne(text,onend){
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
  document.querySelector("#sequence-steps")?.classList.remove("hidden");
  document.querySelector("#sequence-numberline")?.classList.remove("hidden");

  let i=0;
  function next(){
    if(i>=vals.length){
      showReferenceRowsFor(7000);
      return;
    }
    document.querySelectorAll(".sequence-step").forEach(x=>x.classList.remove("active"));
    document.querySelector(`.sequence-step[data-i="${i}"]`)?.classList.add("active");
    speakOne(vals[i],()=>{ i++; setTimeout(next,150); });
  }
  next();
}

function parseGermanNumbers(text){
  let s=String(text||"").toLowerCase()
    .replace(/\bsex\b/g,"sechs")
    .replace(/\bsix\b/g,"sechs")
    .replace(/[.,;:!?]/g," ");

  const simple={
    null:0,eins:1,ein:1,eine:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9,
    zehn:10,elf:11,"zwölf":12,zwoelf:12,dreizehn:13,vierzehn:14,"fünfzehn":15,funfzehn:15,sechzehn:16,siebzehn:17,
    achtzehn:18,neunzehn:19,zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,
    sechzig:60,siebzig:70,achtzig:80,neunzig:90,hundert:100
  };
  const ones={eins:1,ein:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9};
  const tens={zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90};

  const out=[];
  for(const w of s.split(/\s+/).filter(Boolean)){
    if(/^\d+$/.test(w)){ out.push(Number(w)); continue; }
    if(simple[w]!==undefined){ out.push(simple[w]); continue; }

    let found=null;
    for(const [ow,ov] of Object.entries(ones)){
      for(const [tw,tv] of Object.entries(tens)){
        if(w===ow+"und"+tw){ found=ov+tv; break; }
      }
      if(found!==null) break;
    }
    if(found!==null) out.push(found);
  }
  return out;
}

function compareSequence(nums){
  const exp=seqVals(sequenceN);
  let wrong=-1;
  for(let i=0;i<exp.length;i++){
    if(nums[i]!==exp[i]){ wrong=i; break; }
  }

  if(wrong===-1 && nums.length>=exp.length){
    document.querySelector("#sequence-feedback").textContent=`🎉 Super! Die ${sequenceN}er-Reihe war vollständig richtig.`;
    const p=profile();
    if(p){
      p.xp=(p.xp||0)+20;
      p.today=(p.today||0)+1;
      saveDB();
      renderHome();
      burst(p.theme==="cats"?"🐾":"⚽");
    }
  }else{
    const idx=wrong===-1?nums.length:wrong;
    const prev=idx>0?exp[idx-1]:null;
    const target=exp[idx];
    document.querySelector("#sequence-feedback").textContent=
      prev!==null ? `Fast. Nach ${prev} kommt ${target}.` : `Die ${sequenceN}er-Reihe beginnt mit ${target}.`;
  }
}

function startSpeechRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  document.querySelector("#sequence-speech-box").classList.remove("hidden");

  showReferenceRowsFor(7000, ()=>{
    if(!SR){
      document.querySelector("#speech-status-text").textContent="Spracherkennung ist in diesem Browser nicht verfügbar.";
      document.querySelector("#speech-live").textContent="Vorlesen und Lückenübungen funktionieren trotzdem.";
      return;
    }

    if(sequenceRecognition){ try{sequenceRecognition.stop()}catch{} }
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
        if(e.results[i].isFinal) finalText+=" "+t;
        else interim+=t;
      }
      const nums=parseGermanNumbers((finalText+" "+interim).trim());
      document.querySelector("#speech-live").textContent=nums.length ? nums.join(" · ") : "Ich höre zu …";
    };
    sequenceRecognition.onerror=e=>{
      document.querySelector("#speech-status-text").textContent="Ich konnte nicht zuverlässig zuhören.";
      if(e.error==="not-allowed") document.querySelector("#speech-live").textContent="Bitte Mikrofonzugriff erlauben.";
    };
    sequenceRecognition.onend=()=>{
      const nums=parseGermanNumbers(finalText);
      if(nums.length) compareSequence(nums);
    };
    try{ sequenceRecognition.start(); }catch{}
  });
}

function stopSpeech(){
  if(sequenceRecognition){
    try{sequenceRecognition.stop()}catch{}
    sequenceRecognition=null;
  }
}

function openPractice(){
  stopSpeech();
  document.querySelector("#sequence-practice-box").classList.remove("hidden");
  document.querySelector("#sequence-feedback").textContent="Schau dir die Reihe 7 Sekunden an.";

  const vals=seqVals(sequenceN);
  sequencePracticeIndex=Math.floor(Math.random()*10);

  // VERY IMPORTANT:
  // show the row only briefly, then remove ALL reference rows before the gap appears.
  document.querySelector("#practice-line").textContent=vals.join("  ·  ");
  document.querySelector("#practice-input").value="";
  showReferenceRowsFor(7000, ()=>{
    const masked=vals.map((v,i)=>i===sequencePracticeIndex ? "?" : "•");
    document.querySelector("#practice-line").textContent=masked.join("  ·  ");
    document.querySelector("#sequence-feedback").textContent="Jetzt aus dem Gedächtnis.";
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
document.querySelector("#practice-input").addEventListener("keydown",e=>{
  if(e.key==="Enter") checkPractice();
});
