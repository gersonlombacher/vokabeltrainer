
let WORDS=[],engSession=[],engPos=0,engHintLevel=0;
let englishVoice=null;

async function loadWords(){
  WORDS=await fetch("data/vokabeln.json").then(r=>r.json());
  renderUnits();
}

function renderUnits(){
  const g={};
  WORDS.forEach(w=>{
    const k=`${w.class}|${w.unit}`;
    g[k]??={class:w.class,unit:w.unit,count:0};
    g[k].count++;
  });
  const box=document.querySelector("#english-units");
  box.innerHTML="";
  Object.values(g).forEach(x=>{
    const b=document.createElement("button");
    b.className="unit-card";
    b.innerHTML=`<span class="eyebrow">Klasse ${x.class}</span><br><strong>${x.unit}</strong><p>${x.count} Wörter</p>`;
    b.onclick=()=>startEnglish(x.class,x.unit);
    box.appendChild(b);
  });
}

function startEnglish(c,u){
  engSession=WORDS
    .filter(w=>w.class===c&&w.unit===u)
    .sort(()=>Math.random()-.5)
    .slice(0,20);
  engPos=0;
  showView("english-learn");
  renderEnglish();
}

/* ---------- Klammern und unnötiges "(to)" verschwinden ---------- */

function prettyEnglish(raw){
  let s=String(raw||"").trim();

  // Contraction explanations: I'm (= I am) -> I'm / I am
  s=s.replace(/\(=\s*([^)]+)\)/gi," / $1");

  // Plural notes don't belong in the answer field.
  s=s.replace(/\(pl\.\s*[^)]+\)/gi,"");

  // "(to)" is grammatical information, not something the child must type.
  s=s.replace(/\(to\)/gi,"to");

  // Other simple brackets are displayed without brackets.
  s=s.replace(/\(([^)]+)\)/g,"$1");

  // Leading infinitive "to" is not required/displayed.
  s=s.replace(/^to\s+/i,"");

  // Clean spacing around slashes.
  s=s.replace(/\s*\/\s*/g," / ").replace(/\s+/g," ").trim();

  return s;
}

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/[()[\]{}]/g,"")
    .replace(/[.,!?;:]/g,"")
    .replace(/\s+/g," ");
}

function answerVariants(raw){
  const pretty=prettyEnglish(raw);
  const set=new Set();

  function add(v){
    let n=norm(v);
    if(!n)return;
    set.add(n);

    // "to step" and "step" both count as correct.
    if(n.startsWith("to "))set.add(n.slice(3));

    // "listen to" may also be accepted as "listen".
    if(n.endsWith(" to"))set.add(n.slice(0,-3));

    // Articles are optional for simple vocab entry.
    if(/^(the|a|an)\s+/.test(n))set.add(n.replace(/^(the|a|an)\s+/,""));
  }

  // User-facing version.
  add(pretty);

  // Alternatives separated by /
  pretty.split("/").forEach(add);

  // Original with "(to)" removed as optional.
  let original=String(raw||"")
    .replace(/\(to\)/gi,"")
    .replace(/\(=\s*([^)]+)\)/gi," / $1")
    .replace(/\(pl\.\s*[^)]+\)/gi,"")
    .replace(/\(([^)]+)\)/g,"$1");
  original.split("/").forEach(add);

  return [...set];
}

/* ---------- Natürliche englische Stimme ---------- */

