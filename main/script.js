// main/script.js（置き換え用：セクションロジックを元に戻し、現在の機能を統合）
let allQuestions = [];
let currentIndex = 0;
let incorrectCount = 0;
let waitingForEnter = true;
let currentSection = 1;
let displaySection = 1;
let sectionQuestions = [];
let history = [];
let A_set = new Set();
let B_set = new Set();

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

// 安全に存在チェック（HTMLが未配置でもエラーにならないよう）
const makerLinkEl = document.getElementById("maker-link");
const randomModeCheckbox = document.getElementById("randomModeCheckbox");
const startRangeEl = document.getElementById("startRange");
const endRangeEl = document.getElementById("endRange");
const startQuizButton = document.getElementById("startQuizButton");

window.addEventListener("DOMContentLoaded", () => {
  // デバイス規定のモードで初期化
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }

  // トランジション有効化（ロード直後に付けるとチラつくので setTimeout）
  setTimeout(() => {
    document.body.classList.add("transition-enabled");
    document.querySelectorAll(
      "#loader-screen, #settings-screen, #quiz-screen, #input-area, #top-bar, input, button, #csvLoaderLabel"
    ).forEach(el => el.classList.add("transition-enabled"));
  }, 50);

  // ダークモード切替ボタン
  const toggle = document.getElementById("dark-mode-toggle");
  if (toggle) {
    toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
  }
});


// ===== CSV読み込み =====
document.getElementById("csvLoader").addEventListener("change", e => {
  // ランダムモードのチェックは開始前に反映する意図ならここ不要だが
  // （UIで即時反映したい場合は有効）
  // isRandomMode = randomModeCheckbox && randomModeCheckbox.checked;

  const files = Array.from(e.target.files || []);
  const readers = files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  }));

  Promise.all(readers).then(contents => {
    contents.forEach(csv => {
      // split 改行→trim→空行除去
      const lines = csv.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 3) return; // 最低限のフォーマットを満たさないならスキップ
      const id = lines[0].split(",")[0];
      lines.slice(2).forEach(line => {
        const cols = line.split(",");
        // 列数不足でも壊れないように安全に取り出す
        const num = cols[0] || "";
        const q = cols[1] || "";
        const a = cols[2] || "";
        const cat = cols[3] || "";
        const subj = cols[4] || "";
        const unit = cols[5] || "";
        allQuestions.push({ id, num, q, a, cat, subj, unit, key: `${id}_Q${num}` });
      });
    });

    // loader を隠して設定画面を表示（maker link は非表示に）
    if (loaderScreen) loaderScreen.style.display = "none";
    if (makerLinkEl) makerLinkEl.style.display = "none";
    const settings = document.getElementById("settings-screen");
    if (settings) settings.style.display = "block";

    // 出題範囲初期値（1始まり）
    if (startRangeEl) {
      startRangeEl.value = 1;
      startRangeEl.min = 1;
    }
    if (endRangeEl) {
      endRangeEl.value = Math.max(1, allQuestions.length);
      endRangeEl.max = Math.max(1, allQuestions.length);
    }
  }).catch(err => {
    console.error("CSV読み込みエラー:", err);
    alert("CSVの読み込みに失敗しました。Consoleを確認してください。");
  });
});

// ===== 範囲入力の Enter 操作（start→end→開始） =====
if (startRangeEl) {
  startRangeEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (endRangeEl) endRangeEl.focus();
    }
  });
}
if (endRangeEl) {
  endRangeEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (startQuizButton) startQuizButton.click();
    }
  });
}

