const { Events, EmbedBuilder, ChannelType, AuditLogEvent, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const logChannelId = '1434202466773373099'; // ログチャンネルID
const targetGuildId = '1434084039647821836'; // 監視対象サーバーID

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message) {
        // 監視対象サーバー外のメッセージは無視
        if (message.guildId !== targetGuildId) return;
        // ボット自身のメッセージ、DM、Webhookメッセージは無視
        if (message.author?.bot || message.author?.system || message.webhookId) return;
        // メッセージの内容が取得できない場合は無視 (partial message)
        if (!message.content) return; 

        const guild = message.guild;
        const logChannel = guild.channels.cache.get(logChannelId);

        if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

        let deleter = '不明'; // 削除者を初期化

        // 監査ログをチェックして削除者を特定
        try {
            // MessageDeleteイベントのログはイベント発生直後に生成される
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete,
            });

            const deletionLog = fetchedLogs.entries.first();

            if (deletionLog) {
                const { executor, target, extra } = deletionLog;
                
                // 実行者がメッセージの送信者本人、またはメッセージの送信先チャンネルが一致するか確認
                if (target.id === message.author.id && extra.channel.id === message.channel.id) {
                    // 削除がイベント発生から2秒以内であれば、このログが対応していると見なす
                    const now = Date.now();
                    if (now - deletionLog.createdAt.getTime() < 2000) {
                        deleter = executor.tag;
                    }
                }
            }
        } catch (error) {
            console.error('メッセージ削除時の監査ログ取得に失敗:', error);
        }
        
        // Embedの作成
        const deleteEmbed = new EmbedBuilder()
            .setColor(0xE74C3C) // 赤
            .setTitle('🗑️ メッセージ削除ログ')
            .addFields(
                { name: '送信者', value: `<@${message.author.id}> (${message.author.tag})`, inline: false },
                { name: '削除者', value: deleter, inline: true },
                { name: 'チャンネル', value: `<#${message.channel.id}>`, inline: true },
                { name: '削除された内容', value: `\`\`\`${message.content.substring(0, 1000)}\`\`\`` }
            )
            .setTimestamp();

        try {
            await logChannel.send({ embeds: [deleteEmbed] });
        } catch (error) {
            console.error('削除ログの送信に失敗:', error);
        }
    },
};
