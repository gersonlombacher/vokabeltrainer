
let selected=new Set([2,3,4,5,6,7,8,9,10]),session=[],pos=0,right=0,mode="learn";
let MATH_HINTS={},helpMode=localStorage.getItem("vocaflow_math_help_mode")||"full";
fetch("data/mathHints.json").then(r=>r.json()).then(x=>{MATH_HINTS=x}).catch(()=>{});
const tips={2:["🚲","Ein Fahrrad hat 2 Räder."],3:["🔺","Ein Dreieck hat 3 Seiten."],4:["🚗","Ein Auto hat 4 Räder."],5:["✋","Eine Hand hat 5 Finger."],6:["🎲","Ein Würfel hat 6 Seiten."],7:["🌈","Ein Regenbogen hat 7 Farben."],8:["🕷️","Eine Spinne hat 8 Beine."],9:["🖐️","Bei der 9er-Reihe hilft der Fingertrick."],10:["🔟","Bei der 10er-Reihe hängt immer eine Null dran."]};
function renderTables(){const box=document.querySelector("#table-buttons");box.innerHTML="";for(let n=2;n<=10;n++){const b=document.createElement("button");b.className="table-btn "+(selected.has(n)?"selected":"");b.textContent=n+"er";b.onclick=()=>{selected.has(n)?selected.delete(n):selected.add(n);renderTables()};box.appendChild(b)}}
function renderMathWorld(){const p=profile();if(!p)return;const cats=p.theme==="cats";document.querySelector("#math-world-icon").textContent=cats?"🐱":"⚽";document.querySelector("#math-world-title").textContent=cats?"Katzenparadies":"Fußballakademie";document.querySelector("#math-world-copy").textContent=cats?"Sammle Pfoten und schalte neue Katzen frei.":"Trainiere und baue deine Fußballakademie aus."}
function weakness(p,a,b){const r=p.math[`${a}x${b}`];return r.wrong*3-r.right+Math.random()}
function makeQ(p,smart,forced){let tables=forced?[forced]:[...selected];if(!tables.length)tables=[2,3,4,5,6,7,8,9,10];let cs=[];tables.forEach(a=>{for(let b=1;b<=10;b++)cs.push({a,b})});if(smart)cs.sort((x,y)=>weakness(p,y.a,y.b)-weakness(p,x.a,x.b));const q=smart?cs[Math.floor(Math.random()*Math.min(20,cs.length))]:cs[Math.floor(Math.random()*cs.length)];return {...q,answer:q.a*q.b}}

function startMath(m,forcedRow=null){
  const p=profile();
  ensureMath(p);
  mode=m;
  pos=0;
  right=0;

  let forced=null;
  if(m==="boss"){
    forced=Number(forcedRow);
    if(!(forced>=2 && forced<=10)){
      openBossPicker();
      return;
    }
  }

  session=Array.from({length:10},()=>makeQ(p,m==="smart",forced));
  document.querySelector("#math-title").textContent=
    m==="boss" ? `${forced}er-Bosskampf` :
    m==="smart" ? "Schwächen trainieren" :
    m==="blitz" ? "Blitzrunde" : "Lernen";

  showView("math-play");
  renderQ();
}

function renderQ(){const q=session[pos];if(!q){document.querySelector("#math-feedback").textContent=`🎉 ${right} von 10 richtig!`;setTimeout(()=>showView("math"),1200);return}const p=profile();document.querySelector("#math-counter").textContent=`${pos+1} / 10`;document.querySelector("#math-score").textContent=`${right} richtig`;document.querySelector("#math-char").textContent=p.theme==="cats"?"🐱":"⚽";document.querySelector("#math-question").textContent=`${q.a} × ${q.b}`;document.querySelector("#math-answer").value="";document.querySelector("#math-feedback").textContent="";renderMathHelp(q);document.querySelector("#math-answer").focus()}
function record(q,ok){const p=profile();ensureMath(p);const r=p.math[`${q.a}x${q.b}`];ok?(r.right++,r.streak++):(r.wrong++,r.streak=0);p.mathCount++;p.today++;if(ok)p.xp+=5;saveDB();renderHome()}

