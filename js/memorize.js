
let memorizeMode="flash";
let memorizeSession=[];
let memorizePos=0;
let memorizeKnown=0;
let wheelBusy=false;

function memorizeProfile(){
  const p=profile();
  if(!p)return null;
  ensureMath(p);
  p.memoryMath ||= {};
  return p;
}
function memorizeQuestion(){
  return memorizeSession[memorizePos]||null;
}
function makeMemorizeSession(){
  const p=memorizeProfile(); if(!p)return;
  let tables=[...selected];
  if(!tables.length)tables=[2,3,4,5,6,7,8,9,10];

  const pool=[];
  tables.forEach(a=>{
    for(let b=1;b<=10;b++){
      const key=`${a}x${b}`;
      const m=p.memoryMath[key]||{known:0,again:0};
      // Harder/less-known facts get more weight.
      const weight=Math.max(1,4 + (m.again||0)*2 - (m.known||0));
      for(let i=0;i<weight;i++)pool.push({a,b,answer:a*b,key});
    }
  });

  memorizeSession=[];
  for(let n=0;n<20;n++){
    memorizeSession.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  memorizePos=0;
  memorizeKnown=0;
}

function startMemorize(mode){
  memorizeMode=mode;
  makeMemorizeSession();
  const titles={flash:"Blitzkarten",wheel:"Glücksrad",rhythm:"Rhythmus"};
  document.querySelector("#memorize-title").textContent=titles[mode]||"Auswendig lernen";
  showView("memorize");
  renderMemorize();
}

function renderMemorize(){
  const q=memorizeQuestion();
  if(!q){
    document.querySelector("#memorize-feedback").textContent=`🎉 Runde geschafft: ${memorizeKnown} sicher gewusst.`;
    setTimeout(()=>showView("math"),1300);
    return;
  }

  document.querySelector("#memorize-counter").textContent=`${memorizePos+1} / ${memorizeSession.length}`;
  document.querySelector("#memorize-score").textContent=`${memorizeKnown} sicher`;
  document.querySelector("#memorize-feedback").textContent="";
  document.querySelector("#flash-card").classList.remove("flipped");

  document.querySelector("#flash-wrap").classList.toggle("hidden",memorizeMode==="rhythm");
  document.querySelector("#wheel-wrap").classList.toggle("hidden",memorizeMode!=="wheel");
  document.querySelector("#rhythm-wrap").classList.toggle("hidden",memorizeMode!=="rhythm");

  if(memorizeMode==="flash" || memorizeMode==="wheel"){
    document.querySelector("#flash-question").textContent=`${q.a} × ${q.b}`;
    document.querySelector("#flash-answer").textContent=q.answer;
    document.querySelector("#flash-memory").textContent=`Sprich laut: ${q.a} × ${q.b} = ${q.answer}`;
  }
  if(memorizeMode==="rhythm"){
    document.querySelector("#rhythm-line").textContent=`${q.a} mal ${q.b} ist ${q.answer}`;
    speakRhythm();
  }
}

function recordMemorize(knew){
  const p=memorizeProfile(),q=memorizeQuestion(); if(!p||!q)return;
  p.memoryMath[q.key] ||= {known:0,again:0};
  if(knew){
    p.memoryMath[q.key].known++;
    memorizeKnown++;
    p.xp=(p.xp||0)+2;
    burst(p.theme==="cats"?"🐾":"⚽");
  }else{
    p.memoryMath[q.key].again++;
    // Repeat soon in same session.
    const againAt=Math.min(memorizeSession.length,memorizePos+3);
    memorizeSession.splice(againAt,0,{...q});
  }
  p.today=(p.today||0)+1;
  p.mathCount=(p.mathCount||0)+1;
  saveDB();renderHome();
  memorizePos++;
  renderMemorize();
}

function speakRhythm(){
  const q=memorizeQuestion();if(!q)return;
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const phrase=`${q.a} mal ${q.b} ist ${q.answer}`;
  const u=new SpeechSynthesisUtterance(phrase);
  u.lang="de-DE";u.rate=.82;u.pitch=1.05;
  speechSynthesis.speak(u);
}

document.querySelectorAll("[data-memorize]").forEach(b=>{
  b.addEventListener("click",()=>startMemorize(b.dataset.memorize));
});

document.querySelector("#flash-card").addEventListener("click",()=>{
  document.querySelector("#flash-card").classList.toggle("flipped");
});

document.querySelector("#memorize-knew").addEventListener("click",()=>recordMemorize(true));
document.querySelector("#memorize-again").addEventListener("click",()=>recordMemorize(false));

document.querySelector("#rhythm-speak").addEventListener("click",speakRhythm);
document.querySelector("#rhythm-next").addEventListener("click",()=>recordMemorize(true));

document.querySelector("#spin-wheel").addEventListener("click",()=>{
  if(wheelBusy)return;
  wheelBusy=true;
  const wheel=document.querySelector("#wheel");
  const turns=1080+Math.floor(Math.random()*720);
  wheel.style.transform=`rotate(${turns}deg)`;
  document.querySelector("#memorize-feedback").textContent="🎡 Das Rad dreht …";
  setTimeout(()=>{
    wheelBusy=false;
    document.querySelector("#memorize-feedback").textContent="Aufgabe steht fest – löse die Karte!";
    document.querySelector("#flash-card").classList.remove("flipped");
  },1450);
});
