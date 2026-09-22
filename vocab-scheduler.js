(() => {
  'use strict';
  const KEY='ci-jing-vocabulary-scheduler-v1';
  const DAY=86400000;
  let catalog=null;
  const iso=d=>new Date(d).toISOString().slice(0,10);
  const today=()=>iso(new Date());
  const addDays=(date,count)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+count);return iso(d);};
  const isStudyDay=date=>{const d=new Date(`${date}T12:00:00`).getDay();return d>=1&&d<=5;};
  const studyDaysBetween=(from,to)=>{let cursor=new Date(`${from}T12:00:00`),end=new Date(`${to}T12:00:00`),n=0;while(cursor<=end){if(isStudyDay(cursor))n++;cursor.setDate(cursor.getDate()+1);}return n;};
  const defaultState=()=>({version:1,startedAt:today(),targetDate:addDays(today(),365),studyDaysPerWeek:5,mode:'scope_plus_deep',records:{},retiredIds:{}});
  function load(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(KEY)||'{}'),records:JSON.parse(localStorage.getItem(KEY)||'{}').records||{},retiredIds:JSON.parse(localStorage.getItem(KEY)||'{}').retiredIds||{}};}catch{return defaultState();}}
  let state=load();
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const norm=s=>String(s||'').toLowerCase().trim().replace(/[^a-z ]/g,'');
  function find(word){return catalog?.records.find(x=>norm(x.headword)===norm(word))||null;}
  function ready(item){return item?.card_status==='ready_editor';}
  function dueEntries(){const now=today();return Object.entries(state.records).filter(([id,r])=>!state.retiredIds[id]&&r.dueAt&&r.dueAt<=now).sort((a,b)=>a[1].dueAt.localeCompare(b[1].dueAt));}
  function snapshot(){
    if(!catalog)return null;
    const total=catalog.metadata.record_count, readyCount=catalog.metadata.ready_editor_card_count;
    const introduced=Object.keys(state.records).filter(id=>!state.retiredIds[id]).length;
    const due=dueEntries().length;
    const remainingDays=Math.max(1,studyDaysBetween(today(),state.targetDate));
    const scopeBudget=Math.ceil(Math.max(0,total-introduced)/remainingDays);
    const deepBudget=Math.ceil(Math.max(0,readyCount-introduced)/remainingDays);
    return {total,readyCount,introduced,due,remainingDays,scopeBudget,deepBudget,contentGap:Math.max(0,total-readyCount),targetDate:state.targetDate,mode:state.mode};
  }
  function introduce(word,source='course'){
    const item=find(word); const id=item?.id||`course:${norm(word)}`;
    if(!state.records[id]) state.records[id]={word,source,introducedAt:today(),dueAt:addDays(today(),1),reps:0,lastGrade:'new',ready:ready(item)};
    save(); return id;
  }
  function recordCourseWord(word,grade){
    const id=introduce(word); const r=state.records[id];
    const intervals={review:1,hard:2,good:5,easy:30};
    if(grade==='easy') {state.retiredIds[id]=true;r.lastGrade='easy';r.retiredAt=today();}
    else {r.lastGrade=grade==='review'?'review':grade||'good';r.reps=(r.reps||0)+1;r.dueAt=addDays(today(),intervals[grade]||5);}
    save(); emit(); return snapshot();
  }
  function startCourseWords(words){(words||[]).forEach(w=>introduce(Array.isArray(w)?w[0]:w));save();emit();return snapshot();}
  function restoreAll(){state.retiredIds={};save();emit();}
  function emit(){window.dispatchEvent(new CustomEvent('cijing:vocabulary-update',{detail:snapshot()}));}
  function renderPlan(){
    const host=document.getElementById('vocabSchedulerPanel'); if(!host||!catalog)return;
    const s=snapshot();
    const legacy={daysLeft:document.getElementById('daysLeft'),coreProgress:document.getElementById('coreProgress'),contentSupply:document.getElementById('contentSupply'),annualStatus:document.getElementById('annualStatus')};
    if(legacy.daysLeft) legacy.daysLeft.textContent=`${s.remainingDays} 个学习日`;
    if(legacy.coreProgress) legacy.coreProgress.textContent=`${s.introduced} / ${s.total}`;
    if(legacy.contentSupply) legacy.contentSupply.textContent=`${s.readyCount} / ${s.total}`;
    if(legacy.annualStatus){legacy.annualStatus.classList.add('risk');legacy.annualStatus.innerHTML=`<b>词汇排程已接入。</b> 目前 ${s.readyCount} 条已具备完整精学内容，${s.total-s.readyCount} 条仍待制卡；目标日以前若要全量深学，需要先补齐内容供给。`;}
    const title=s.mode==='scope_plus_deep'?'范围覆盖 + 重点精学':'当前排程';
    host.innerHTML=`<article class="panel vocab-plan-panel"><div class="vocab-plan-head"><div><div class="eyebrow">词汇数据库与排程器</div><h2>${title}</h2><p>每天的词由固定课程顺序与个人复习记录共同决定，绝不随机抽取。</p></div><span class="vocab-state">本机保存</span></div><div class="annual-grid"><div class="annual-stat"><span>课标范围</span><b>${s.total.toLocaleString()} 词</b><span>国家课程标准底表</span></div><div class="annual-stat"><span>可完整精学</span><b>${s.readyCount} 词</b><span>已有词义、搭配和例句</span></div><div class="annual-stat"><span>已进入计划</span><b>${s.introduced} 词</b><span>课程已投放的词</span></div><div class="annual-stat"><span>到期复习</span><b>${s.due} 词</b><span>优先于新增</span></div></div><div class="vocab-budget"><b>到 ${s.targetDate} 的节奏：</b>剩余 ${s.remainingDays} 个学习日。完整范围需每天约 <strong>${s.scopeBudget}</strong> 个新词；目前完整词卡只支持约 <strong>${s.deepBudget}</strong> 个/日。</div><div class="annual-status risk"><b>内容缺口已如实标记。</b> 另有 ${s.contentGap.toLocaleString()} 个范围词还缺义项、搭配、例句和审核，暂不进入“完整精学”。819 条本地候选高频词只用于后续制卡排序，不能当作上海官方词频。</div><div class="vocab-plan-actions"><button class="secondary" id="restoreScheduledWords">恢复“太简单”词</button><small>“太简单”只退出主动复习，不会从 3,099 条范围清单删除。</small></div></article>`;
    document.getElementById('restoreScheduledWords')?.addEventListener('click',()=>{restoreAll();});
  }
  function renderVocabNotice(){
    const root=document.querySelector('#vocab .weekend-head'); if(!root||!catalog||document.getElementById('vocabCatalogStatus'))return;
    const s=snapshot(); const note=document.createElement('div');note.id='vocabCatalogStatus';note.className='vocab-catalog-status';note.innerHTML=`<b>已接入排程：</b>${s.total.toLocaleString()} 条范围词；${s.readyCount} 条可完整精学；${s.due} 条到期复习。其余词先显示为待制卡或快速诊断，不假装成完整词卡。`;root.appendChild(note);
  }
  async function init(){
    try{const response=await fetch('data/vocabulary-catalog-v1.json');if(!response.ok)throw Error();catalog=await response.json();window.CiJingVocabScheduler={snapshot,startCourseWords,recordCourseWord,restoreAll,getCatalog:()=>catalog};renderPlan();renderVocabNotice();emit();
      document.querySelectorAll('[data-view="plan"]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderPlan,0)));
      document.querySelectorAll('[data-view="vocab"]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderVocabNotice,0)));
      window.addEventListener('cijing:vocabulary-update',()=>{renderPlan(); const n=document.getElementById('vocabCatalogStatus');if(n){n.remove();renderVocabNotice();}});
    }catch{console.warn('Vocabulary catalog could not be loaded.');}
  }
  const style=document.createElement('style');style.textContent=`.vocab-plan-panel{margin-bottom:18px}.vocab-plan-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.vocab-plan-head h2{margin:4px 0 8px}.vocab-plan-head p{margin:0;color:var(--muted);line-height:1.65}.vocab-state{white-space:nowrap;border-radius:99px;background:#edf8f2;color:#277457;padding:6px 10px;font-size:.8rem;font-weight:700}.vocab-budget{margin-top:15px;padding:13px 15px;border-radius:12px;background:#f5f9fe;color:#31506c;line-height:1.65}.vocab-budget strong{color:#0a5c98;font-size:1.08em}.vocab-plan-actions{display:flex;gap:12px;align-items:center;margin-top:14px}.vocab-plan-actions small{color:var(--muted);line-height:1.5}.vocab-catalog-status{margin-top:14px;padding:12px 14px;border-left:4px solid #2e78b7;border-radius:0 10px 10px 0;background:#f2f8fe;color:#34526c;line-height:1.6}@media(max-width:640px){.vocab-plan-head{display:block}.vocab-state{display:inline-block;margin-top:10px}.vocab-plan-actions{display:block}.vocab-plan-actions small{display:block;margin-top:10px}}`;document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

