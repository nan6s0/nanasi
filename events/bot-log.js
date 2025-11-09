const { Events, EmbedBuilder } = require('discord.js');
const os = require('os');
const process = require('process');

// ログを送信するチャンネルID
const LOG_CHANNEL_ID = '1436944534738178068'; 

/**
 * ミリ秒を読みやすい形式（日、時、分、秒）に変換します。
 * Converts milliseconds into a readable format (days, hours, minutes, seconds).
 * @param {number} ms 稼働時間（ミリ秒）/ Uptime in milliseconds
 * @returns {string} 読みやすい形式の文字列 / Formatted time string
 */
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}日`);
    if (hours > 0) parts.push(`${hours}時間`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);

    return parts.join('');
}

module.exports = {
    // BOTがDiscordに完全に接続し、準備が完了したときに実行
    name: Events.ClientReady,
    once: true, // 起動時の一回のみ実行
    async execute(client) {
        // ログチャンネルを取得
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

        if (!logChannel) {
            console.error(`ログチャンネルID ${LOG_CHANNEL_ID} が見つかりません。`);
            return;
        }
        
        // メモリ使用量を取得 (ヒープ使用量をMBで表示)
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // システム稼働時間 (秒をミリ秒に変換)
        const systemUptimeSeconds = os.uptime();
        const systemUptimeFormatted = formatTime(systemUptimeSeconds * 1000);

        // BOT稼働時間 (ミリ秒)
        const botUptimeMs = client.uptime;
        const botUptimeFormatted = formatTime(botUptimeMs);

        // CPU情報
        const cpuCores = os.cpus().length;
        const cpuModel = os.cpus()[0].model;
        
        // ログ用Embedの作成
        const logEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // 緑
            .setTitle('🟢 BOT起動完了 (Client Ready)')
            .setDescription(`BOTが正常に起動し、準備が完了しました。`)
            .addFields(
                // BOT ステータス
                { name: '🤖 BOT稼働時間', value: `\`${botUptimeFormatted}\``, inline: true },
                { name: '💾 メモリ使用量 (Heap)', value: `\`${memoryUsage.toFixed(2)} MB\``, inline: true },
                { name: '🌐 サーバー数 / ユーザー数', value: `\`${client.guilds.cache.size} サーバー / ${client.users.cache.size} ユーザー\``, inline: true },
                
                // システム情報
                { name: '🖥️ OS稼働時間', value: `\`${systemUptimeFormatted}\``, inline: true },
                { name: '💻 CPUコア数', value: `\`${cpuCores} コア\``, inline: true },
                { name: '⚙️ Node.js バージョン', value: `\`${process.version}\``, inline: true },

                // CPUモデル情報（改行フィールド）
                { name: '🧠 CPU モデル', value: `\`${cpuModel}\``, inline: false },
            )
            .setTimestamp();
        
        try {
            await logChannel.send({ embeds: [logEmbed] });
            console.log('BOT起動ログを送信しました。');
        } catch (error) {
            console.error('BOT起動ログの送信に失敗しました:', error);
        }
    },
};
