const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
const rolePanelChannelId = '1434179600325410837'; // ロールパネルを送信したチャンネルID
const targetRoleId = '1434162285693108224'; // 新配布通知ロールID
const targetEmojiId = '1434097896667746324'; // カスタム絵文字ID

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        // ボット自身、または対象チャンネル外のメッセージは無視
        if (user.bot || reaction.message.channelId !== rolePanelChannelId) return;

        // 💡 Partial（部分的なデータ）として受け取った場合、必ず完全なデータをフェッチ
        // index.jsでPartialsを設定済みのため、このロジックで再起動後もメッセージを取得可能
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

        // メンバーにロールを付与
        try {
            await member.roles.add(targetRoleId);

            // 3秒後に削除される応答メッセージを送信
            const successEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`✅ <@${user.id}> に <@&${targetRoleId}> を付与しました！`);

            // 応答はDMで行うか、Ephemeralメッセージとして送る方が、チャンネルを汚さず望ましい
            // ここでは元の仕様通りチャンネルに送信するが、delete権限が必要
            const replyMessage = await message.channel.send({ embeds: [successEmbed] });
            
            setTimeout(() => {
                replyMessage.delete().catch(console.error);
            }, 3000);

        } catch (error) {
            console.error(`ロール付与中にエラーが発生しました: ${error.message}`);
            // ボットのロール階層が対象ロールより下位でないか、必要な権限があるか確認してください。
        }
    },
};
