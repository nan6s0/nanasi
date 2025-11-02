const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// === 設定 ===
const roleId = '1434162285693108224'; // 新配布通知ロールID
const roleEmojiId = '1434097896667746324'; // カスタム絵文字ID
const roleEmojiName = 'takonya'; // カスタム絵文字名
const roleEmojiDisplay = '<:takonya:1434097896667746324>'; // 表示用のフルネーム

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolepanel')
        .setDescription('リアクションロールパネルを送信します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), 
    
    async execute(interaction) {
        // 💡 応答の遅延 (Defer) を最初に行い、エラー40060を防ぐ
        await interaction.deferReply({ ephemeral: true }); 

        // 埋め込みメッセージの作成
        const panelEmbed = new EmbedBuilder()
            .setColor(0x3498DB) // 青色
            .setTitle('🐙 ロールパネル 🐙')
            .setDescription(`このメッセージにリアクションをつけることで、ロールを付与できます。\n\n**${roleEmojiDisplay} : <@&${roleId}>**`);

        try {
            // パネルメッセージを送信 (deferとは別のアクション)
            const message = await interaction.channel.send({
                embeds: [panelEmbed],
            });

            // カスタム絵文字のリアクションを追加
            await message.react(`${roleEmojiName}:${roleEmojiId}`);

            // 成功メッセージで応答を編集し完了させる
            await interaction.editReply({ 
                content: 'ロールパネルを送信し、リアクションを付けました。', 
            });

        } catch (error) {
            console.error('ロールパネル送信中にエラーが発生しました:', error);
            // エラーが発生した場合、応答を編集してエラーを通知する
            await interaction.editReply({
                content: '❌ パネルの送信中にエラーが発生しました。ボットに権限があるか確認してください。',
            }).catch(e => console.error('エラー通知失敗:', e)); // 念のため、エラー通知の失敗も捕捉

        }
    },
};
