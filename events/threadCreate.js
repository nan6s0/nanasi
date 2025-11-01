const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const targetChannelId = '1434107028443365480'; // 監視対象のチャンネルID

module.exports = {
    // ThreadCreate イベントを購読
    name: Events.ThreadCreate,
    once: false,
    async execute(thread) {
        // 監視対象チャンネル以外で作成されたスレッドは無視
        if (thread.parentId !== targetChannelId) return;

        // スレッドが作成された親チャンネルを取得
        const parentChannel = thread.guild.channels.cache.get(targetChannelId);
        
        // チャンネルが存在しない場合は処理を終了
        if (!parentChannel) {
            console.log(`[警告] 親チャンネルID ${targetChannelId} が見つかりませんでした。`);
            return;
        }

        // 埋め込みメッセージの作成
        const notificationEmbed = new EmbedBuilder()
            .setColor(0xEE82EE) // 好みの色に変更可能 (例: バイオレット)
            .setTitle('🎁 新配布のお知らせ 🎁')
            .setDescription(`**${parentChannel.name}** に新しい配布スレッドが作成されました！\n\n**スレッド名:** ${thread.name}`)
            .addFields(
                { 
                    name: '🔗 リンク', 
                    // スレッドへの直接リンクをMarkdownで表示
                    value: `[こちらをクリックしてスレッドへ移動](${thread.url})` 
                }
            )
            .setTimestamp();

        try {
            // スレッドが作成された親チャンネルに通知を送信
            await parentChannel.send({ embeds: [notificationEmbed] });
            console.log(`[ThreadCreate] スレッド ${thread.name} の通知をチャンネル ${parentChannel.name} に送信しました。`);
        } catch (error) {
            console.error('スレッド作成通知の送信中にエラーが発生しました:', error);
        }
    },
};
