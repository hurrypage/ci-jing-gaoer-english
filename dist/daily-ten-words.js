(() => {
  'use strict';
  const data=window.CiJingCourseData;
  if(!data)return;
  const extras=[
    [['access','获得使用机会','have access to','Students have access to a digital library.'],['adapt','适应','adapt to change','Students adapt to new study routines.'],['adequate','足够的','adequate for','The evidence is adequate for a careful conclusion.'],['analysis','分析','an analysis of','The report gives an analysis of the results.']],
    [['alternative','替代方案','an alternative to','The school considered an alternative to printed notices.'],['annual','每年的','annual report','The annual report compares results.'],['apparent','明显的','be apparent that','It is apparent that attendance changed.'],['apply','应用','apply A to B','Apply the rule to this sentence.']],
    [['authority','权威机构','according to an authority','According to the authority, the rule has changed.'],['aware','意识到的','be aware of','Be aware of the limit of the evidence.'],['beneficial','有益的','be beneficial to','Regular reading is beneficial to students.'],['challenge','挑战','face a challenge','Students may face a challenge when writing.']],
    [['context','语境','in context','Read the word in context.'],['contrast','对比','in contrast','In contrast, the other group did not improve.'],['criteria','标准','meet the criteria','The answer must meet the criteria.'],['data','数据','collect data','The school collected data from both groups.']],
    [['interpret','解释','interpret the data','Do not interpret the data too quickly.'],['involve','涉及','involve doing','The task involves comparing two groups.'],['method','方法','a method of','This is a method of checking evidence.'],['objective','客观的','an objective result','The result needs objective evidence.']]
  ];
  const css=document.createElement('style');
  css.textContent=`.ten-word-pack{margin:18px 0;padding:18px;border:1px solid #cfe0ef;border-radius:16px;background:#f7fbff}.ten-word-pack h3{margin:0;color:#113d65}.ten-word-pack>p{color:#55728c;line-height:1.6}.ten-word-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.ten-word-card{padding:13px;border-radius:12px;border:1px solid #d8e6f2;background:#fff}.ten-word-card b{color:#093a68;font-size:1.1rem}.ten-word-card p{margin:6px 0;color:#38566f}.ten-word-card small{display:block;color:#637e96;line-height:1.55}.ten-word-card button{margin-top:10px;padding:7px 9px;border:1px solid #aec9dd;border-radius:8px;background:#fff;color:#164b77;font:inherit;cursor:pointer}.ten-word-card button.done{background:#eaf8f0;border-color:#a5d8bd;color:#286145}@media(max-width:720px){.ten-word-grid{grid-template-columns:1fr}.ten-word-pack{padding:15px}}`;
  document.head.appendChild(css);
  const stateKey='ci-jing-week1-v3';
  const state=()=>{try{return {...{status:{}},...JSON.parse(localStorage.getItem(stateKey)||'{}')}}catch{return{status:{}}}};
  const save=s=>localStorage.setItem(stateKey,JSON.stringify(s));
  const currentDay=()=>{const m=document.querySelector('.lesson-banner .eyebrow')?.textContent.match(/第\s*(\d+)\s*天/);return m?Math.max(0,Math.min(4,+m[1]-1)):0;};
  let sixthNextHandler=null;
  function renderExtraWord(day,index){
    const word=extras[day][index],number=index+7,id='extra-'+day+'-'+index,s=state(),done=s.status[id]==='good';
    const stage=document.getElementById('wordStage'),count=document.getElementById('wordCount');
    if(!stage||!count)return;
    count.textContent=number+' / 10';
    stage.innerHTML=`<div class="word-stage"><article class="focus-card"><div class="focus-word">${word[0]}</div><div class="phonetic">语境词卡 · 第 ${number} 词</div><span class="pos">词汇学习</span><div class="card-details"><div class="core-meaning">${word[1]}</div><div class="family">今天与前面词卡共同构成一组 10 词学习</div></div></article><aside class="study-side"><div class="purpose">先读搭配和例句，再判断自己能否在新句子中认出这个词的用法。</div><div class="colloc-box"><b>核心搭配</b>${word[2]}</div><div class="sentence-box">语境例句：${word[3].replace(new RegExp(word[0],'i'),x=>'<mark>'+x+'</mark>')}</div><div class="context-note"><b>语境提示：</b>不要只背中文义，把词放回例句中确认它承担的意思。</div></aside></div><div class="word-nav"><div class="word-dots">${Array.from({length:10},(_,n)=>`<button class="${n===number-1?'active':''}" aria-label="第 ${n+1} 词" disabled></button>`).join('')}</div><button id="directDone" class="${done?'selected':''}">${done?'✓ 已进入复习':'已完成语境判断'}</button><button class="primary" id="directNext">${index===3?'进入搭配与语法':'下一词 →'}</button></div>`;
    document.getElementById('directDone').onclick=()=>{const now=state();now.status[id]='good';save(now);window.CiJingVocabScheduler?.recordCourseWord(word[0],'good');renderExtraWord(day,index);};
    document.getElementById('directNext').onclick=()=>{if(index<3){renderExtraWord(day,index+1);document.querySelector('.studio')?.scrollIntoView({behavior:'smooth',block:'start'});return;}sixthNextHandler?.();};
  }
  function enterDirectTenWordFlow(button){sixthNextHandler=button.onclick;renderExtraWord(currentDay(),0);document.querySelector('.studio')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function syncLabels(){
    const s=state(),done=Array.isArray(s.done)?s.done.length:0;
    const hero=document.querySelector('.course-hero p');
    if(hero){hero.textContent=done>=5?'本周已积累 50 个词汇、20 个固定搭配、10 个语法语境点和 5 次篇章训练。':'每天固定完成：10 个词汇、4 个固定搭配、2 个语法语境点、1 段完整篇章和 4 题闭卷验证。';}
    document.querySelectorAll('.course-day small').forEach(x=>{if(/6词/.test(x.textContent))x.textContent='10词 · 4搭配 · 1篇';});
    const chips=document.querySelectorAll('.progress-chip');
    if(chips[0]&&/词汇/.test(chips[0].textContent))chips[0].textContent=(done*10)+' / 50 词汇';
    const count=document.getElementById('wordCount');
    if(count&&/\/ 6$/.test(count.textContent))count.textContent=count.textContent.replace(' / 6',' / 10');
    document.querySelectorAll('.completion-card p').forEach(p=>{if(p.textContent.includes('6 个词汇'))p.innerHTML='<b>你今天完成了：</b>10 个词汇、4 组独立搭配卡、2 个语法语境点、1 段完整材料和 4 题闭卷验证。';});
    const sunday=document.querySelector('#sundayBody');
    if(sunday&&(/词汇复习<\/span><b>6/.test(sunday.innerHTML)||sunday.textContent.includes('先进行 6 个词汇')))sunday.innerHTML=sunday.innerHTML.replace(/词汇复习<\/span><b>6/g,'词汇复习</span><b>10').replace(/先进行 6 个词汇/g,'先进行 10 个词汇');
  }
  const observer=new MutationObserver(()=>{
    const banner=document.querySelector('.lesson-banner p');
    const bannerText='在同一条词汇工作台中顺序完成今天的 10 个词，再进入搭配、语法、篇章和闭卷验证。';
    if(banner&&banner.textContent!==bannerText)banner.textContent=bannerText;
    const title=document.querySelector('.studio-top h3'),titleText='今天的 10 个词';if(title&&title.textContent!==titleText)title.textContent=titleText;
    syncLabels();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  syncLabels();
  document.addEventListener('click',event=>{
    const button=event.target.closest('#next'),count=document.getElementById('wordCount');
    if(!button||!count||!/^6\s*\/\s*10/.test(count.textContent))return;
    event.preventDefault();event.stopImmediatePropagation();enterDirectTenWordFlow(button);
  },true);
  // 空答与包含式误判均不允许进入“完成当天”。学生可核对答案后修正再提交。
  document.addEventListener('click',event=>{
    const button=event.target.closest('#submitDay');if(!button)return;
    const fields=[...document.querySelectorAll('#rest [data-answer]')];
    if(!fields.length)return;
    const normalize=x=>String(x||'').trim().toLowerCase().replace(/[.，。\s]/g,'');
    const invalid=fields.find(field=>normalize(field.value)!==normalize(field.dataset.answer));
    if(!invalid)return;
    event.preventDefault();event.stopImmediatePropagation();
    const box=document.getElementById('feedback');
    box.className='feedback show bad';
    box.innerHTML='<b>请先完成并修正 4 道闭卷验证题。</b><br>本次没有把当天标为完成，也没有虚增学习进度。参考答案：'+fields.map((field,i)=>(i+1)+'. '+field.dataset.answer).join('；');
    invalid.focus();
  },true);
})();