function chooseEnglishVoice(){
  if(!("speechSynthesis" in window))return null;
  const voices=speechSynthesis.getVoices()||[];
  const preferred=/Samantha|Ava|Serena|Kate|Moira|female|natural|premium|enhanced/i;
  return voices.find(v=>/^en(-|_)/i.test(v.lang||"")&&preferred.test(v.name||""))
      || voices.find(v=>/^en-GB/i.test(v.lang||""))
      || voices.find(v=>/^en(-|_)/i.test(v.lang||""))
      || null;
}
function refreshEnglishVoice(){englishVoice=chooseEnglishVoice();}
if("speechSynthesis" in window){
  refreshEnglishVoice();
  speechSynthesis.onvoiceschanged=refreshEnglishVoice;
}
function speakEnglishWord(){
  const w=engSession[engPos];
  if(!w||!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const text=prettyEnglish(w.en).split("/")[0].trim();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=(englishVoice&&englishVoice.lang)||"en-GB";
  u.rate=.78;
  u.pitch=1.0;
  if(englishVoice)u.voice=englishVoice;
  speechSynthesis.speak(u);
}

/* ---------- Schrittweise Hinweise ---------- */

function coreAnswer(raw){
  let s=prettyEnglish(raw).split("/")[0].trim();
  s=s.replace(/^(the|a|an|to)\s+/i,"");
  return s;
}

function hintPattern(word){
  const chars=[...word];
  return chars.map((c,i)=>{
    if(c===" "||c==="-"||c==="'")return c;
    if(i===0||i===chars.length-1||i%3===0)return c;
    return "_";
  }).join(" ");
}

function getHints(w){
  const answer=coreAnswer(w.en);
  const letters=[...answer].filter(c=>/[a-z]/i.test(c)).length;
  const first=answer.charAt(0).toUpperCase();
  const last=answer.charAt(answer.length-1).toUpperCase();

  const special={
    like:"Denk an den Like-Button.",
    house:"Klingt ein bisschen wie „Haus“.",
    dog:"Denk an die Dogge.",
    read:"Denk an einen E-Reader.",
    bike:"Denk an Mountainbike.",
    apple:"Denk an die Firma mit dem Apfel-Logo.",
    step:"Denk an eine Stufe oder einen Schritt."
  };

  const h1=w.hint&&String(w.hint).trim()
    ? String(w.hint).trim()
    : (special[answer.toLowerCase()]||`Das englische Wort beginnt mit „${first}“.`);

  const h2=`Es hat ${letters} Buchstaben und endet mit „${last}“.`;

  const h3=`Fast geschafft: ${hintPattern(answer)}`;

  return [h1,h2,h3];
}

function showNextHint(){
  const w=engSession[engPos];
  if(!w)return;

  const hints=getHints(w);
  engHintLevel=Math.min(engHintLevel+1,3);

  document.querySelector("#eng-hint-text").textContent=hints[engHintLevel-1];
  document.querySelector("#eng-hint-level").textContent=`${engHintLevel} von 3 Hinweisen`;

  const btn=document.querySelector("#eng-hint");
  if(engHintLevel<3){
    btn.textContent=`💡 Hinweis ${engHintLevel+1}`;
  }else{
    btn.textContent="💡 Alle Hinweise gezeigt";
    btn.disabled=true;
  }
}

function renderEnglish(){
  const w=engSession[engPos];
  if(!w){
    showView("english");
    return;
  }

  engHintLevel=0;

  document.querySelector("#eng-title").textContent=`Klasse ${w.class} · ${w.unit}`;
  document.querySelector("#eng-counter").textContent=`${engPos+1} / ${engSession.length}`;
  document.querySelector("#eng-de").textContent=w.de;
  document.querySelector("#eng-answer").value="";
  document.querySelector("#eng-feedback").textContent="";

  document.querySelector("#eng-hint-level").textContent="0 von 3 Hinweisen";
  document.querySelector("#eng-hint-text").textContent="Wenn du Hilfe brauchst, tippe auf „Hinweis 1“.";

  const hintBtn=document.querySelector("#eng-hint");
  hintBtn.textContent="💡 Hinweis 1";
  hintBtn.disabled=false;

  document.querySelector("#eng-answer").focus();
}

document.querySelector("#eng-check").onclick=()=>{
  const w=engSession[engPos];
  if(!w)return;

  const entered=norm(document.querySelector("#eng-answer").value);
  const ok=answerVariants(w.en).includes(entered);

  if(ok){
    document.querySelector("#eng-feedback").textContent="⭐ Richtig! +10 XP";
    const p=profile();
    p.xp+=10;
    p.today++;
    p.englishCount++;
    saveDB();
    renderHome();
    burst("⭐");
    setTimeout(()=>{
      engPos++;
      renderEnglish();
    },500);
  }else{
    document.querySelector("#eng-feedback").innerHTML=
      `Fast. Richtig wäre: <b>${prettyEnglish(w.en)}</b>`;
    shake(document.querySelector(".learn-card"));
  }
};

document.querySelector("#eng-answer").onkeydown=e=>{
  if(e.key==="Enter")document.querySelector("#eng-check").click();
};

document.querySelector("#eng-dontknow").onclick=()=>{
  const w=engSession[engPos];
  if(w){
    document.querySelector("#eng-feedback").innerHTML=
      `Richtig ist: <b>${prettyEnglish(w.en)}</b>`;
  }
};

document.querySelector("#eng-hint").onclick=showNextHint;
document.querySelector("#eng-speak").onclick=speakEnglishWord;

loadWords();
