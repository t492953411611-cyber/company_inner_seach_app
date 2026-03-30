// --- 要素取得 ---
const recordBtn = document.getElementById('record-btn');
const recordLabel = document.getElementById('record-label');
const statusMsg = document.getElementById('status-msg');
const transcriptEl = document.getElementById('transcript');
const clearBtn = document.getElementById('clear-btn');
const generateBtn = document.getElementById('generate-btn');
const articleSection = document.getElementById('article-section');
const articleOutput = document.getElementById('article-output');
const copyBtn = document.getElementById('copy-btn');
const saveBtn = document.getElementById('save-btn');
const errorMsg = document.getElementById('error-msg');

// --- Web Speech API ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let interimBuffer = '';

function initRecognition() {
  if (!SpeechRecognition) {
    showError('このブラウザはWeb Speech APIに対応していません。Chromeをお使いください。');
    recordBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += t;
      } else {
        interim += t;
      }
    }

    if (finalText) {
      const current = transcriptEl.value;
      transcriptEl.value = current + (current && !current.endsWith('\n') ? '\n' : '') + finalText;
      interimBuffer = '';
    } else {
      // 暫定テキストを末尾に仮表示（finalが来たら確定）
      interimBuffer = interim;
    }

    updateGenerateBtn();
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      showError('マイクへのアクセスが拒否されました。システム設定でマイクを許可してください。');
    } else if (event.error !== 'no-speech') {
      showError(`音声認識エラー: ${event.error}`);
    }
    stopRecording();
  };

  recognition.onend = () => {
    // continuous=trueでも環境によって止まることがあるので再起動
    if (isRecording) {
      recognition.start();
    }
  };
}

function startRecording() {
  clearError();
  if (!recognition) initRecognition();
  if (!recognition) return;

  try {
    recognition.start();
    isRecording = true;
    recordBtn.classList.add('recording');
    recordLabel.textContent = '録音中… (停止)';
    statusMsg.textContent = '話しかけてください。文字起こしがリアルタイムで表示されます。';
  } catch (e) {
    showError('録音を開始できませんでした: ' + e.message);
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.stop();
  }
  recordBtn.classList.remove('recording');
  recordLabel.textContent = '録音開始';
  statusMsg.textContent = '録音を停止しました。文字起こしを確認・編集してください。';
  updateGenerateBtn();
}

recordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// --- 文字起こし編集 ---
transcriptEl.addEventListener('input', updateGenerateBtn);

clearBtn.addEventListener('click', () => {
  transcriptEl.value = '';
  articleSection.style.display = 'none';
  articleOutput.value = '';
  updateGenerateBtn();
  clearError();
  statusMsg.textContent = 'クリアしました。新しく録音できます。';
});

function updateGenerateBtn() {
  generateBtn.disabled = transcriptEl.value.trim().length === 0;
}

// --- Claude APIで記事生成 ---
generateBtn.addEventListener('click', async () => {
  const transcript = transcriptEl.value.trim();
  if (!transcript) return;

  clearError();
  generateBtn.disabled = true;
  generateBtn.classList.add('loading');
  generateBtn.textContent = '生成中...';
  articleSection.style.display = 'none';

  try {
    const article = await window.api.generateArticle(transcript);
    articleOutput.value = article;
    articleSection.style.display = 'block';
    articleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError(err.message || '記事の生成に失敗しました。');
  } finally {
    generateBtn.classList.remove('loading');
    generateBtn.textContent = '記事を生成する';
    updateGenerateBtn();
  }
});

// --- コピー ---
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(articleOutput.value).then(() => {
    showToast('コピーしました！');
  });
});

// --- 保存 ---
saveBtn.addEventListener('click', () => {
  const text = articleOutput.value;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `note_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('保存しました！');
});

// --- ユーティリティ ---
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

function clearError() {
  errorMsg.style.display = 'none';
  errorMsg.textContent = '';
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// 初期化
initRecognition();
updateGenerateBtn();
