// 環境変数の読み込み
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
// EventsとClientを同じ行でインポート
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const http = require('node:http'); // Webサーバー用
const https = require('node:https'); // 💡 セルフPing用に追加

// 💡 threadLogin.js から関数をインポート
const { checkAndBumpThreads } = require('./events/threadLogin'); 

// 💡 自身のRender URLを設定
const selfPingUrl = 'https://nanasi-ze83.onrender.com'; 

// Botクライアントの作成と全てのインテントの設定
const client = new Client({
    intents: [
        // === 基本インテント ===
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,         // メンバー参加/退出など (特権)
        GatewayIntentBits.GuildModeration,      // BANやtimeoutなど
        GatewayIntentBits.GuildEmojisAndStickers, // 絵文字・スタンプ
        GatewayIntentBits.GuildIntegrations,    // 統合機能（Twitchなど）
        GatewayIntentBits.GuildWebhooks,        // Webhook関連
        GatewayIntentBits.GuildInvites,         // 招待リンク関連
        GatewayIntentBits.GuildVoiceStates,     // VC状態（通話Botなどに必要）
        GatewayIntentBits.GuildPresences,       // オンライン/オフライン検知（特権）
        GatewayIntentBits.GuildMessages,        // メッセージイベント
        GatewayIntentBits.GuildMessageReactions, // リアクションイベント
        GatewayIntentBits.GuildMessageTyping,   // 入力中イベント

        // === DM関連 ===
        GatewayIntentBits.DirectMessages,       // DM送受信
        GatewayIntentBits.DirectMessageReactions, // DMのリアクション
        GatewayIntentBits.DirectMessageTyping,  // DMでの入力中イベント

        // === その他 ===
        GatewayIntentBits.MessageContent,       // メッセージ本文の読み取り (特権)
        GatewayIntentBits.GuildScheduledEvents, // サーバーイベント関連
        GatewayIntentBits.AutoModerationConfiguration, // 自動モデレーション設定
        GatewayIntentBits.AutoModerationExecution  // 自動モデレーションの実行
    ]
});

// コマンドを格納するコレクションの作成
client.commands = new Collection();

// コマンドファイルの読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[警告] ${filePath} のコマンドに必要な "data" または "execute" プロパティがありません。`);
    }
}

// イベントファイルの読み込み
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    // イベントの登録（一度だけ実行するイベントと継続的に実行するイベントを区別）
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// 💡 スレッドチェックとセルフPingの処理を追加
client.once(Events.ClientReady, () => {
    console.log(`ボット ${client.user.tag} が起動しました！`);
    
    // 1. スレッドのアクティビティチェックを登録（1時間ごと）
    // 初回起動時にも実行
    checkAndBumpThreads(client); 
    // 1時間 = 3600000ms
    setInterval(() => {
        checkAndBumpThreads(client);
    }, 1 * 60 * 60 * 1000); 
    
    // 2. セルフPingを実行（5分ごと）
    setInterval(() => {
        // Render URLにHTTPSリクエストを送信
        https.get(selfPingUrl, (res) => {
            console.log(`[セルフPing] ステータスコード: ${res.statusCode} (${new Date().toLocaleTimeString('ja-JP')})`);
        }).on('error', (err) => {
            console.error(`[セルフPing] エラーが発生しました: ${err.message}`);
        });
    }, 5 * 60 * 1000); // 5分 = 300000ms
});


// スラッシュコマンド（InteractionCreate）の処理
client.on(Events.InteractionCreate, async interaction => {
    // スラッシュコマンド以外（ボタンなど）は、eventsフォルダのファイルで処理されます
    if (!interaction.isChatInputCommand()) return; 

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`${interaction.commandName} に一致するコマンドが見つかりませんでした。`);
        return;
    }

    try {
        // コマンド実行（commands/ticket.jsで deferReply を行う）
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // エラー時の応答処理を堅牢化し、クラッシュを防ぐ
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ 
                content: 'コマンドの実行中にエラーが発生しました。', 
                ephemeral: true 
            }).catch(() => {});
        } else {
            await interaction.reply({ 
                content: 'コマンドの実行中にエラーが発生しました。', 
                ephemeral: true 
            }).catch(() => {});
        }
    }
});


// 💡 Render 24時間稼働のための簡易Webサーバー
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // Renderのヘルスチェックに応答
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot is alive\n');
});

server.listen(port, () => {
    console.log(`Web server listening on port ${port} for health checks.`);
});

// Botのログイン
client.login(process.env.TOKEN);
