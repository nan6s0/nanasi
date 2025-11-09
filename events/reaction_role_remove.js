const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,
    async execute(reaction, user) {
        // ボット自身のリアクションは無視
        if (user.bot) return;

        // 💡 Partial（部分的なデータ）をフェッチ
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('リアクションデータのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }
        
        const message = reaction.message;

        // 1. メッセージの埋め込み (Embed) をチェックしてロールパネルか判定
        const embed = message.embeds[0];
        if (!embed || !embed.title || !embed.title.includes('ロールパネル') && !embed.title.includes('カスタムロールパネル')) return;

        // 2. 埋め込みのDescriptionからロールIDと絵文字IDを抽出
        const description = embed.description;
        if (!description) return;
        
        // 正規表現でロールIDと絵文字IDを抽出
        const match = description.match(/<:.*?:(\d+)>.*?<@&(\d+)>/);
        if (!match) return;

        const targetEmojiId = match[1];
        const targetRoleId = match[2];

        // 3. リアクションがパネルに設定された絵文字と一致するか確認
        if (reaction.emoji.id !== targetEmojiId) return;
        
        // 4. ロール剥奪の実行
        const member = message.guild?.members.cache.get(user.id);
        if (!member) return;

        try {
            await member.roles.remove(targetRoleId);

            // Ephemeralメッセージで通知
            await user.send({
                content: `❌ サーバー: **${message.guild.name}** にて、<@&${targetRoleId}> を削除しました。`
            }).catch(() => {
                // DM送信失敗時、代わりに一時的なチャンネルメッセージで通知
                message.channel.send({
                    content: `<@${user.id}>、❌ <@&${targetRoleId}> を削除しました。`,
                }).then(replyMessage => {
                    setTimeout(() => replyMessage.delete().catch(() => {}), 5000);
                }).catch(() => {});
            });

        } catch (error) {
            console.error(`ロール剥奪中にエラーが発生しました: ${error.message}`);
        }
    },
};
