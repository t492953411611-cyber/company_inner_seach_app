require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 550,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f8f8f8',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Claude APIで記事生成
ipcMain.handle('generate-article', async (_event, transcript) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。');
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `以下は音声で記録した気づきや考えです。これをnoteに投稿する読みやすい記事に整えてください。

## 指示
- タイトルを考えて先頭に「# タイトル」の形式で書く
- 読者が共感しやすい、親しみやすい文体で書く
- 構成を整理して見出しや段落を使いわかりやすくする
- 元の気づきの本質は変えない
- 最後にまとめの一文を加える

## 音声記録
${transcript}

記事本文のみを返してください（説明や前置きは不要です）。`,
      },
    ],
  });

  return message.content[0].text;
});
