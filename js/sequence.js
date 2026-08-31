
let sequenceN=2, sequenceRecognition=null, sequencePracticeIndex=3;

function seqVals(n){ return Array.from({length:10},(_,i)=>n*(i+1)); }

function startSequence(){
  sequenceN=Number(document.querySelector("#sequence-select").value)||2;
  showView("sequence");
  renderSequence();
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
}

function speakSequence(){
  const vals=seqVals(sequenceN);
  if(!("speechSynthesis" in window)){
    document.querySelector("#sequence-feedback").textContent="Sprachausgabe wird auf diesem Gerät nicht unterstützt.";
    return;
  }
  speechSynthesis.cancel();
  let i=0;
  const next=()=>{
    if(i>=vals.length)return;
    document.querySelectorAll(".sequence-step").forEach(x=>x.classList.remove("active"));
    document.querySelector(`.sequence-step[data-i="${i}"]`)?.classList.add("active");
    const u=new SpeechSynthesisUtterance(String(vals[i]));
    u.lang="de-DE"; u.rate=.72; u.pitch=1.02;
    u.onend=()=>{ i++; setTimeout(next,180); };
    speechSynthesis.speak(u);
  };
  next();
}

function parseGermanNumbers(text){
  const ones={null:0,eins:1,ein:1,eine:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9};
  const teens={zehn:10,elf:11,"zwölf":12,zwoelf:12,dreizehn:13,vierzehn:14,"fünfzehn":15,funfzehn:15,sechzehn:16,siebzehn:17,achtzehn:18,neunzehn:19};
  const tens={zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,siebzig:70,achtzig:80,neunzig:90};
  const words=String(text||"").toLowerCase().replace(/[.,;:!?]/g," ").split(/\s+/).filter(Boolean);
  const out=[];
  for(const w of words){
    if(/^\d+$/.test(w)){ out.push(Number(w)); continue; }
    if(ones[w]!==undefined){ out.push(ones[w]); continue; }
    if(teens[w]!==undefined){ out.push(teens[w]); continue; }
    if(tens[w]!==undefined){ out.push(tens[w]); continue; }
    let found=null;
    for(const [ow,ov] of Object.entries(ones)){
      for(const [tw,tv] of Object.entries(tens)){
        if(w===ow+"und"+tw){ found=ov+tv; break; }
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
  let firstWrong=-1;
  for(let i=0;i<exp.length;i++){ if(nums[i]!==exp[i]){ firstWrong=i; break; } }
  if(firstWrong===-1 && nums.length>=exp.length){
    document.querySelector("#sequence-feedback").textContent=`🎉 Super! Die ${sequenceN}er-Reihe war vollständig richtig.`;
    const p=profile(); if(p){ p.xp=(p.xp||0)+20; p.today=(p.today||0)+1; saveDB(); renderHome(); burst(p.theme==="cats"?"🐾":"⚽"); }
  } else {
    const idx=firstWrong===-1?nums.length:firstWrong;
    const prev=idx>0?exp[idx-1]:null, target=exp[idx];
    document.querySelector("#sequence-feedback").textContent=prev!==null
      ? `Fast. Nach ${prev} kommt ${target}. Versuch ab dort weiterzumachen.`
      : `Die ${sequenceN}er-Reihe beginnt mit ${target}. Versuch es noch einmal.`;
  }
}

function startSpeechRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  document.querySelector("#sequence-speech-box").classList.remove("hidden");
  if(!SR){
    document.querySelector("#speech-status-text").textContent="Spracherkennung ist in diesem Browser nicht verfügbar.";
    document.querySelector("#speech-live").textContent="Vorlesen und Lückenübungen funktionieren trotzdem.";
    return;
  }
  if(sequenceRecognition){ try{sequenceRecognition.stop()}catch{} }
  sequenceRecognition=new SR();
  sequenceRecognition.lang="de-DE"; sequenceRecognition.continuous=false; sequenceRecognition.interimResults=true;
  let finalText="";
  sequenceRecognition.onstart=()=>{
    document.querySelector("#speech-status-text").textContent=`Sprich jetzt die ${sequenceN}er-Reihe.`;
    document.querySelector("#speech-live").textContent="Ich höre zu …";
  };
  sequenceRecognition.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal)finalText+=" "+t; else interim+=t;
    }
    document.querySelector("#speech-live").textContent=(finalText+" "+interim).trim()||"Ich höre zu …";
  };
  sequenceRecognition.onerror=e=>{
    document.querySelector("#speech-status-text").textContent="Die Spracherkennung konnte nicht zuverlässig zuhören.";
    if(e.error==="not-allowed")document.querySelector("#speech-live").textContent="Bitte erlaube dem Browser den Mikrofonzugriff.";
  };
  sequenceRecognition.onend=()=>{
    const nums=parseGermanNumbers(finalText);
    if(nums.length)compareSequence(nums);
    else if(finalText.trim())document.querySelector("#sequence-feedback").textContent="Ich konnte keine Zahlen sicher erkennen. Bitte langsamer und mit kleinen Pausen sprechen.";
  };
  try{sequenceRecognition.start()}catch{}
}

function stopSpeech(){ if(sequenceRecognition){ try{sequenceRecognition.stop()}catch{} sequenceRecognition=null; } }

function openPractice(){
  stopSpeech();
  const vals=seqVals(sequenceN);
  sequencePracticeIndex=Math.floor(Math.random()*8)+1;
  document.querySelector("#practice-line").textContent=vals.map((v,i)=>i===sequencePracticeIndex?"?":v).join("  ·  ");
  document.querySelector("#practice-input").value="";
  document.querySelector("#sequence-practice-box").classList.remove("hidden");
  document.querySelector("#practice-input").focus();
}
function checkPractice(){
  const expected=seqVals(sequenceN)[sequencePracticeIndex];
  const v=Number(document.querySelector("#practice-input").value);
  if(v===expected){ document.querySelector("#sequence-feedback").textContent="✅ Richtig!"; setTimeout(openPractice,500); }
  else document.querySelector("#sequence-feedback").textContent=`Noch nicht. Hier kommt ${expected}.`;
}

document.querySelector("#sequence-start").addEventListener("click",startSequence);
document.querySelector("#sequence-play").addEventListener("click",speakSequence);
document.querySelector("#sequence-practice").addEventListener("click",openPractice);
document.querySelector("#sequence-speak").addEventListener("click",startSpeechRecognition);
document.querySelector("#speech-stop").addEventListener("click",stopSpeech);
document.querySelector("#speech-retry").addEventListener("click",startSpeechRecognition);
document.querySelector("#practice-check").addEventListener("click",checkPractice);
document.querySelector("#practice-input").addEventListener("keydown",e=>{ if(e.key==="Enter")checkPractice(); });
