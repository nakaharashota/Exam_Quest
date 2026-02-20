/* script.js */
const JSON_BASE_PATH = 'assets/json/shin4_kanji';
const TOTAL_QUESTIONS = 5;

let currentCategory = '';
let currentMode = localStorage.getItem('shin4_selected_mode') || 'easy';
let currentLevel = 1;
let quizData = [];
let currentIdx = 0;
let correctCount = 0;
let timeLimit = 0;
let timeRemaining = 0;
let timerInterval = null;

window.onload = () => {
    updateCategoryList();
};

function hideAll() {
    ['category-area','level-area','quiz-area','selfcheck-area','score-area'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
}

function showCategory() {
    hideAll();
    document.getElementById('category-area').style.display = 'block';
    updateCategoryList();
}

function changeMode(mode) {
    currentMode = mode;
    localStorage.setItem('shin4_selected_mode', mode);
    updateCategoryList();
}

function getModeName(m) {
    return m==='easy'?'かんたん':m==='normal'?'ふつう':m==='hard'?'むずかしい':'おに';
}

function updateCategoryList() {
    // タブのアクティブ状態をリセット
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'has-star'));
    
    const cats = ['d1', 'd2', 'd3', 'd4', 'd5'];
    
    // 各モード（タブ）に星がつくか判定
    const modes = ['easy', 'normal', 'hard', 'oni'];
    modes.forEach(m => {
        let completedInMode = 0;
        cats.forEach(cat => {
            if (parseInt(localStorage.getItem(`shin4_${cat}_${m}_progress`)) > 5) completedInMode++;
        });
        if (completedInMode === 5) {
            document.getElementById(`tab-${m}`).classList.add('has-star');
        }
    });

    // 現在のタブをアクティブに
    document.getElementById(`tab-${currentMode}`).classList.add('active');

    // カテゴリボタンのLvと星表示
    cats.forEach(cat => {
        const storageKey = `shin4_${cat}_${currentMode}_progress`;
        const unlocked = parseInt(localStorage.getItem(storageKey)) || 1;
        const btn = document.querySelector(`.btn-${cat}`);
        if (btn) {
            const baseNames = {
                'd1': '① 漢字の読み', 'd2': '② 漢字の書き', 'd3': '③ 漢字・語句の使い分け', 'd4': '④ 熟語の意味・使い方', 'd5': '⑤ まぎらわしい語句の使い分け'
            };
            const isCompleted = unlocked > 5;
            const displayLv = isCompleted ? 5 : unlocked;
            btn.innerText = `${baseNames[cat]} [Lv.${displayLv}] ${isCompleted ? '⭐' : ''}`;
        }
    });
}

function selectCategory(cat) {
    currentCategory = cat;
    showLevel();
}

function showLevel() {
    hideAll();
    document.getElementById('level-area').style.display = 'block';
    const titles = { 'd1': '【読み】', 'd2': '【書き】', 'd3': '【使い分け】', 'd4': '【熟語】', 'd5': '【究極】' };
    document.getElementById('level-title').innerText = `${titles[currentCategory]} (${getModeName(currentMode)})`;
    renderLevels();
}

function renderLevels() {
    const btnContainer = document.getElementById('level-buttons');
    btnContainer.innerHTML = '';
    const storageKey = `shin4_${currentCategory}_${currentMode}_progress`;
    const unlockedLevel = parseInt(localStorage.getItem(storageKey)) || 1;
    for(let lv=1; lv<=5; lv++) {
        const btn = document.createElement('button');
        if (lv <= unlockedLevel) {
            btn.className = 'btn-primary';
            btn.innerText = `レベル ${lv} ${unlockedLevel > lv || (lv === 5 && unlockedLevel > 5) ? '⭐' : ''}`;
            btn.onclick = () => loadStage(lv);
        } else {
            btn.className = 'btn-locked';
            btn.innerText = `レベル ${lv}`;
            btn.onclick = () => alert("前のレベルを「満点」でクリアしてね！");
        }
        btnContainer.appendChild(btn);
    }
}

async function loadStage(level) {
    currentLevel = level;
    const filePath = `${JSON_BASE_PATH}/stage_${currentCategory}.json`;
    try {
        const response = await fetch(filePath);
        const data = await response.json();
        const levelData = data.levels.find(l => l.level == level);
        quizData = levelData.questions.sort(() => 0.5 - Math.random()).slice(0, TOTAL_QUESTIONS);
        currentIdx = 0; correctCount = 0;
        hideAll();
        document.getElementById('quiz-area').style.display = 'block';
        clearInterval(timerInterval);
        const limits = { 'easy': 0, 'normal': 75, 'hard': 50, 'oni': 25 };
        timeLimit = limits[currentMode];
        if (timeLimit > 0) {
            timeRemaining = timeLimit;
            document.querySelector('.timer-container').style.display = 'block';
            startTimer();
        } else {
            document.querySelector('.timer-container').style.display = 'none';
        }
        loadQuestion();
    } catch (e) { alert("データの読み込みに失敗しました。"); }
}

