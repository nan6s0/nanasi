const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('指定したメンバーのタイムアウトを解除します。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('タイムアウトを解除するメンバー')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('タイムアウト解除の理由')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const targetMember = interaction.guild.members.cache.get(targetUser.id);

        if (!targetMember || !targetMember.isCommunicationDisabled()) {
            return interaction.reply({
                content: `<@${targetUser.id}> は現在タイムアウトされていません。`,
                ephemeral: true
            });
        }
        
        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🔓 タイムアウト解除確認')
            .setDescription(`ユーザー **${targetUser.tag}** のタイムアウトを解除しますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetUser.id}>`, inline: true },
                { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' });

        const confirmButton = new ButtonBuilder()
            .setCustomId(`mod_confirm_UNTIMEOUT_${targetUser.id}_${Buffer.from(reason).toString('base64')}`)
            .setLabel('タイムアウトを解除')
            .setStyle(ButtonStyle.Success);

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
