const { Events, EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');

// === 設定ID ===
const logChannelId = '1434202466773373099'; // ログチャンネルID
const targetGuildId = '1434084039647821836'; // 監視対象サーバーID

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message) {
        // 監視対象サーバー外のメッセージは無視
        if (message.guildId !== targetGuildId) return;

        // 💡 Partialメッセージのフェッチ
        if (message.partial) {
            try {
                // 部分的なメッセージをフェッチして完全なデータを得る
                await message.fetch();
            } catch (error) {
                // DiscordAPIError[10008]: Unknown Message (メッセージが既に存在しない) の場合は、
                // ログに記録せず、静かに処理を終了する
                if (error.code === 10008) {
                    // console.log(`[MessageDelete] 削除済みメッセージのPartialイベントを安全に無視しました: ${error.url}`);
                    return; 
                }
                
                // その他のフェッチエラーはログに出力して終了
                console.error('Partialメッセージのフェッチ中にエラー:', error);
                return;
            }
        }
        
        // ボット自身のメッセージ、DM、Webhookメッセージは無視
        // message.author が null の可能性（フェッチできなかった場合など）を考慮して ?. でチェック
        if (message.author?.bot || message.author?.system || message.webhookId) return;
        // メッセージの内容が取得できない場合は無視
        if (!message.content) return; 

        const guild = message.guild;
        const logChannel = guild.channels.cache.get(logChannelId);

        if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

        let deleter = '送信者本人'; // 削除者を初期化
        let deleteType = '自己削除';

        // 監査ログをチェックして削除者を特定（権限を持つユーザーによる削除の場合）
        try {
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete,
            });

            const deletionLog = fetchedLogs.entries.first();

            if (deletionLog) {
                const { executor, target, extra, createdAt } = deletionLog;
                
                // 💡 厳密なチェック: 実行者がメッセージの送信者でなく、かつ、ターゲットID、チャンネルIDが一致し、5秒以内
                const isRelevantLog = (
                    executor.id !== message.author.id && // 実行者が送信者ではない (管理者など)
                    target.id === message.author.id &&   // ターゲットが削除されたメッセージの作者である
                    extra?.channel?.id === message.channel.id && // チャンネルが一致する (extra?.channel の安全なアクセス)
                    Date.now() - createdAt.getTime() < 5000 // 5秒以内
                );

                if (isRelevantLog) {
                    deleter = executor.tag;
                    deleteType = '管理者削除';
                }
            }
        } catch (error) {
            // 監査ログの権限がない場合、ここでエラーが発生する
            console.error('メッセージ削除時の監査ログ取得に失敗:', error);
            // 権限がない場合は、削除者を特定せずに処理を継続
        }
        
        // Embedの作成
        const deleteEmbed = new EmbedBuilder()
            .setColor(deleteType === '管理者削除' ? 0xE74C3C : 0xFEE75C) // 管理者削除なら赤、自己削除なら黄色
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
