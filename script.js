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
let totalTimerInterval;
let isTimerRunning = false;

const correctSound = document.getElementById("correct-sound");
const answerInput = document.getElementById("answer-input");
const feedbackImage = document.getElementById("feedback-image");
const mistakeIcons = document.querySelectorAll(".mistake-icon");
const loaderScreen = document.getElementById("loader-screen");
const quizScreen = document.getElementById("quiz-screen");
const endScreen = document.getElementById("end-screen");

document.getElementById("csvLoader").addEventListener("change", function (e) {
  const files = Array.from(e.target.files);
  const readers = files.map(file => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });
  });

  Promise.all(readers).then(contents => {
    contents.forEach(csv => {
      const lines = csv.split("\n").map(l => l.trim()).filter(l => l);
      const id = lines[0].split(",")[0];
      lines.slice(2).forEach(line => {
        const [num, q, a, cat, subj, unit] = line.split(",");
        allQuestions.push({ id, num, q, a, cat, subj, unit, key: `${id}_Q${num}` });
      });
    });

    loaderScreen.style.display = "none";
    quizScreen.style.display = "block";
    totalStartTime = performance.now();
    startTotalTimer();
    prepareSection(currentSection);
    showSectionIntro();
  });
});

function startTotalTimer() {
  isTimerRunning = true;
  totalStartTime = performance.now() - totalElapsedTime;
  totalTimerInterval = setInterval(() => {
    if (isTimerRunning) {
      totalElapsedTime = performance.now() - totalStartTime;
      updateTimerDisplay();
    }
  }, 100);
}

function stopTotalTimer() {
  isTimerRunning = false;
}

function updateTimerDisplay() {
  const elapsed = totalElapsedTime;
  const sec = Math.floor(elapsed / 1000);
  const ms = Math.floor((elapsed % 1000) / 10);
  document.getElementById("timer").textContent =
    `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

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
}

function showSectionIntro() {
  stopTotalTimer();
  document.getElementById("question-area").textContent =
    `第${displaySection}セクション (${sectionQuestions.length}問)`;
  document.getElementById("question-number").textContent = "";
  document.getElementById("category").textContent = "";
  document.getElementById("subject").textContent = "";
  document.getElementById("unit").textContent = "";
  document.getElementById("answer-display").textContent = "";
  answerInput.value = "";
  answerInput.disabled = true;
  waitingForEnter = true;
  displaySection++;
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && waitingForEnter) {
    waitingForEnter = false;
    showQuestion();
  }
});

document.addEventListener("click", () => {
  if (waitingForEnter) {
    waitingForEnter = false;
    showQuestion();
  }
});

let emptySectionStreak = 0;

function prepareNextNonEmptySection() {
  while (true) {
    prepareSection(currentSection);

    if (sectionQuestions.length === 0) {
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
  const hasSection = prepareNextNonEmptySection();
  if (hasSection) {
    showSectionIntro();
  }
}

function showQuestion() {
  if (currentIndex >= sectionQuestions.length) {
    currentSection++;
    const hasSection = prepareNextNonEmptySection();
    if (!hasSection) return;
    showSectionIntro();
    return;
  }

  const q = sectionQuestions[currentIndex];
  document.getElementById("question-number").textContent = `${q.id}-Q${q.num}`;
  document.getElementById("question-area").textContent = q.q;
  document.getElementById("category").textContent = `分類: ${q.cat}`;
  document.getElementById("subject").textContent = `教科: ${q.subj}`;
  document.getElementById("unit").textContent = `単元: ${q.unit}`;
  document.getElementById("answer-display").textContent = "";
  feedbackImage.style.opacity = 0;
  mistakeIcons.forEach(icon => icon.classList.remove("active"));
  answerInput.value = "";
  answerInput.disabled = false;
  incorrectCount = 0;
  isTimerRunning = true;
  answerInput.focus({ preventScroll: true });
}

function showEndScreen() {
  stopTotalTimer();
  const minutes = Math.floor(totalElapsedTime / 60000);
  const seconds = Math.floor((totalElapsedTime % 60000) / 1000);
  const displayTime = `${minutes}分${String(seconds).padStart(2, '0')}秒`;
  const endText = `すべてのセクションが終了しました！お疲れさまでした。`;
  const timeText = `（所要時間: ${displayTime} / 所要セクション数: ${displaySection - 1}）`;
  document.getElementById("question-area").innerHTML = `${endText}<br><span style="font-size: 1rem; color: gray;">${timeText}</span>`;
  document.getElementById("question-number").textContent = "";
  document.getElementById("category").textContent = "";
  document.getElementById("subject").textContent = "";
  document.getElementById("unit").textContent = "";
  document.getElementById("answer-display").textContent = "";
  answerInput.disabled = true;
  answerInput.value = "";
  feedbackImage.style.opacity = 0;
  mistakeIcons.forEach(icon => icon.classList.remove("active"));
  endScreen.style.display = "block";
}

document.getElementById("retry-button").addEventListener("click", () => {
  currentSection = 1;
  displaySection = 1;
  history = [];
  A_set.clear();
  B_set.clear();
  totalElapsedTime = 0;
  totalStartTime = performance.now();
  updateTimerDisplay();
  endScreen.style.display = "none";
  prepareSection(currentSection);
  showSectionIntro();
  startTotalTimer();
});

function showFeedback(type, answerText) {
  feedbackImage.style.backgroundImage = `url('${type === "correct" ? "maru.png" : "batsu.png"}')`;
  feedbackImage.style.transition = "none";
  feedbackImage.style.opacity = "0";
  void feedbackImage.offsetWidth;
  feedbackImage.style.transition = "opacity 0.2s ease-in";
  feedbackImage.style.opacity = "1";

  setTimeout(() => {
    feedbackImage.style.transition = "opacity 0.5s ease-out";
    feedbackImage.style.opacity = "0";
  }, 2700);

  if (type === "correct" || incorrectCount >= 3) {
    document.getElementById("answer-display").textContent = `答え: ${answerText}`;
    answerInput.disabled = true;
    const q = sectionQuestions[currentIndex];
    history.push({ q, section: currentSection, incorrect: incorrectCount });
    setTimeout(() => {
      currentIndex++;
      showQuestion();
    }, 1000);
  }
}

answerInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !answerInput.disabled) {
    const q = sectionQuestions[currentIndex];
    const input = answerInput.value.trim();

    if (input === q.a.trim()) {
      correctSound.play();
      showFeedback("correct", q.a);
    } else {
      incorrectCount++;
      const wrongSound = new Audio("Quiz-Buzzer02-2(Short).mp3");
      wrongSound.play();
      if (incorrectCount <= 3) {
        mistakeIcons[incorrectCount - 1].classList.add("active");
      }
      answerInput.value = "";
      if (incorrectCount >= 3) {
        showFeedback("wrong", q.a);
      }
    }
  }
});
