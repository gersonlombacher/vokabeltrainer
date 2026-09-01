
let sequenceN=2;
let sequenceRecognition=null;
let selectedVoice=null;
let previewTimeout=null;
let countdownInterval=null;

let puzzleValues=[];
let puzzleMissingIndexes=[];
let puzzleMissingValues=[];
let puzzlePlacedCount=0;
let puzzleLevel=1;

function seqVals(n){
  return Array.from({length:10},(_,i)=>n*(i+1));
}

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
  let remaining=seconds;
  const note=document.querySelector("#sequence-preview-note");
  if(note) note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;

  countdownInterval=setInterval(()=>{
    remaining--;
    if(remaining>0 && note){
      note.textContent=`👀 Noch ${remaining} Sekunden anschauen …`;
    }
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
  puzzleLevel=1;
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
  showReferences();
  let i=0;

  const next=()=>{
    if(i>=vals.length){
      previewThenHide(7);
      return;
    }
    document.querySelectorAll(".sequence-step").forEach(x=>x.classList.remove("active"));
    document.querySelector(`.sequence-step[data-i="${i}"]`)?.classList.add("active");
    speakOne(vals[i],()=>{ i++; setTimeout(next,150); });
  };
  next();
}


function parseGermanNumbers(text){
  const expected=seqVals(sequenceN);
  let normalized=String(text||"").toLowerCase()
    .replace(/\bsex\b/g,"sechs")
    .replace(/\bsix\b/g,"sechs")
    .replace(/[.,;:!?]/g," ")
    .replace(/\s+/g," ")
    .trim();

  const simple={
    null:0,eins:1,ein:1,eine:1,zwei:2,drei:3,vier:4,"fünf":5,funf:5,sechs:6,sieben:7,acht:8,neun:9,
    zehn:10,elf:11,"zwölf":12,zwoelf:12,dreizehn:13,vierzehn:14,"fünfzehn":15,funfzehn:15,sechzehn:16,siebzehn:17,
    achtzehn:18,neunzehn:19,zwanzig:20,"dreißig":30,dreissig:30,vierzig:40,"fünfzig":50,funfzig:50,sechzig:60,
    siebzig:70,achtzig:80,neunzig:90
  };

  const rawTokens=[];
  for(const token of normalized.split(/\s+/).filter(Boolean)){
    if(/^\d+$/.test(token)){
      rawTokens.push(token);
    }else if(simple[token]!==undefined){
      rawTokens.push(String(simple[token]));
    }else{
      rawTokens.push(token);
    }
  }

  const result=[];
  let expectedIndex=0;

  function consumeDigitChunk(chunk){
    let rest=chunk;

    while(rest && expectedIndex<expected.length){
      const want=String(expected[expectedIndex]);
      if(rest.startsWith(want)){
        result.push(expected[expectedIndex]);
        expectedIndex++;
        rest=rest.slice(want.length);
      }else{
        break;
      }
    }

    if(rest && expectedIndex<expected.length){
      const asNumber=Number(rest);
      if(asNumber===expected[expectedIndex]){
        result.push(asNumber);
        expectedIndex++;
      }
    }
  }

  for(const token of rawTokens){
    if(expectedIndex>=expected.length) break;
    if(/^\d+$/.test(token)){
      consumeDigitChunk(token);
    }
  }

  return result;
}

function beginRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    document.querySelector("#speech-status-text").textContent="Spracherkennung ist in diesem Browser nicht verfügbar.";
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

  sequenceRecognition.onend=()=>{
    const nums=parseGermanNumbers(finalText);
    const expected=seqVals(sequenceN);
    const ok=nums.length>=10 && expected.every((v,i)=>nums[i]===v);
    document.querySelector("#sequence-feedback").textContent=
      ok
      ? "🎉 Super! Die Reihe war richtig."
      : `Ich habe ${nums.length} von 10 Zahlen sicher erkannt. Versuch es noch einmal – langsam und mit kleinen Pausen.`;
  };

  try{ sequenceRecognition.start(); }catch{}
}

function startSpeechRecognition(){
  document.querySelector("#sequence-speech-box").classList.remove("hidden");
  document.querySelector("#speech-status-text").textContent="Schau dir die Reihe noch kurz an.";
  previewThenHide(7,beginRecognition);
}

function stopSpeech(){
  if(sequenceRecognition){ try{sequenceRecognition.stop()}catch{} }
  sequenceRecognition=null;
}

/* ---------------- REIHEN-PUZZLE ---------------- */

function shuffled(arr){
  return arr
    .map(v=>({v,r:Math.random()}))
    .sort((a,b)=>a.r-b.r)
    .map(x=>x.v);
}

function missingCountForLevel(){
  if(puzzleLevel===1) return 6;  // einige Anker bleiben
  if(puzzleLevel===2) return 8;  // nur zwei Anker
  return 10;                     // komplette Reihe selbst aufbauen
}

