
let sequenceN=2;
let sequenceRecognition=null;
let selectedVoice=null;
let previewTimeout=null;
let countdownInterval=null;

let gapValues=[];
let gapIndexes=[];
let gapMissingValues=[];
let gapUserValues=[];
let gapRound=0;

function seqVals(n){ return Array.from({length:10},(_,i)=>n*(i+1)); }

function pickNaturalGermanVoice(){
  if(!("speechSynthesis" in window)) return null;
  const voices=speechSynthesis.getVoices()||[];
  const preferred=/Anna|Helena|Petra|Marlene|Vicki|Katja|Sandy|Amelie|female|natural|premium|enhanced/i;
  return voices.find(v=>/^de(-|_)/i.test(v.lang||"") && preferred.test(v.name||""))
      || voices.find(v=>/^de(-|_)/i.test(v.lang||""))
      || null;
}
function refreshVoice(){selectedVoice=pickNaturalGermanVoice();}
if("speechSynthesis" in window){
  refreshVoice();
  speechSynthesis.onvoiceschanged=refreshVoice;
}

function clearPreview(){
  if(previewTimeout) clearTimeout(previewTimeout);
  if(countdownInterval) clearInterval(countdownInterval);
  previewTimeout=null;
  countdownInterval=null;
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
function previewThenHide(seconds=7,after=null){
  clearPreview();
  showReferences();
  const note=document.querySelector("#sequence-preview-note");
  let remaining=seconds;
  if(note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;

  countdownInterval=setInterval(()=>{
    remaining--;
    if(remaining>0 && note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;
  },1000);

  previewTimeout=setTimeout(()=>{
    clearPreview();
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
  clearPreview();
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

  document.querySelector("#sequence-speech-box")?.classList.add("hidden");
  document.querySelector("#sequence-practice-box")?.classList.add("hidden");
  document.querySelector("#sequence-feedback").textContent="";
  showReferences();
  const note=document.querySelector("#sequence-preview-note");
  if(note) note.textContent="👀 Schau dir die Reihe an.";
}

function speakOne(text,onend){
  if(!("speechSynthesis" in window)){onend?.();return;}
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
  const out=[];
  for(const w of normalized.split(/\s+/).filter(Boolean)){
    if(/^\d+$/.test(w)) out.push(Number(w));
    else if(simple[w]!==undefined) out.push(simple[w]);
  }
  return out;
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
      if(e.results[i].isFinal) finalText+=" "+t;
      else interim+=t;
    }
    const nums=parseGermanNumbers((finalText+" "+interim).trim());
    document.querySelector("#speech-live").textContent=nums.length?nums.join(" · "):"Ich höre zu …";
  };
  sequenceRecognition.onend=()=>{
    const nums=parseGermanNumbers(finalText);
    const exp=seqVals(sequenceN);
    const ok=nums.length>=10 && exp.every((v,i)=>nums[i]===v);
    document.querySelector("#sequence-feedback").textContent=
      ok ? "🎉 Super! Die Reihe war richtig." : "Fast. Versuch die Reihe noch einmal.";
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

/* ---------- LÜCKEN: KACHELN IN RICHTIGER REIHENFOLGE ---------- */
function shuffled(arr){
  return arr.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
}

function createGapIndexes(){
  // 4 echte Lücken; nicht ganz am Anfang oder Ende.
  const candidates=[1,2,3,4,5,6,7,8];
  return shuffled(candidates).slice(0,4).sort((a,b)=>a-b);
}

function buildGapRound(){
  gapValues=seqVals(sequenceN);
  gapIndexes=createGapIndexes();
  gapMissingValues=gapIndexes.map(i=>gapValues[i]);
  gapUserValues=[];

  const line=document.querySelector("#practice-line");
  line.innerHTML=gapValues.map((v,i)=>{
    if(gapIndexes.includes(i)){
      const order=gapIndexes.indexOf(i);
      return `<span class="gap-slot" data-gap-order="${order}">?</span>`;
    }
    return `<span class="gap-known">${v}</span>`;
  }).join('<span class="sequence-sep"> · </span>');

  renderSelectedGaps();
  renderGapChoices();
  document.querySelector("#sequence-feedback").textContent="Tippe die fehlenden Zahlen von links nach rechts an.";
}

function renderSelectedGaps(){
  const box=document.querySelector("#practice-selected");
  if(!box)return;
  box.innerHTML="";
  gapMissingValues.forEach((_,i)=>{
    const chip=document.createElement("div");
    chip.className="selected-gap-chip";
    chip.textContent=gapUserValues[i] ?? (i+1);
    if(gapUserValues[i]!==undefined) chip.classList.add("filled");
    box.appendChild(chip);
  });

  document.querySelectorAll("[data-gap-order]").forEach(el=>{
    const order=Number(el.dataset.gapOrder);
    el.textContent=gapUserValues[order] ?? "?";
    el.classList.toggle("filled",gapUserValues[order]!==undefined);
  });
}

function renderGapChoices(){
  const box=document.querySelector("#practice-choices");
  box.innerHTML="";
  shuffled(gapMissingValues).forEach(value=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="practice-choice";
    btn.textContent=value;

    btn.addEventListener("click",()=>{
      if(btn.disabled) return;

      const expectedIndex=gapUserValues.length;
      const expected=gapMissingValues[expectedIndex];

      if(value===expected){
        gapUserValues.push(value);
        btn.disabled=true;
        btn.classList.add("used","correct");
        renderSelectedGaps();

        if(gapUserValues.length===gapMissingValues.length){
          document.querySelector("#sequence-feedback").textContent="🎉 Super! Alle Lücken richtig.";
          gapRound++;
          setTimeout(()=>{
            buildGapRound();
          },900);
        }else{
          document.querySelector("#sequence-feedback").textContent="✅ Richtig. Jetzt die nächste Lücke.";
        }
      }else{
        btn.classList.add("wrong");
        document.querySelector("#sequence-feedback").textContent="Noch nicht – welche Zahl gehört als Nächstes?";
        setTimeout(()=>btn.classList.remove("wrong"),500);
      }
    });

    box.appendChild(btn);
  });
}

function resetGapRound(){
  gapUserValues=[];
  renderSelectedGaps();
  renderGapChoices();
  document.querySelector("#sequence-feedback").textContent="Nochmal von links nach rechts.";
}

function openPractice(){
  stopSpeech();
  gapRound=0;
  document.querySelector("#sequence-practice-box").classList.remove("hidden");

  const vals=seqVals(sequenceN);
  document.querySelector("#practice-line").innerHTML=
    vals.map(v=>`<span class="gap-known">${v}</span>`).join('<span class="sequence-sep"> · </span>');
  document.querySelector("#practice-selected").innerHTML="";
  document.querySelector("#practice-choices").innerHTML="";
  document.querySelector("#sequence-feedback").textContent="Schau dir die Reihe 7 Sekunden an.";

  previewThenHide(7,()=>{
    buildGapRound();
  });
}

document.querySelector("#sequence-start").addEventListener("click",startSequence);
document.querySelector("#sequence-play").addEventListener("click",speakSequence);
document.querySelector("#sequence-practice").addEventListener("click",openPractice);
document.querySelector("#sequence-speak").addEventListener("click",startSpeechRecognition);
document.querySelector("#speech-stop").addEventListener("click",stopSpeech);
document.querySelector("#speech-retry").addEventListener("click",startSpeechRecognition);
document.querySelector("#practice-reset")?.addEventListener("click",resetGapRound);
