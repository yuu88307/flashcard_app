let data = [];  // {num, question, answer, category, subject, unit}
let selectedIndex = -1;
let editMode = false;
let isSaved = false; // CSV出力済みかどうか

// 要素取得
const startScreen = document.getElementById("startScreen");
const screen1 = document.getElementById("screen1");
const screen2 = document.getElementById("screen2");

const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");
const exportBtn = document.getElementById("exportBtn");

const titleInput = document.getElementById("titleInput");

const numInput = document.getElementById("numInput");
const qInput = document.getElementById("questionInput");
const aInput = document.getElementById("answerInput");
const cInput = document.getElementById("categoryInput");
const sInput = document.getElementById("subjectInput");
const uInput = document.getElementById("unitInput");

// ==================== 初期ロード ====================
// ページロード前にダークモードを設定（チラつき防止）

(function() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add("dark");
  }
})();

window.addEventListener("DOMContentLoaded", () => {
  // bodyにダークモードクラスを移行
  if (document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.remove("dark");
    document.body.classList.add("dark");
  }

  // 初期ロード後にトランジションを有効化（チラつき防止）
  setTimeout(() => {
    document.body.classList.add("transition-enabled");
    // 全ての要素にトランジションを適用
    document.querySelectorAll("*").forEach(el => {
      el.classList.add("transition-enabled");
    });
  }, 100);

  // ダークモード切替ボタン初期アイコン設定
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  darkModeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    darkModeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });
});

// データ変更時に未保存フラグを立てる
function markUnsaved() {
  isSaved = false;
}

// 画面切替
function showScreen(screen) {
  startScreen.classList.add("hidden");
  startScreen.style.display = "none";
  screen1.classList.add("hidden");
  screen2.classList.add("hidden");
  screen.classList.remove("hidden");
}

// リスト描画
function renderList() {
  listEl.innerHTML = "";
  data.forEach((item, i) => {
    const div = document.createElement("div");
    div.textContent = `${item.num}. ${item.question} / ${item.answer}`;
    if (i === selectedIndex) div.classList.add("selected");
    div.onclick = () => {
      selectedIndex = i;
      renderList(); // 選択時にボタン状態を更新
      editBtn.disabled = false;
      deleteBtn.disabled = false;
    };
    listEl.appendChild(div);
  });

  // 選択されていない場合は編集・削除・移動ボタンすべて無効
  if (selectedIndex === -1) {
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    changeUpBtn.disabled = true;
    changeDownBtn.disabled = true;
  } else {
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    // 上端なら上ボタン無効、下端なら下ボタン無効
    changeUpBtn.disabled = (selectedIndex === 0);
    changeDownBtn.disabled = (selectedIndex === data.length - 1);
  }
}


// 起動画面
document.getElementById("newBtn").onclick = () => {
  data = [];
  selectedIndex = -1;
  titleInput.value = "";
  renderList();
  showScreen(screen1);
};

document.getElementById("loadBtn").onclick = () => {
  document.getElementById("fileInput").click();
};

document.getElementById("fileInput").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
  const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return;

  // 1行目の最初のカンマまでをタイトルに
  const firstLine = lines[0];
  const commaIndex = firstLine.indexOf(",");
  titleInput.value = commaIndex !== -1 ? firstLine.slice(0, commaIndex) : firstLine;

  data = [];
  for (let i = 2; i < lines.length; i++) { // 3行目から
    const [num, q, a, c, s, u] = lines[i].split(",");
    data.push({
      num: num || "",
      question: q || "",
      answer: a || "",
      category: c || "",
      subject: s || "",
      unit: u || ""
    });
  }
  selectedIndex = -1;
  renderList();
  showScreen(screen1);
};

  reader.readAsText(file, "utf-8");
};

// 画面①操作
addBtn.onclick = () => {
  editMode = false;
  markUnsaved();
  let nextNum = 1;
  if (data.length > 0) {
    const last = data[data.length - 1];
    nextNum = parseInt(last.num) + 1 || data.length + 1;
  }
  numInput.value = nextNum;
  qInput.value = "";
  aInput.value = "";
  
  document.getElementById("applyBtn").textContent = "追加"; // 追加モード
  showScreen(screen2);
  qInput.focus();
};

