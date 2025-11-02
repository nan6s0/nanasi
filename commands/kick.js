const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('指定したメンバーをサーバーからキックします。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('キックするメンバー')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('キックの理由')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        
        const confirmationEmbed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⚠️ キック確認')
            .setDescription(`ユーザー **${targetUser.tag}** をキックしますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetUser.id}>`, inline: true },
                { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' });

        const confirmButton = new ButtonBuilder()
            .setCustomId(`mod_confirm_KICK_${targetUser.id}_${Buffer.from(reason).toString('base64')}`)
            .setLabel('キックを実行')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('mod_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [confirmationEmbed],
            components: [row],
            ephemeral: true
        });
    },
};
