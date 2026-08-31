
const KEY="vocaflow_v11_2";
const defaults={profiles:[{id:"jule",name:"Jule",avatar:"👧🏻",theme:"cats",xp:0,streak:0,today:0,englishCount:0,mathCount:0,math:{}}],activeProfileId:null};
let db;try{db={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{db=structuredClone(defaults)}
function saveDB(){localStorage.setItem(KEY,JSON.stringify(db))}
function profile(){return db.profiles.find(p=>p.id===db.activeProfileId)||null}
function ensureMath(p){p.math||={};for(let a=2;a<=10;a++)for(let b=1;b<=10;b++){const k=`${a}x${b}`;p.math[k]||={right:0,wrong:0,streak:0}}}
