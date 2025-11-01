// 環境変数の読み込み
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const http = require('node:http'); // 💡 Render対応のため追加

// Botクライアントの作成と必要な権限の設定
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
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
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // 💡 修正: エラー時の応答処理をより堅牢化
        if (interaction.deferred || interaction.replied) {
            // deferReply または reply 済みの場合、followUp を試みる
            await interaction.followUp({ 
                content: 'コマンドの実行中にエラーが発生しました。', 
                ephemeral: true 
            }).catch(() => {}); // followUpが失敗してもクラッシュしない
        } else {
            // まだ応答していない場合、reply を試みる
            await interaction.reply({ 
                content: 'コマンドの実行中にエラーが発生しました。', 
                ephemeral: true 
            }).catch(() => {}); // replyが失敗してもクラッシュしない
        }
    }
});


// 💡 Render 24時間稼働のための簡易Webサーバー
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot is alive\n');
});

server.listen(port, () => {
    console.log(`Web server listening on port ${port} for health checks.`);
});

// Botのログイン
client.login(process.env.TOKEN);