function hintData(q){
  return MATH_HINTS[`${q.a}x${q.b}`] || {
    visual:"🧠",strategy:"Lerntipp",short:`${q.a} × ${q.b} = ${q.answer}`,
    full:`Sprich die Aufgabe laut und zerlege sie in bekannte Reihen.`,
    memory:`Merke dir: ${q.a} × ${q.b} = ${q.answer}.`
  };
}
function applyHelpMode(){
  document.querySelectorAll(".help-mode").forEach(b=>b.classList.toggle("selected",b.dataset.helpMode===helpMode));
}
function renderMathHelp(q){
  const h=hintData(q);
  document.querySelector("#math-tip-icon").textContent=h.visual;
  document.querySelector("#math-help-title").textContent=h.strategy;
  document.querySelector("#math-tip").textContent="Nutze die Hilfe nur so lange, bis du die Aufgabe sicher kannst.";
  document.querySelector("#math-help-short").textContent=h.short;
  document.querySelector("#math-help-full").textContent=h.full;
  document.querySelector("#math-memory").textContent=h.memory;

  const full=document.querySelector("#math-help-full");
  const memory=document.querySelector("#math-memory");
  const short=document.querySelector("#math-help-short");
  const toggle=document.querySelector("#math-help-toggle");

  short.classList.toggle("hidden",helpMode==="hidden");
  full.classList.toggle("hidden",helpMode!=="full");
  memory.classList.toggle("hidden",helpMode!=="full");
  toggle.textContent=helpMode==="full"?"Weniger Hilfe":helpMode==="short"?"Mehr Hilfe":"💡 Hilfe zeigen";
}
document.querySelectorAll(".help-mode").forEach(b=>b.onclick=()=>{
  helpMode=b.dataset.helpMode;
  localStorage.setItem("vocaflow_math_help_mode",helpMode);
  applyHelpMode();
  const q=session[pos]; if(q)renderMathHelp(q);
});
document.querySelector("#math-help-toggle").onclick=()=>{
  if(helpMode==="hidden") helpMode="short";
  else if(helpMode==="short") helpMode="full";
  else helpMode="short";
  localStorage.setItem("vocaflow_math_help_mode",helpMode);
  applyHelpMode();
  const q=session[pos]; if(q)renderMathHelp(q);
};
applyHelpMode();


function openBossPicker(){
  document.querySelector("#boss-modal")?.classList.remove("hidden");
}
function closeBossPicker(){
  document.querySelector("#boss-modal")?.classList.add("hidden");
}
document.querySelector("#boss-close")?.addEventListener("click",closeBossPicker);
document.querySelector("#boss-modal")?.addEventListener("click",e=>{
  if(e.target.id==="boss-modal") closeBossPicker();
});
document.querySelectorAll("[data-boss-row]").forEach(b=>{
  b.addEventListener("click",()=>{
    const row=Number(b.dataset.bossRow);
    closeBossPicker();
    startMath("boss",row);
  });
});


function openBossPicker(){
  document.querySelector("#boss-modal")?.classList.remove("hidden");
}
function closeBossPicker(){
  document.querySelector("#boss-modal")?.classList.add("hidden");
}

document.querySelector("#boss-close")?.addEventListener("click", closeBossPicker);
document.querySelector("#boss-modal")?.addEventListener("click", e=>{
  if(e.target.id==="boss-modal") closeBossPicker();
});
document.querySelectorAll("[data-boss-row]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const row=Number(btn.dataset.bossRow);
    closeBossPicker();
    startMath("boss", row);
  });
});
document.querySelectorAll("[data-mode]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    if(btn.dataset.mode==="boss") openBossPicker();
    else startMath(btn.dataset.mode);
  });
});

renderTables();