// ===== 開始ボタン =====
if (startQuizButton) {
  startQuizButton.addEventListener("click", () => {
    isRandomMode = randomModeCheckbox && randomModeCheckbox.checked;

    let start = parseInt(startRangeEl && startRangeEl.value, 10);
    let end = parseInt(endRangeEl && endRangeEl.value, 10);

    if (isNaN(start) || start < 1) start = 1;
    if (isNaN(end) || end > allQuestions.length) end = allQuestions.length;
    if (end < start) end = start;

    // 1始まり → 0始まりに変換して slice
    const zeroStart = start - 1;
    allQuestions = allQuestions.slice(zeroStart, end);

    // 実行前にセクション等リセット
    currentSection = 1;
    displaySection = 1;
    history = [];
    A_set.clear();
    B_set.clear();
    currentIndex = 0;
    totalElapsedTime = 0;

    const settings = document.getElementById("settings-screen");
    if (settings) settings.style.display = "none";
    if (quizScreen) quizScreen.style.display = "block";

    totalStartTime = performance.now();
    startTotalTimer();
    prepareSection(currentSection);
    showSectionIntro();
  });
}

// ===== タイマー（requestAnimationFrame版） =====
function startTotalTimer() {
  isTimerRunning = true;
  totalStartTime = performance.now() - totalElapsedTime;

  function tick() {
    if (!isTimerRunning) return;
    totalElapsedTime = performance.now() - totalStartTime;

    const sec = Math.floor(totalElapsedTime / 1000);
    const cs = Math.floor((totalElapsedTime % 1000) / 10);

    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    const cc = String(cs).padStart(2, "0");

    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.textContent = `${mm}:${ss}.${cc}`;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function stopTotalTimer() {
  isTimerRunning = false;
}

// ===== シャッフル =====
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ===== prepareSection（元ロジックを復元） =====
function prepareSection(section) {
  if (section === 1) {
    sectionQuestions = [...allQuestions];

  } else if (section === 2) {
    sectionQuestions = history.filter(h => h.section === 1 && h.incorrect >= 3).map(h => h.q);

  } else if (section === 3) {
    const from1 = history.filter(h => h.section === 1 && h.incorrect < 3).map(h => h.q.key);
    const from2 = history.filter(h => h.section === 2 && h.incorrect >= 3).map(h => h.q.key);
    sectionQuestions = allQuestions.filter(q => from1.includes(q.key) || from2.includes(q.key));

  } else if (section === 4) {
    const s1ok = new Set(history.filter(h => h.section === 1 && h.incorrect < 3).map(h => h.q.key));
    const s3ok = new Set(history.filter(h => h.section === 3 && h.incorrect < 3).map(h => h.q.key));
    sectionQuestions = allQuestions.filter(q => !(s1ok.has(q.key) && s3ok.has(q.key)));

  } else if (section === 5) {
    const s1to4 = [1, 2, 3, 4].map(sec =>
      new Set(history.filter(h => h.section === sec && h.incorrect >= 3).map(h => h.q.key))
    );
    const s4ok = new Set(history.filter(h => h.section === 4 && h.incorrect < 3).map(h => h.q.key));

    A_set.clear();
    B_set.clear();

    allQuestions.forEach(q => {
      const key = q.key;
      const wrong123 = s1to4[0].has(key) && s1to4[1].has(key) && s1to4[2].has(key);
      const wrong4 = s1to4[3].has(key);
      const corrected4 = wrong123 && s4ok.has(key);
      if ((wrong4 && !wrong123) || corrected4) A_set.add(key);
      if (wrong123 && wrong4) B_set.add(key);
    });

    sectionQuestions = allQuestions.filter(q => A_set.has(q.key) || B_set.has(q.key));

  } else if (section % 2 === 0) {
    const prev = history.filter(h => h.section === section - 1);
    const wrongs = prev.filter(h => h.incorrect >= 3).map(h => h.q);
    const corrects = prev.filter(h => h.incorrect < 3).map(h => h.q);
    wrongs.forEach(q => B_set.add(q.key));
    corrects.forEach(q => A_set.add(q.key));
    sectionQuestions = wrongs;

  } else {
    const prev = history.filter(h => h.section === section - 1);
    const prevprev = history.filter(h => h.section === section - 2);

    const prevCorrect = new Set(prev.filter(h => h.incorrect < 3).map(h => h.q.key));
    const prevprevBcorrect = new Set(
      prevprev.filter(h => B_set.has(h.q.key) && h.incorrect < 3).map(h => h.q.key)
    );

    A_set.clear();
    B_set.clear();

    prevCorrect.forEach(k => A_set.add(k));
    prevprevBcorrect.forEach(k => A_set.add(k));

    const prevWrong = new Set(prev.filter(h => h.incorrect >= 3).map(h => h.q.key));
    prevWrong.forEach(k => B_set.add(k));

    sectionQuestions = allQuestions.filter(q => A_set.has(q.key) || B_set.has(q.key));
  }

  currentIndex = 0;

  if (isRandomMode && sectionQuestions.length > 1) {
    shuffle(sectionQuestions);
  }
}

// ===== セクション遷移用ユーティリティ（元ロジック） =====
let emptySectionStreak = 0;
function prepareNextNonEmptySection() {
  while (true) {
    prepareSection(currentSection);
    if (!sectionQuestions || sectionQuestions.length === 0) {
      if (currentSection >= 5) {
        emptySectionStreak++;
        if (emptySectionStreak >= 2) {
          showEndScreen();
          return false;
        }
      }
      currentSection++;
      continue;
    } else {
      emptySectionStreak = 0;
      return true;
    }
  }
}

function startSection() {
  const has = prepareNextNonEmptySection();
  if (has) showSectionIntro();
}

// ===== セクション導入 =====
function showSectionIntro() {
  stopTotalTimer();
  feedbackImage.style.opacity = 0;
  feedbackImage.style.backgroundImage = "none";
  const qa = document.getElementById("question-area");
  if (qa) qa.textContent = `第${displaySection}セクション (${sectionQuestions.length}問)`;

  const qn = document.getElementById("question-number");
  if (qn) qn.textContent = "";
  const prog = document.getElementById("progress");
  if (prog) prog.textContent = "";
  const cat = document.getElementById("category");
  if (cat) cat.textContent = "";
  const subj = document.getElementById("subject");
  if (subj) subj.textContent = "";
  const unit = document.getElementById("unit");
  if (unit) unit.textContent = "";
  const ans = document.getElementById("answer-display");
  if (ans) ans.textContent = "";

  if (answerInput) {
    answerInput.value = "";
    answerInput.disabled = true;
  }
  waitingForEnter = true;
  displaySection++;

  const handler = () => {
    if (waitingForEnter) {
      waitingForEnter = false;
      document.removeEventListener("click", handler);
      showQuestion();
    }
  };
  document.addEventListener("click", handler);
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && waitingForEnter) {
    waitingForEnter = false;
    showQuestion();
  }
});

