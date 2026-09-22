(() => {
  'use strict';
  const MASTER='ci-jing-learning-record-v1';
  const KEYS=['shanghai-english-flashcards-v2','shanghai-english-flashcards-v1','ci-jing-week1-v3','ci-jing-vocabulary-scheduler-v1','ci-jing-collocation-scheduler-v1','ci-jing-weekend-v2'];
  const nativeSet=Storage.prototype.setItem, nativeGet=Storage.prototype.getItem, nativeRemove=Storage.prototype.removeItem;
  let syncing=false;
  const safeParse=value=>{try{return JSON.parse(value)}catch{return value}};
  function snapshot(){const modules={};KEYS.forEach(key=>{const raw=nativeGet.call(localStorage,key);if(raw!==null)modules[key]=safeParse(raw)});return {format:'ci-jing-learning-record',version:1,exportedAt:new Date().toISOString(),modules};}
  function sync(){if(syncing)return;syncing=true;try{nativeSet.call(localStorage,MASTER,JSON.stringify(snapshot()));}finally{syncing=false;}}
  Storage.prototype.setItem=function(key,value){nativeSet.call(this,key,value);if(this===localStorage&&KEYS.includes(key))sync();};
  Storage.prototype.removeItem=function(key){nativeRemove.call(this,key);if(this===localStorage&&KEYS.includes(key))sync();};
  function restore(payload){if(payload?.format!=='ci-jing-learning-record'||!payload.modules)throw new Error('不是完整学习备份');KEYS.forEach(key=>{if(Object.hasOwn(payload.modules,key))nativeSet.call(localStorage,key,JSON.stringify(payload.modules[key]));else nativeRemove.call(localStorage,key);});sync();}
  function download(){sync();const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='词境完整学习备份_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);}
  document.addEventListener('click',event=>{if(event.target.closest('#exportBtn')){event.preventDefault();event.stopImmediatePropagation();download();document.getElementById('toast').textContent='已导出完整学习备份（课程、词汇、搭配和周末记录）';document.getElementById('toast').classList.add('show');setTimeout(()=>document.getElementById('toast')?.classList.remove('show'),2400);}},true);
  document.addEventListener('change',event=>{const input=event.target.closest('#importInput');if(!input?.files?.[0])return;event.preventDefault();event.stopImmediatePropagation();const reader=new FileReader();reader.onload=()=>{try{restore(JSON.parse(reader.result));location.reload();}catch{alert('该文件不是可恢复的完整词境学习备份。');}};reader.readAsText(input.files[0]);},true);
  window.CiJingLearningRecord={sync,snapshot,restore,keys:KEYS};sync();
})();
