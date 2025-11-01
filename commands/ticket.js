const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

// 💡 修正: チャンネルIDではなくユーザーIDとして定義
const staffUserId = '707800417131692104'; 
// パネルを送信するチャンネルを制限しない場合は、この変数は不要かもしれません。
// ここでは、コマンドの実行者が特定のユーザーであることをチェックします。

module.exports = {
    // コマンドは公開されますが、実行は特定のユーザーに制限されます
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('お問い合わせパネルを送信します。'),
    
    async execute(interaction) {
        // 💡 修正: ユーザーIDが指定されたIDと一致するかチェック
        if (interaction.user.id !== staffUserId) {
            return interaction.reply({ 
                content: 'このコマンドは特定の管理者のみ実行可能です。', 
                ephemeral: true 
            });
        }

        // 埋め込みメッセージの作成
        const panelEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('お問い合わせパネル')
            .setDescription('お問い合わせの際は下のボタンから');

        // ボタンの作成
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('お問い合わせ')
                    .setStyle(ButtonStyle.Primary),
            );

        // メッセージを送信
        // パネルを送信するチャンネルは、コマンドを実行したチャンネルになります。
        await interaction.channel.send({
            embeds: [panelEmbed],
            components: [row],
        });

        // コマンド実行の応答（ephemeralで非表示）
        await interaction.reply({ 
            content: 'お問い合わせパネルを送信しました。', 
            ephemeral: true 
        });
    },
};
