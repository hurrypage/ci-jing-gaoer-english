(() => {
  'use strict';
  const KEY='ci-jing-collocation-scheduler-v1', DAY=86400000;
  const day=()=>new Date().toISOString().slice(0,10);
  const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
  let catalog=null;
  const state=()=>{try{return {...{version:1,records:{},retiredIds:{}},...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return{version:1,records:{},retiredIds:{}};}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const find=phrase=>catalog?.records.find(x=>x.phrase.toLowerCase()===String(phrase).toLowerCase());
  function startCourseCards(cards){const s=state();(cards||[]).forEach(card=>{const phrase=Array.isArray(card)?card[0]:card,item=find(phrase),id=item?.id||`course:${phrase.toLowerCase()}`;if(!s.records[id])s.records[id]={phrase,introducedAt:day(),dueAt:plus(1),reps:0,lastGrade:'new'};});save(s);emit();}
  function record(phrase,grade){const s=state(),item=find(phrase),id=item?.id||`course:${String(phrase).toLowerCase()}`;if(!s.records[id])s.records[id]={phrase,introducedAt:day(),dueAt:plus(1),reps:0,lastGrade:'new'};const r=s.records[id];if(grade==='easy'){s.retiredIds[id]=true;r.lastGrade='easy';r.retiredAt=day();}else{r.lastGrade=grade;r.reps++;r.dueAt=plus(grade==='again'?1:grade==='hard'?2:5);}save(s);emit();return r;}
  function snapshot(){if(!catalog)return null;const s=state(),active=Object.keys(s.records).filter(id=>!s.retiredIds[id]);return {total:catalog.metadata.record_count,ready:catalog.metadata.ready_editor_count,candidate:catalog.metadata.candidate_count,introduced:active.length,due:active.filter(id=>s.records[id].dueAt<=day()).length};}
  function emit(){window.dispatchEvent(new CustomEvent('cijing:collocation-update',{detail:snapshot()}));}
  async function init(){try{const r=await fetch('data/collocation-catalog-v1.json');if(!r.ok)throw Error();catalog=await r.json();window.CiJingCollocationScheduler={startCourseCards,record,snapshot,getCatalog:()=>catalog};emit();}catch{console.warn('Collocation catalog could not be loaded.');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