// ===== 問題表示 =====
function showQuestion() {
  // セクション内の終了判定
  if (!sectionQuestions || currentIndex >= sectionQuestions.length) {
    currentSection++;
    const has = prepareNextNonEmptySection();
    if (!has) return;
    showSectionIntro();
    return;
  }

  // タイマー再開
  startTotalTimer();

  const q = sectionQuestions[currentIndex];
  if (!q) return;

  const qn = document.getElementById("question-number");
  if (qn) qn.textContent = `${q.id}-Q${q.num}`;
  const qa = document.getElementById("question-area");
  if (qa) qa.textContent = q.q;
  const cat = document.getElementById("category");
  if (cat) cat.textContent = `分類: ${q.cat}`;
  const subj = document.getElementById("subject");
  if (subj) subj.textContent = `教科: ${q.subj}`;
  const unit = document.getElementById("unit");
  if (unit) unit.textContent = `単元: ${q.unit}`;
  const ans = document.getElementById("answer-display");
  if (ans) ans.textContent = "";

  const prog = document.getElementById("progress");
  if (prog) prog.textContent = `${currentIndex + 1} / ${sectionQuestions.length}`;

  if (feedbackImage) feedbackImage.style.opacity = 0;
  mistakeIcons.forEach(icon => icon.classList.remove("active"));

  if (answerInput) {
    answerInput.value = "";
    answerInput.disabled = false;
    answerInput.focus({ preventScroll: true });
  }
  incorrectCount = 0;
}

