const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('free-code')
        .setDescription('利用可能な無料のボットコードを閲覧・取得できます。')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        // Embedとボタンでパネルを公開チャンネルに送信
        const panelEmbed = new EmbedBuilder()
            .setColor(0x3498DB) // 青
            .setTitle('📜 無料コード配布パネル 📜')
            .setDescription('以下のボタンを押して、公開されているボットコード（`commands`または`events`フォルダ）を無料で取得できます。')
            .addFields(
                { name: '✅ 利用可能なコード', value: 'このボットに現在実装されているスラッシュコマンドやイベントのサンプルコード', inline: false }
            )
            .setFooter({ text: 'ボタンを押すと、あなたにだけ見えるメニューが表示されます。' });

        const purchaseButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('free_code_start_purchase')
                .setLabel('無料でコードを購入')
                .setStyle(ButtonStyle.Success)
        );

        // 公開チャンネルに応答
        await interaction.reply({
            embeds: [panelEmbed],
            components: [purchaseButton],
        });
    },
};
