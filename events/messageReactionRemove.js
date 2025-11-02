const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
const rolePanelChannelId = '1434179600325410837'; // ロールパネルを送信したチャンネルID
const targetRoleId = '1434162285693108224'; // 新配布通知ロールID
const targetEmojiId = '1434097896667746324'; // カスタム絵文字ID

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,
    async execute(reaction, user) {
        // ボット自身、または対象チャンネル外のメッセージは無視
        if (user.bot || reaction.message.channelId !== rolePanelChannelId) return;

        // 💡 Partial（部分的なデータ）として受け取った場合、必ず完全なデータをフェッチ
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('リアクションデータのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }
        
        const message = reaction.message;

        // 該当メッセージで、対象のカスタム絵文字でなければ無視
        if (reaction.emoji.id !== targetEmojiId) return;
        
        // メンバーとロールの取得
        const member = message.guild?.members.cache.get(user.id);
        if (!member) return;

        // メンバーからロールを剥奪
        try {
            await member.roles.remove(targetRoleId);

            // 3秒後に削除される応答メッセージを送信
            const removeEmbed = new EmbedBuilder()
                .setColor(0xE74C3C) // 赤色
                .setDescription(`❌ <@${user.id}> から <@&${targetRoleId}> を削除しました。`);

            const replyMessage = await message.channel.send({ embeds: [removeEmbed] });
            
            setTimeout(() => {
                replyMessage.delete().catch(console.error);
            }, 3000);

        } catch (error) {
            console.error(`ロール剥奪中にエラーが発生しました: ${error.message}`);
        }
    },
};
