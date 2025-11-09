const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const staffUserId = '707800417131692104'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('お問い合わせパネルを送信します。'),
    
    async execute(interaction) {
        // 💡 修正1: 最初にdeferReplyを行い、二重応答エラーを防ぐ
        await interaction.deferReply({ ephemeral: true }); 

        // 707800417131692104専用コマンドとしてチェック
        if (interaction.user.id !== staffUserId) {
            // deferReplyの後の応答は editReply を使用
            return interaction.editReply({ 
                content: 'このコマンドは特定の管理者のみ実行可能です。'
            });
        }

        // 埋め込みメッセージの作成
        const panelEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('お問い合わせパネル')
            .setDescription('お問い合わせの際は下のボタンからチケットを開いてください。\nチケットはユーザーごとに1つまで作成可能です。'); // 説明を少し追加

        // ボタンの作成
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('お問い合わせ')
                    .setStyle(ButtonStyle.Primary),
            );

        // メッセージを送信
        await interaction.channel.send({
            embeds: [panelEmbed],
            components: [row],
        });

        // 💡 修正2: deferReplyの後の応答は editReply を使用
        await interaction.editReply({ 
            content: 'お問い合わせパネルを送信しました。'
        });
    },
};
