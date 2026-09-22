(() => {
  const bank = {
    c1:{prompt:'补全变式句：The club ___ its members ___ a guide.',answer:'provides; with',accepted:['provides with','provides its members with'],explain:'核心是 provide sb with sth。先放“提供者＋对象”，再用 with 引出所提供的内容。'},
    c2:{prompt:'补全变式句：The club ___ its members ___ a guide.',answer:'provides; with',accepted:['provides with','provides its members with'],explain:'provide sb with sth 中的 with 不能换成 to。'},
    c3:{prompt:'填入最合适的词：The survey ___ what students need most.',answer:'reflects',accepted:['reflects'],explain:'reflect 在此表示“反映、体现”。主语是单数 survey，动词用 reflects。'},
    c4:{prompt:'填入正确形式：If I ___ more time, I would read the whole report. (have)',answer:'had',accepted:['had'],explain:'这是与现在事实相反的假设；if 从句用过去式 had。'},
    c5:{prompt:'填入最合适的动词：Students can ___ useful skills through regular practice.',answer:'acquire',accepted:['acquire'],explain:'acquire 常指经过过程逐步获得的知识或技能。'},
    c6:{prompt:'选择正确词形：A lack of sleep may ___ students’ concentration.',answer:'affect',accepted:['affect'],explain:'这里需要动词“影响”，affect 是动词；effect 常作名词。'},
    c7:{prompt:'补全结构：Not only did she explain the rule, ___ she gave an example.',answer:'but',accepted:['but'],explain:'not only 与 but also 对应；后半句中的 also 可省略。'},
    c8:{prompt:'指出 which 所修饰的名词：The book, which won a prize, became popular.',answer:'The book',accepted:['the book','book'],explain:'逗号提示非限制性定语从句，which 回指前面的 book。'}
  };
  const normalise = value => String(value || '').toLowerCase().replace(/[\s，,。；;：:！!？?（）()“”"'’]/g, '');
  const extras = ['completionPanel','dailyQuiz','dailyReview'];
  const completedCards = () => state.dailyPlan.ids.map(id => cards.find(card => card.id === id)).filter(card => card && state.completed.includes(card.id));
  const testItems = () => {
    const used = new Set();
    return completedCards().filter(card => { const key = wordOf(card) || card.id; if (used.has(key)) return false; used.add(key); return true; }).slice(0, 5).map(card => ({ id: card.id, card, ...(bank[card.id] || { prompt: '闭卷回忆：请写出今天这项“' + card.type + '”训练的核心答案。', answer: card.answer, accepted: [card.answer], explain: '这是对今天内容的提取练习。核对答案后，回到原卡说明理解原因。' }) }));
  };
  const hideExtras = () => { extras.forEach(id => document.getElementById(id).classList.remove('show')); document.getElementById('studyCard').classList.remove('hidden'); document.getElementById('studyFooter').classList.remove('hidden'); };
  const testState = () => state.dailyTest && state.dailyTest.date === today() ? state.dailyTest : { date: today(), completedAt: null, results: {} };
  function showCompletion() {
    hideExtras(); document.getElementById('studyCard').classList.add('hidden'); document.getElementById('studyFooter').classList.add('hidden'); document.getElementById('completionPanel').classList.add('show');
    const done = completedCards(); const weak = done.filter(card => ['again','hard'].includes(state.cards[card.id]?.lastGrade)).length; const tested = Boolean(testState().completedAt);
    document.getElementById('queueLabel').textContent = '今日任务完成'; document.getElementById('minutesLabel').textContent = tested ? '已完成今日小测' : '下一步：5 分钟闭卷小测';
    document.getElementById('completionSummary').textContent = tested ? '已完成 ' + done.length + ' 项学习与今日小测；' + weak + ' 项学习阶段标记为需要巩固。现在可回顾今天的记录。' : '已完成 ' + done.length + ' 项学习；' + weak + ' 项在学习阶段标记为需要巩固。用一组换问法的小测确认是否真的会用。';
    document.getElementById('startDailyQuizBtn').textContent = tested ? '查看今日小测结果' : '开始 5 分钟今日小测';
  }
  function showQuiz() {
    hideExtras(); document.getElementById('studyCard').classList.add('hidden'); document.getElementById('studyFooter').classList.add('hidden'); document.getElementById('dailyQuiz').classList.add('show');
    const items = testItems(), prior = testState().results || {}; document.getElementById('quizTotal').textContent = items.length;
    document.getElementById('quizItems').innerHTML = items.length ? items.map((item, index) => {
      const result = prior[item.id]; const safe = (result?.answer || '').replace(/"/g, '&quot;');
      return '<div class="quiz-item"><b>' + (index + 1) + '. ' + item.prompt + '</b><input data-quiz-id="' + item.id + '" aria-label="第 ' + (index + 1) + ' 题答案" value="' + safe + '" placeholder="写下答案后再提交">' + (result ? '<div class="quiz-result show ' + (result.correct ? 'correct' : 'wrong') + '"><b>' + (result.correct ? '答对了。' : '待巩固。') + '</b> 参考答案：' + item.answer + '<br>' + item.explain + '</div>' : '') + '</div>';
    }).join('') : '<p>今天还没有可用于小测的完成项目。</p>';
    document.getElementById('submitDailyQuizBtn').classList.toggle('hidden', !items.length);
  }
  function submitQuiz() {
    const items = testItems(); if (!items.length) return; const results = {}; let wrong = 0;
    items.forEach(item => { const answer = document.querySelector('[data-quiz-id="' + item.id + '"]').value.trim(); const norm = normalise(answer); const correct = item.accepted.some(accepted => norm === normalise(accepted) || norm.includes(normalise(accepted))); results[item.id] = { answer, correct }; if (!correct) { wrong += 1; const before = state.cards[item.id] || { reps: 0, interval: 1 }; state.cards[item.id] = { ...before, due: new Date(Date.now() + 86400000).toISOString(), lastGrade: 'test_again' }; } });
    state.dailyTest = { date: today(), completedAt: new Date().toISOString(), results }; save(); showQuiz(); updateHome(); renderAnnualPlan(); toast(wrong ? wrong + ' 项已排入明天优先复习' : '小测全部通过，按原复习节奏继续');
  }
  function showReview() {
    hideExtras(); document.getElementById('studyCard').classList.add('hidden'); document.getElementById('studyFooter').classList.add('hidden'); document.getElementById('dailyReview').classList.add('show');
    const done = completedCards(), results = testState().results || {}, testWrong = Object.values(results).filter(result => !result.correct).length, learnWeak = done.filter(card => ['again','hard'].includes(state.cards[card.id]?.lastGrade)).length;
    document.getElementById('reviewDoneCount').textContent = done.length; document.getElementById('reviewWeakCount').textContent = learnWeak + testWrong; document.getElementById('reviewTomorrowCount').textContent = testWrong;
    document.getElementById('dailyReviewList').innerHTML = done.length ? done.map(card => { const history = [...state.history].reverse().find(row => row.id === card.id); const test = results[card.id]; const status = test ? (test.correct ? '小测：答对' : '小测：明日优先复习') : (history?.grade === 'hard' || history?.grade === 'again' ? '学习阶段：需要巩固' : '学习阶段：已安排复习'); return '<article class="review-entry"><b>' + card.type + ' · ' + status + '</b><div class="review-prompt">' + card.prompt + '</div><small>参考答案：' + card.answer + '</small><small>' + card.explain + '</small></article>'; }).join('') : '<div class="empty"><strong>还没有可回顾的学习记录。</strong></div>';
  }
  const originalRenderStudy = renderStudy;
  renderStudy = function() { if (previewDay2) return originalRenderStudy(); if (!queue().length) return showCompletion(); hideExtras(); return originalRenderStudy(); };
  document.getElementById('startDailyQuizBtn').addEventListener('click', showQuiz); document.getElementById('openDailyReviewBtn').addEventListener('click', showReview); document.getElementById('submitDailyQuizBtn').addEventListener('click', submitQuiz); document.getElementById('backFromQuizBtn').addEventListener('click', showCompletion); document.getElementById('backFromReviewBtn').addEventListener('click', showCompletion);
  renderStudy();
})();
