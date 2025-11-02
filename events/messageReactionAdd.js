const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
const rolePanelChannelId = '1434179600325410837'; // ロールパネルを送信したチャンネルID
const targetRoleId = '1434162285693108224'; // 新配布通知ロールID
const targetEmojiId = '1434097896667746324'; // カスタム絵文字ID

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // 💡 常にメッセージをフェッチして最新の状態にする
        let message = reaction.message;
        if (message.partial) {
            try {
                // message.fetch() ではなく、メッセージが属するチャンネルからメッセージIDを指定してフェッチする
                // これにより、partialフラグに関わらずメッセージが確実に取得される
                const channel = await message.client.channels.fetch(message.channelId);
                message = await channel.messages.fetch(message.id);
            } catch (error) {
                console.error('メッセージのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }
        
        const member = message.guild?.members.cache.get(user.id);
        if (!member) return;
        
        // 💡 該当チャンネルとカスタム絵文字IDのチェック
        if (message.channelId !== rolePanelChannelId || reaction.emoji.id !== targetEmojiId) {
            return;
        }

        // メンバーにロールを付与
        try {
            await member.roles.add(targetRoleId);

            // 3秒間表示する通知Embedを作成
            const successEmbed = new EmbedBuilder()
                .setColor(0x2ECC71) // 緑色
                .setDescription(`✅ <@${user.id}> に <@&${targetRoleId}> を付与しました！`);

            // 3秒後に削除される応答メッセージを送信
            const replyMessage = await message.channel.send({ embeds: [successEmbed] });
            
            // 3秒後にメッセージを削除
            setTimeout(() => {
                replyMessage.delete().catch(console.error);
            }, 3000);

        } catch (error) {
            console.error('ロール付与中にエラーが発生しました:', error);
            // 権限不足エラーの場合、console.errorに出力される
        }
    },
};
