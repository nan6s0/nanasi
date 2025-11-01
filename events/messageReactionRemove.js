const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
const rolePanelChannelId = '1434179600325410837'; // 💡 ここにロールパネルを送信したチャンネルのIDを設定してください
const targetRoleId = '1434162285693108224'; // 新配布通知ロールID
const targetEmojiId = '1434097896667746324'; // 💡 カスタム絵文字ID

module.exports = {
    name: Events.MessageReactionRemove,
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('メッセージのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }
        
        const message = reaction.message;
        const member = message.guild.members.cache.get(user.id);
        
        if (!member) return;

        // 💡 該当チャンネルとカスタム絵文字IDのチェック
        if (message.channelId !== rolePanelChannelId || reaction.emoji.id !== targetEmojiId) {
            return;
        }

        // メンバーからロールを剥奪
        try {
            await member.roles.remove(targetRoleId);

            // 3秒間表示する通知Embedを作成
            const removeEmbed = new EmbedBuilder()
                .setColor(0xE74C3C) // 赤色
                .setDescription(`❌ <@${user.id}> から <@&${targetRoleId}> を削除しました。`);

            // 3秒後に削除される応答メッセージを送信
            const replyMessage = await message.channel.send({ embeds: [removeEmbed] });
            
            // 3秒後にメッセージを削除
            setTimeout(() => {
                replyMessage.delete().catch(console.error);
            }, 3000);

        } catch (error) {
            console.error('ロール剥奪中にエラーが発生しました:', error);
        }
    },
};
