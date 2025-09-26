let allQuestions = [];
let currentIndex = 0;
let incorrectCount = 0;
let waitingForEnter = true;
let currentSection = 1;
let displaySection = 1;
let sectionQuestions = [];
let history = [];

let totalStartTime;
let totalElapsedTime = 0;
let isTimerRunning = false;

let isRandomMode = false;

const correctSound = document.getElementById("correct-sound");
const answerInput = document.getElementById("answer-input");
const feedbackImage = document.getElementById("feedback-image");
const mistakeIcons = document.querySelectorAll(".mistake-icon");
const loaderScreen = document.getElementById("loader-screen");
const quizScreen = document.getElementById("quiz-screen");
const endScreen = document.getElementById("end-screen");

// ==================== 初期ロード ====================
window.addEventListener("DOMContentLoaded", () => {
  // デバイス規定のダークモード判定
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add("dark");
  }

  // 初期ロード後にトランジションを有効化（ロード時のチラつき防止）
  setTimeout(() => {
    document.body.classList.add("transition-enabled");
    document.getElementById("loader-screen").classList.add("transition-enabled");
    document.getElementById("settings-screen").classList.add("transition-enabled");
    document.getElementById("quiz-screen").classList.add("transition-enabled");
    document.getElementById("input-area").classList.add("transition-enabled");
    document.getElementById("top-bar").classList.add("transition-enabled");
    document.querySelectorAll("input, button, #csvLoaderLabel").forEach(el => {
      el.classList.add("transition-enabled");
    });
  }, 50);

  // ダークモード切替ボタン初期アイコン設定
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  darkModeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    darkModeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });
});

// ==================== CSV読み込み ====================
document.getElementById("csvLoader").addEventListener("change", e => {
  const files = Array.from(e.target.files);
  const readers = files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  }));

  Promise.all(readers).then(contents => {
    contents.forEach(csv => {
      const lines = csv.split("\n").map(l => l.trim()).filter(l => l);
      const id = lines[0].split(",")[0];
      lines.slice(2).forEach(line => {
        const [num, q, a, cat, subj, unit] = line.split(",");
        allQuestions.push({ id, num, q, a, cat, subj, unit, key: `${id}_Q${num}` });
      });
    });

    // 設定画面表示
    loaderScreen.style.display = "none";
    document.getElementById("maker-link").style.display = "none";
    document.getElementById("settings-screen").style.display = "block";

    // 出題範囲初期化
    document.getElementById("startRange").value = 1;
    document.getElementById("endRange").value = allQuestions.length;
    document.getElementById("startRange").min = 1;
    document.getElementById("endRange").max = allQuestions.length;
  });
});

// ==================== 出題範囲移動 ====================
document.getElementById("startRange").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("endRange").focus();
  }
});
document.getElementById("endRange").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("startQuizButton").click();
  }
});

// ==================== 開始ボタン ====================
document.getElementById("startQuizButton").addEventListener("click", () => {
  isRandomMode = document.getElementById("randomModeCheckbox").checked;
  let start = parseInt(document.getElementById("startRange").value, 10);
  let end = parseInt(document.getElementById("endRange").value, 10);

  if (isNaN(start) || start < 1) start = 1;
  if (isNaN(end) || end > allQuestions.length) end = allQuestions.length;

  start = start - 1;
  allQuestions = allQuestions.slice(start, end);

  document.getElementById("settings-screen").style.display = "none";
  quizScreen.style.display = "block";

  totalStartTime = performance.now();
  startTotalTimer();
  prepareSection(currentSection);
  showSectionIntro();
});