function pickMissingIndexes(count){
  const all=[0,1,2,3,4,5,6,7,8,9];

  if(count===6){
    // gute Anker bleiben sichtbar: Positionen 1,4,7,10
    return [1,2,4,5,7,8];
  }

  if(count===8){
    // nur Anfang und Ende bleiben stehen
    return [1,2,3,4,5,6,7,8];
  }

  return all;
}

function buildPuzzle(){
  puzzleValues=seqVals(sequenceN);
  puzzlePlacedCount=0;

  const count=missingCountForLevel();
  puzzleMissingIndexes=pickMissingIndexes(count);
  puzzleMissingValues=puzzleMissingIndexes.map(i=>puzzleValues[i]);

  renderPuzzleLine();
  renderPuzzleChoices();

  document.querySelector("#sequence-feedback").textContent=
    puzzleLevel===1 ? "Setze alle fehlenden Zahlen ein." :
    puzzleLevel===2 ? "Jetzt fehlen noch mehr Zahlen." :
    "Profi! Baue die ganze Reihe selbst auf.";
}

function renderPuzzleLine(){
  const line=document.querySelector("#practice-line");
  line.innerHTML="";

  puzzleValues.forEach((value,index)=>{
    const slot=document.createElement("div");
    slot.className="puzzle-number-card";

    const missingOrder=puzzleMissingIndexes.indexOf(index);

    if(missingOrder===-1){
      slot.classList.add("given");
      slot.textContent=value;
    }else{
      slot.classList.add("missing");
      slot.dataset.missingOrder=missingOrder;

      if(missingOrder<puzzlePlacedCount){
        slot.textContent=puzzleMissingValues[missingOrder];
        slot.classList.add("filled");
      }else{
        slot.textContent="?";
      }
    }

    line.appendChild(slot);
  });
}

function renderPuzzleChoices(){
  const box=document.querySelector("#practice-choices");
  box.innerHTML="";

  shuffled(puzzleMissingValues).forEach(value=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="practice-choice";
    btn.textContent=value;

    const alreadyPlaced=puzzleMissingValues
      .slice(0,puzzlePlacedCount)
      .includes(value);

    if(alreadyPlaced){
      btn.disabled=true;
      btn.classList.add("used");
    }

    btn.addEventListener("click",()=>{
      const expected=puzzleMissingValues[puzzlePlacedCount];

      if(value===expected){
        btn.classList.add("correct","fly-choice");
        btn.disabled=true;

        puzzlePlacedCount++;
        renderPuzzleLine();

        if(puzzlePlacedCount===puzzleMissingValues.length){
          document.querySelector("#sequence-feedback").textContent="🎉 Super! Reihe geschafft!";
          burst(profile()?.theme==="cats"?"🐾":"⭐");

          setTimeout(()=>{
            if(puzzleLevel<3){
              puzzleLevel++;
              buildPuzzle();
            }else{
              puzzleLevel=1;
              buildPuzzle();
            }
          },1100);
        }else{
          document.querySelector("#sequence-feedback").textContent="✅ Richtig. Weiter geht’s.";
          renderPuzzleChoices();
        }
      }else{
        btn.classList.add("wrong","shake-choice");
        document.querySelector("#sequence-feedback").textContent="Noch nicht. Welche Zahl kommt als Nächstes?";
        setTimeout(()=>{
          btn.classList.remove("wrong","shake-choice");
        },500);
      }
    });

    box.appendChild(btn);
  });
}

function resetPuzzle(){
  puzzlePlacedCount=0;
  renderPuzzleLine();
  renderPuzzleChoices();
  document.querySelector("#sequence-feedback").textContent="Nochmal von links nach rechts.";
}

function openPractice(){
  stopSpeech();
  puzzleLevel=1;

  document.querySelector("#sequence-practice-box").classList.remove("hidden");
  document.querySelector("#practice-choices").innerHTML="";
  document.querySelector("#sequence-feedback").textContent="Schau dir die ganze Reihe 7 Sekunden an.";

  const vals=seqVals(sequenceN);
  const line=document.querySelector("#practice-line");
  line.innerHTML=vals.map(v=>`<div class="puzzle-number-card given">${v}</div>`).join("");

  previewThenHide(7,()=>{
    buildPuzzle();
  });
}

document.querySelector("#sequence-start").addEventListener("click",startSequence);
document.querySelector("#sequence-play").addEventListener("click",speakSequence);
document.querySelector("#sequence-practice").addEventListener("click",openPractice);
document.querySelector("#sequence-speak").addEventListener("click",startSpeechRecognition);
document.querySelector("#speech-stop").addEventListener("click",stopSpeech);
document.querySelector("#speech-retry").addEventListener("click",startSpeechRecognition);
document.querySelector("#practice-reset")?.addEventListener("click",resetPuzzle);
