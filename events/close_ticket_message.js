const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// === 設定ID ===
const categoryId = '1434106965423820902'; // チケットチャンネルを作成するカテゴリID
const staffId = '707800417131692104'; // チケットチャンネルで権限を持つユーザー/ロールのID

module.exports = {
    // 💡 修正: MessageCreateイベントとして定義
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        // ボット自身のメッセージと、特定のスタッフからのメッセージ以外は無視
        if (message.author.bot || message.author.id !== staffId) return;

        // 「チ閉じると」メッセージをチェック
        if (message.content === 'チ閉じると') {
            const channel = message.channel;

            // カテゴリIDの確認 (チケットチャンネル内でのみ有効とする)
            if (channel.parentId !== categoryId) return;

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('チャンネルを閉じますか？')
                .setDescription('「閉じる」を押すとこのチケットチャンネルは削除されます。');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket') // events/ticket.jsで処理される
                        .setLabel('閉じる')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_close') // events/ticket.jsで処理される
                        .setLabel('キャンセル')
                        .setStyle(ButtonStyle.Secondary),
                );

            await channel.send({
                embeds: [confirmEmbed],
                components: [row],
            });

            try {
                await message.delete(); // 「チ閉じると」メッセージを削除
            } catch (error) {
                console.error('メッセージ削除中にエラーが発生しました:', error);
            }
        }
    },
};