// ==================== タイマー ====================
function startTotalTimer() {
  isTimerRunning = true;
  totalStartTime = performance.now() - totalElapsedTime;

  function update() {
    if (!isTimerRunning) return;
    totalElapsedTime = performance.now() - totalStartTime;

    const elapsed = totalElapsedTime;
    const sec = Math.floor(elapsed / 1000);
    const cs = Math.floor((elapsed % 1000) / 10);

    document.getElementById("timer").textContent =
      `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function stopTotalTimer() {
  isTimerRunning = false;
}

// ==================== セクション準備 ====================
function shuffle(array) {
  for (let i=array.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function prepareSection(section) {
  if (section === 1) sectionQuestions = [...allQuestions];
  else if (section === 2) sectionQuestions = history.filter(h => h.section===1 && h.incorrect>=3).map(h=>h.q);
  else if (section === 3) {
    const from1 = history.filter(h=>h.section===1 && h.incorrect<3).map(h=>h.q.key);
    const from2 = history.filter(h=>h.section===2 && h.incorrect>=3).map(h=>h.q.key);
    sectionQuestions = allQuestions.filter(q => from1.includes(q.key) || from2.includes(q.key));
  } else if (section === 4) {
    const s1ok = new Set(history.filter(h=>h.section===1 && h.incorrect<3).map(h=>h.q.key));
    const s3ok = new Set(history.filter(h=>h.section===3 && h.incorrect<3).map(h=>h.q.key));
    sectionQuestions = allQuestions.filter(q => !(s1ok.has(q.key) && s3ok.has(q.key)));
  } else sectionQuestions = [];

  if (isRandomMode && sectionQuestions.length>1) shuffle(sectionQuestions);
  currentIndex = 0;
}

// ==================== セクション導入 ====================
function showSectionIntro() {
  stopTotalTimer();
  document.getElementById("question-area").textContent =
    `第${displaySection}セクション (${sectionQuestions.length}問)`;
  document.getElementById("progress").textContent = "";
  answerInput.value = "";
  answerInput.disabled = true;
  waitingForEnter = true;
  displaySection++;

  const handleClick = () => {
    if (waitingForEnter) {
      waitingForEnter = false;
      document.removeEventListener("click", handleClick);
      showQuestion();
    }
  };
  document.addEventListener("click", handleClick);
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && waitingForEnter) {
    waitingForEnter = false;
    showQuestion();
  }
});

// ==================== 問題表示 ====================
function showQuestion() {
  if (currentIndex >= sectionQuestions.length) {
    currentSection++;
    prepareSection(currentSection);
    showSectionIntro();
    return;
  }

  startTotalTimer();

  const q = sectionQuestions[currentIndex];
  document.getElementById("question-number").textContent = `${q.id}-Q${q.num}`;
  document.getElementById("question-area").textContent = q.q;
  document.getElementById("category").textContent = `分類: ${q.cat}`;
  document.getElementById("subject").textContent = `教科: ${q.subj}`;
  document.getElementById("unit").textContent = `単元: ${q.unit}`;
  document.getElementById("answer-display").textContent = "";
  document.getElementById("progress").textContent =
    `${currentIndex+1} / ${sectionQuestions.length}`;
  feedbackImage.style.opacity = 0;
  mistakeIcons.forEach(icon => icon.classList.remove("active"));
  answerInput.value = "";
  answerInput.disabled = false;
  incorrectCount = 0;
  answerInput.focus({ preventScroll:true });
}

// ==================== 回答処理 ====================
function showFeedback(type, answerText) {
  feedbackImage.style.backgroundImage = `url('main/${type==="correct"?"maru":"batsu"}.png')`;
  feedbackImage.style.opacity = "1";

  if (type==="correct" || incorrectCount>=3) {
    document.getElementById("answer-display").textContent = `答え: ${answerText}`;
    answerInput.disabled = true;
    const q = sectionQuestions[currentIndex];
    history.push({ q, section: currentSection, incorrect: incorrectCount });
    setTimeout(()=>{ currentIndex++; showQuestion(); }, 1000);
  }
}

answerInput.addEventListener("keydown", e => {
  if (e.key==="Enter" && !answerInput.disabled) {
    const q = sectionQuestions[currentIndex];
    const input = answerInput.value.trim();
    if (input === q.a.trim()) {
      correctSound.play();
      showFeedback("correct", q.a);
    } else {
      incorrectCount++;
      new Audio("main/Quiz-Buzzer02-2(Short).mp3").play();
      if (incorrectCount <= 3) mistakeIcons[incorrectCount-1].classList.add("active");
      answerInput.value = "";
      if (incorrectCount>=3) showFeedback("wrong", q.a);
    }
  }
});