function startTimer() {
    const bar = document.getElementById('timer-bar');
    bar.style.width = "100%";
    bar.style.backgroundColor = "#34a853";
    timerInterval = setInterval(() => {
        timeRemaining -= 0.1;
        let percent = (timeRemaining / timeLimit) * 100;
        if (percent <= 0) {
            clearInterval(timerInterval);
            alert("タイムアップ！満点ならず...");
            finishQuiz();
        }
        bar.style.width = percent + "%";
        if (percent < 25) bar.style.backgroundColor = "#d93025";
        else if (percent < 50) bar.style.backgroundColor = "#f4b400";
    }, 100);
}

function loadQuestion() {
    const current = quizData[currentIdx];
    document.getElementById('progress').innerText = `${currentIdx + 1} / ${TOTAL_QUESTIONS}`;
    document.getElementById('feedback').style.display = 'none';
    const choicesArea = document.getElementById('choices-area');
    const nextBtn = document.getElementById('next-btn');
    choicesArea.innerHTML = '';

    if (currentCategory !== 'd2') {
        document.getElementById('guide').innerText = "正しいものを選んでね！";
        document.getElementById('question').innerText = current.q;
        nextBtn.style.display = 'none';
        [...current.choices].sort(() => 0.5 - Math.random()).forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerText = choice;
            btn.onclick = () => {
                Array.from(document.getElementsByClassName('choice-btn')).forEach(b => b.disabled = true);
                const feedback = document.getElementById('feedback');
                const resultText = document.getElementById('result-text');
                if (choice === current.a) {
                    resultText.innerHTML = "⭕ 正解！";
                    feedback.className = "feedback correct";
                    correctCount++;
                } else {
                    let msg = `❌ 残念！ 正解は「${current.a}」`;
                    if (current.explanation) msg += `<br><div class="explanation-text">${current.explanation}</div>`;
                    resultText.innerHTML = msg;
                    feedback.className = "feedback wrong";
                }
                feedback.style.display = 'block';
                nextBtn.style.display = 'block';
            };
            choicesArea.appendChild(btn);
        });
    } else {
        document.getElementById('guide').innerText = "ノートに漢字を書いてね！";
        document.getElementById('question').innerText = current.q.replace('（　）', `（ ${current.k || ''} ）`);
        nextBtn.style.display = 'block';
    }
}

document.getElementById('next-btn').onclick = () => {
    currentIdx++;
    if (currentIdx < quizData.length) loadQuestion();
    else finishQuiz();
};

function finishQuiz() {
    clearInterval(timerInterval);
    hideAll();
    if (currentCategory === 'd2') showSelfCheck();
    else showScore(correctCount * 20);
}

function showSelfCheck() {
    const listEl = document.getElementById('answer-list');
    listEl.innerHTML = '';
    quizData.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'answer-item';
        div.innerHTML = `<strong>${idx+1}.</strong> ${item.q.replace('（　）', `（${item.k}）`)} → <span style="color:#d93025; font-weight:bold;">${item.a}</span>`;
        listEl.appendChild(div);
    });
    document.getElementById('selfcheck-area').style.display = 'block';
}

function submitSelfScore() { showScore(document.getElementById('self-count').value * 20); }

function showScore(finalScore) {
    hideAll();
    document.getElementById('score-area').style.display = 'block';
    document.getElementById('final-score').innerText = `${finalScore} 点`;
    const clearMsg = document.getElementById('clear-msg');
    const nextLvBtn = document.getElementById('next-lv-btn');
    
    if (finalScore === 100) {
        if (currentLevel < 5) {
            clearMsg.innerHTML = "🌟 パーフェクト！<br>満点合格！次のレベルが開放されたよ！";
            nextLvBtn.style.display = 'block';
            const storageKey = `shin4_${currentCategory}_${currentMode}_progress`;
            if (currentLevel >= (parseInt(localStorage.getItem(storageKey)) || 1)) {
                localStorage.setItem(storageKey, currentLevel + 1);
            }
        } else {
            clearMsg.innerHTML = "🏆【全レベル制覇】🏆<br>" + getModeName(currentMode) + "を極めたね！<br>この調子で他の修行もがんばろう！";
            nextLvBtn.style.display = 'none';
            localStorage.setItem(`shin4_${currentCategory}_${currentMode}_progress`, 6);
        }
    } else {
        clearMsg.innerHTML = "満点クエストは100点のみ合格だよ！<br>あきらめずに、もう一度挑戦だ！";
        nextLvBtn.style.display = 'none';
    }
    document.getElementById('retry-btn').onclick = () => loadStage(currentLevel);
    nextLvBtn.onclick = () => loadStage(currentLevel + 1);
    updateCategoryList();
}

function resetData() { if(confirm('進捗をリセットしますか？')) { localStorage.clear(); location.reload(); } }