// ===== 終了画面 =====
function showEndScreen() {
  stopTotalTimer();
  const minutes = Math.floor(totalElapsedTime / 60000);
  const seconds = Math.floor((totalElapsedTime % 60000) / 1000);
  const displayTime = `${minutes}分${String(seconds).padStart(2, "0")}秒`;
  const endText = `すべてのセクションが終了しました！お疲れさまでした。`;
  const timeText = `（所要時間: ${displayTime} / 所要セクション数: ${displaySection - 1}）`;

  const qa = document.getElementById("question-area");
  if (qa) qa.innerHTML = `${endText}<br><span style="font-size: 1rem; color: gray;">${timeText}</span>`;

  ["question-number","category","subject","unit","answer-display"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  if (answerInput) {
    answerInput.disabled = true;
    answerInput.value = "";
  }
  if (feedbackImage) feedbackImage.style.opacity = 0;
  mistakeIcons.forEach(icon => icon.classList.remove("active"));

  if (endScreen) endScreen.style.display = "block";
}

// ===== リトライ =====
const retryBtn = document.getElementById("retry-button");
if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    currentSection = 1;
    displaySection = 1;
    history = [];
    A_set.clear();
    B_set.clear();
    totalElapsedTime = 0;
    totalStartTime = performance.now();
    const es = document.getElementById("end-screen");
    if (es) es.style.display = "none";
    prepareSection(currentSection);
    showSectionIntro();
    startTotalTimer();
  });
}

// ===== フィードバック表示（画像/履歴追加） =====
function showFeedback(type, answerText) {
  // 画像は main/ 配下を参照
  if (feedbackImage) {
    feedbackImage.style.backgroundImage = `url('main/${type === "correct" ? "maru.png" : "batsu.png"}')`;
    feedbackImage.style.transition = "none";
    feedbackImage.style.opacity = "0";
    // reflow を強制してからトランジション
    void feedbackImage.offsetWidth;
    feedbackImage.style.transition = "opacity 0.2s ease-in";
    feedbackImage.style.opacity = "1";
    setTimeout(() => {
      feedbackImage.style.transition = "opacity 0.5s ease-out";
      feedbackImage.style.opacity = "0";
    }, 2700);
  }

  if (type === "correct" || incorrectCount >= 3) {
    const ans = document.getElementById("answer-display");
    if (ans) ans.textContent = `答え: ${answerText}`;
    if (answerInput) answerInput.disabled = true;

    const q = sectionQuestions[currentIndex];
    history.push({ q, section: currentSection, incorrect: incorrectCount });

    setTimeout(() => {
      currentIndex++;
      showQuestion();
    }, 1000);
  }
}

// ===== 入力処理 =====
if (answerInput) {
  answerInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !answerInput.disabled) {
      const q = sectionQuestions[currentIndex];
      const input = (answerInput.value || "").trim();
      if (q && input === (q.a || "").trim()) {
        if (correctSound) {
          try { correctSound.play(); } catch (err) { /* ignore */ }
        }
        showFeedback("correct", q.a);
      } else {
        incorrectCount++;
        // 不正解音は main/ 配下から読み込む
        try { new Audio("main/Quiz-Buzzer02-2(Short).mp3").play(); } catch (err) {}
        if (incorrectCount <= 3) {
          const ic = mistakeIcons[incorrectCount - 1];
          if (ic) ic.classList.add("active");
        }
        if (answerInput) answerInput.value = "";
        if (incorrectCount >= 3) {
          showFeedback("wrong", q.a);
        }
      }
    }
  });
}
