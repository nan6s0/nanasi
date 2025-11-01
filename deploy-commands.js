// 環境変数の読み込み
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// コマンドの配列を初期化
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// コマンドファイルの読み込みと登録
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[警告] ${filePath} のコマンドに必要な "data" または "execute" プロパティがありません。`);
    }
}

// Discord APIとの通信用のRESTクライアントを作成
const rest = new REST().setToken(process.env.TOKEN);

// コマンドの登録処理
(async () => {
    try {
        console.log(`${commands.length} 個のアプリケーションコマンドを登録します。`);

        // グローバルコマンドとして登録
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`${data.length} 個のアプリケーションコマンドを登録しました。`);
    } catch (error) {
        console.error(error);
    }
})();