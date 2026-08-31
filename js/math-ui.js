
function closeMathSections(){
  ["rows","tasks","memorize"].forEach(x=>document.querySelector(`#math-section-${x}`)?.classList.add("hidden"));
  document.querySelector(".math-start")?.classList.remove("hidden");
}
function openMathSection(name){
  document.querySelector(".math-start")?.classList.add("hidden");
  ["rows","tasks","memorize"].forEach(x=>document.querySelector(`#math-section-${x}`)?.classList.toggle("hidden",x!==name));
  if(name==="memorize") renderMemorizeTableButtons();
}
document.querySelectorAll("[data-math-section]").forEach(b=>b.addEventListener("click",()=>openMathSection(b.dataset.mathSection)));
document.querySelectorAll(".math-section-back").forEach(b=>b.addEventListener("click",closeMathSections));

document.querySelectorAll("[data-seq]").forEach(b=>b.addEventListener("click",()=>{
  const n=Number(b.dataset.seq);
  document.querySelectorAll("[data-seq]").forEach(x=>x.classList.toggle("selected",x===b));
  const sel=document.querySelector("#sequence-select");
  if(sel)sel.value=String(n);
  const title=document.querySelector("#rows-selected-title");
  if(title)title.textContent=`${n}er-Reihe – wie möchtest du lernen?`;
  document.querySelector("#rows-learning-options")?.classList.remove("hidden");
}));

function beginSelectedSequence(action){
  const hiddenStart=document.querySelector("#sequence-start");
  hiddenStart?.click();
  setTimeout(()=>{
    if(action==="listen") document.querySelector("#sequence-play")?.click();
    if(action==="speak") document.querySelector("#sequence-speak")?.click();
    if(action==="gaps") document.querySelector("#sequence-practice")?.click();
  },80);
}
document.querySelector("#rows-listen")?.addEventListener("click",()=>beginSelectedSequence("listen"));
document.querySelector("#rows-speak")?.addEventListener("click",()=>beginSelectedSequence("speak"));
document.querySelector("#rows-gaps")?.addEventListener("click",()=>beginSelectedSequence("gaps"));

function renderMemorizeTableButtons(){
  const box=document.querySelector("#table-buttons-memorize"); if(!box)return;
  box.innerHTML="";
  for(let n=2;n<=10;n++){
    const b=document.createElement("button");
    b.className="table-btn "+(selected.has(n)?"selected":"");
    b.textContent=n+"er";
    b.addEventListener("click",()=>{
      selected.has(n)?selected.delete(n):selected.add(n);
      renderTables();
      renderMemorizeTableButtons();
    });
    box.appendChild(b);
  }
}
document.querySelector("#all-tables-memorize")?.addEventListener("click",()=>{
  selected=new Set([2,3,4,5,6,7,8,9,10]);
  renderTables();renderMemorizeTableButtons();
});
