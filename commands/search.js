const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// === 設定ID ===
const targetThreadId = '1434099904698908754'; // /searchコマンドを送信するスレッドID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('配布スレッド内でキーワード検索パネルを表示します。')
        .setDMPermission(false),
    
    async execute(interaction) {
        // 実行チャンネルのチェック
        if (interaction.channelId !== targetThreadId) {
            return interaction.reply({
                content: `<#${targetThreadId}> のスレッド内でのみ実行可能です。`,
                ephemeral: true
            });
        }

        // Embedの作成
        const searchEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🔍 スレッド検索')
            .setDescription('以下のボタンを押し、開いたフォームに**検索したい単語**を入力し送信してください。');

        // ボタンの作成 (カスタムIDは events/search_action.js で処理)
        const searchButton = new ButtonBuilder()
            .setCustomId('open_search_modal')
            .setLabel('検索')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(searchButton);

        // メッセージを送信
        await interaction.reply({
            embeds: [searchEmbed],
            components: [row],
            ephemeral: false // 公開メッセージとして送信
        });
    },
};