changeDownBtn.onclick = () => {
  if (selectedIndex === -1 || selectedIndex === data.length - 1) return;

  // numを入れ替え
  const tempNum = data[selectedIndex].num;
  data[selectedIndex].num = data[selectedIndex + 1].num;
  data[selectedIndex + 1].num = tempNum;

  // データ自体を入れ替え
  [data[selectedIndex], data[selectedIndex + 1]] = [data[selectedIndex + 1], data[selectedIndex]];

  selectedIndex++; // 選択を下に移動
  renderList();
};

changeUpBtn.onclick = () => {
  if (selectedIndex <= 0) return;

  // numを入れ替え
  const tempNum = data[selectedIndex].num;
  data[selectedIndex].num = data[selectedIndex - 1].num;
  data[selectedIndex - 1].num = tempNum;

  // データ自体を入れ替え
  [data[selectedIndex - 1], data[selectedIndex]] = [data[selectedIndex], data[selectedIndex - 1]];

  selectedIndex--; // 選択を上に移動
  renderList();
};



editBtn.onclick = () => {
  if (selectedIndex === -1) return;
  editMode = true;
  markUnsaved();
  const item = data[selectedIndex];
  numInput.value = item.num;
  qInput.value = item.question;
  aInput.value = item.answer;
  cInput.value = item.category;
  sInput.value = item.subject;
  uInput.value = item.unit;
  
  document.getElementById("applyBtn").textContent = "編集"; // 編集モード
  showScreen(screen2);
};

deleteBtn.onclick = () => {
  if (selectedIndex === -1) return;
  if (!confirm("選択された問題を削除しますか？")) return;
  data.splice(selectedIndex, 1);
  selectedIndex = -1;
  renderList();
  markUnsaved();
};

exportBtn.onclick = () => {
  const title = titleInput.value.replace(/,/g, ""); 
  // タイトル行（末尾にカンマ5つ）
  const titleLine = `${title},,,,,`;
  // フリー行（カンマ6個で空欄埋め）
  const freeLine = ",,,,,";
  // データ部分
  const body = data.map(d =>
    [d.num, d.question, d.answer, d.category, d.subject, d.unit].join(",")
  );

  const csv = [titleLine, freeLine].concat(body).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "output"}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  isSaved = true; // 保存済みに設定
};




// 画面②操作
document.getElementById("applyBtn").onclick = () => {
  const obj = {
    num: numInput.value,
    question: qInput.value,
    answer: aInput.value,
    category: cInput.value,
    subject: sInput.value,
    unit: uInput.value
  };
  if (editMode) {
    data[selectedIndex] = obj;
    showScreen(screen1);
    renderList();
  } else {
    data.push(obj);
    renderList();
    let nextNum = parseInt(obj.num) + 1 || data.length + 1;
    numInput.value = nextNum;
    qInput.value = "";
    aInput.value = "";
    qInput.focus();
  }
};

document.getElementById("cancelBtn").onclick = () => {
  let hasChanges = false;

  if (editMode && selectedIndex !== -1) {
    // 編集モード時は元のデータと比較
    const item = data[selectedIndex];
    if (
      numInput.value !== item.num ||
      qInput.value !== item.question ||
      aInput.value !== item.answer ||
      cInput.value !== item.category ||
      sInput.value !== item.subject ||
      uInput.value !== item.unit
    ) {
      hasChanges = true;
    }
  } else {
    // 追加モード時は何か入力されていれば変更ありとみなす
    if (qInput.value || aInput.value || cInput.value || sInput.value || uInput.value) {
      hasChanges = true;
    }
  }

  if (hasChanges) {
    if (!confirm("入力中の内容があります。破棄しますか？")) return;
  }

  showScreen(screen1);
};

document.getElementById("backToStartBtn").onclick = () => {
  if (!isSaved) {
    if (!confirm("未保存の変更があります。破棄して起動画面に戻りますか？")) return;
  }
  // ページをリロード
  suppressBeforeUnload = true;
  location.reload();
};





// エンターで移動
qInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); aInput.focus(); }
});
aInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); cInput.focus(); }
});
cInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); sInput.focus(); }
});
sInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); uInput.focus(); }
});
uInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); qInput.focus(); }
});

// 再読み込みや画面閉じようとしたとき
window.addEventListener("beforeunload", (e) => {
  // 起動画面では表示しない
  if (startScreen.classList.contains("hidden") && !isSaved && !suppressBeforeUnload) {
    e.preventDefault();
    e.returnValue = "";
  }
});
