const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const forumChannelId = '1434095946958114918'; // 監視対象のフォーラムチャンネルID
const logChannelId = '1434160928294965319'; // ログを送信するチャンネルID
const mentionRoleId = '1434162285693108224'; // 通知時にメンションするロールID

module.exports = {
    // ThreadCreate イベントを購読
    name: Events.ThreadCreate,
    once: false,
    async execute(thread) {
        // 監視対象のフォーラムチャンネル以外で作成されたスレッドは無視
        if (thread.parentId !== forumChannelId) return;

        // 通知を送信するログチャンネルを取得
        const logChannel = thread.guild.channels.cache.get(logChannelId);
        
        // ログチャンネルが存在しない場合は処理を終了
        if (!logChannel) {
            console.log(`[警告] ログチャンネルID ${logChannelId} が見つかりませんでした。`);
            return;
        }

        // 埋め込みメッセージの作成
        const notificationEmbed = new EmbedBuilder()
            .setColor(0xEE82EE) 
            .setTitle('🎁 新配布のお知らせ 🎁')
            .setDescription(`**新しい配布スレッド**が作成されました！\n\n**スレッド名:** ${thread.name}`)
            .addFields(
                { 
                    name: '🔗 スレッドリンク', 
                    // スレッドへの直接リンクをMarkdownで表示
                    value: `[こちらをクリックしてスレッドへ移動](${thread.url})` 
                },
                {
                    name: '作成者',
                    value: `<@${thread.ownerId}>`,
                    inline: true
                }
            )
            .setTimestamp();
        
        // メンションメッセージを作成
        const mentionMessage = `<@&${mentionRoleId}>`;

        try {
            // ロールメンションとEmbedを同時に送信
            await logChannel.send({ 
                content: mentionMessage,
                embeds: [notificationEmbed],
            });
            console.log(`[ThreadCreate] スレッド ${thread.name} の通知をログチャンネルに送信しました。`);
        } catch (error) {
            console.error('スレッド作成通知の送信中にエラーが発生しました:', error);
        }
    },
};
