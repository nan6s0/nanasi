const { Events, EmbedBuilder } = require('discord.js'); // EmbedBuilderをインポート

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

            // 💡 修正: チャンネルに埋め込みを送信し、5秒後に削除
            const removeEmbed = new EmbedBuilder()
                .setColor(0xE74C3C) // 赤色
                .setDescription(`❌ <@${user.id}> から <@&${targetRoleId}> を削除しました。`);

            const replyMessage = await message.channel.send({ embeds: [removeEmbed] });
            
            setTimeout(() => {
                replyMessage.delete().catch(() => {}); // 削除権限がない場合はエラーを無視
            }, 5000); // 5秒後に削除

        } catch (error) {
            console.error(`ロール剥奪中にエラーが発生しました: ${error.message}`);
            message.channel.send({
                content: `<@${user.id}>、ロール削除に失敗しました。管理者にお問い合わせください。`,
            }).then(replyMessage => {
                setTimeout(() => replyMessage.delete().catch(() => {}), 5000);
            }).catch(() => {});
        }
    },
};
