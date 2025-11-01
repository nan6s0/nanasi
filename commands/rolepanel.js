const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// === 設定 ===
const roleId = '1434162285693108224'; // 新配布通知ロールID
// 💡 カスタム絵文字の識別子を設定
const roleEmojiId = '1434097896667746324'; // カスタム絵文字ID
const roleEmojiName = 'takonya'; // カスタム絵文字名
const roleEmojiDisplay = '<:takonya:1434097896667746324>'; // 表示用のフルネーム

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolepanel')
        .setDescription('リアクションロールパネルを送信します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), 
    
    async execute(interaction) {
        // 埋め込みメッセージの作成
        const panelEmbed = new EmbedBuilder()
            .setColor(0x3498DB) // 青色
            .setTitle('🐙 ロールパネル 🐙')
            .setDescription(`このメッセージにリアクションをつけることで、ロールを付与できます。\n\n**${roleEmojiDisplay} : <@&${roleId}>**`);

        try {
            // パネルメッセージを送信
            const message = await interaction.channel.send({
                embeds: [panelEmbed],
            });

            // 💡 カスタム絵文字のリアクションを追加
            await message.react(`${roleEmojiName}:${roleEmojiId}`);

            // コマンド実行の応答（ephemeralで非表示）
            await interaction.reply({ 
                content: 'ロールパネルを送信し、リアクションを付けました。', 
                ephemeral: true 
            });

        } catch (error) {
            console.error('ロールパネル送信中にエラーが発生しました:', error);
            await interaction.reply({
                content: 'パネルの送信中にエラーが発生しました。ボットに権限があるか確認してください。',
                ephemeral: true
            }).catch(() => {});
        }
    },
};
