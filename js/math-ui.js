
function showMathMenu(name){
  const map={
    rows:"math-rows-menu",
    understand:"math-understand-menu",
    memorize:"math-memorize-menu",
    test:"math-test-menu"
  };
  showView(map[name]||"math");
  if(name==="understand") renderExtraTables("#table-buttons-understand");
  if(name==="memorize") renderExtraTables("#table-buttons-memorize");
  if(name==="test") renderExtraTables("#table-buttons-test");
}

document.querySelectorAll("[data-math-page]").forEach(b=>{
  b.addEventListener("click",()=>showMathMenu(b.dataset.mathPage));
});

function renderExtraTables(selector){
  const box=document.querySelector(selector); if(!box)return;
  box.innerHTML="";
  for(let n=2;n<=10;n++){
    const b=document.createElement("button");
    b.className="table-btn "+(selected.has(n)?"selected":"");
    b.textContent=n+"er";
    b.addEventListener("click",()=>{
      selected.has(n)?selected.delete(n):selected.add(n);
      renderTables();
      renderExtraTables(selector);
    });
    box.appendChild(b);
  }
}

["understand","memorize","test"].forEach(kind=>{
  document.querySelector(`#all-tables-${kind}`)?.addEventListener("click",()=>{
    selected=new Set([2,3,4,5,6,7,8,9,10]);
    renderTables();
    renderExtraTables(`#table-buttons-${kind}`);
  });
});

document.querySelectorAll("[data-seq]").forEach(b=>{
  b.addEventListener("click",()=>{
    const n=Number(b.dataset.seq);
    document.querySelectorAll("[data-seq]").forEach(x=>x.classList.toggle("selected",x===b));
    document.querySelector("#sequence-select").value=String(n);
    document.querySelector("#rows-selected-title").textContent=`${n}er-Reihe – wie möchtest du lernen?`;
    document.querySelector("#rows-learning-options").classList.remove("hidden");
  });
});

function startSelectedSequence(action){
  document.querySelector("#sequence-start").click();
  setTimeout(()=>{
    if(action==="listen")document.querySelector("#sequence-play")?.click();
    if(action==="speak")document.querySelector("#sequence-speak")?.click();
    if(action==="gaps")document.querySelector("#sequence-practice")?.click();
  },120);
}
document.querySelector("#rows-listen")?.addEventListener("click",()=>startSelectedSequence("listen"));
document.querySelector("#rows-speak")?.addEventListener("click",()=>startSelectedSequence("speak"));
document.querySelector("#rows-gaps")?.addEventListener("click",()=>startSelectedSequence("gaps"));

document.querySelectorAll("#math-understand-menu-view .help-mode").forEach(b=>{
  b.addEventListener("click",()=>{
    helpMode=b.dataset.helpMode;
    localStorage.setItem("vocaflow_math_help_mode",helpMode);
    document.querySelectorAll(".help-mode").forEach(x=>x.classList.toggle("selected",x.dataset.helpMode===helpMode));
  });
});
