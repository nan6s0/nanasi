const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

// 権限専用のコマンドですが、説明は空にします
const targetChannelId = '707800417131692104';

module.exports = {
    // コマンドは公開しませんが、実行は可能です
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('お問い合わせパネルを送信します。'),
    
    async execute(interaction) {
        // 707800417131692104専用コマンドとしてチェック
        if (interaction.channelId !== targetChannelId) {
            return interaction.reply({ 
                content: 'このコマンドは特定のチャンネルでのみ実行可能です。', 
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
