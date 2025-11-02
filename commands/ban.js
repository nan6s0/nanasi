const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('指定したユーザーをサーバーからBANします。')
        .addStringOption(option => 
            option.setName('target')
                .setDescription('BANするユーザーのID、またはサーバー内のメンバー')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('BANの理由')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        const targetIdentifier = interaction.options.getString('target');
        const reason = interaction.options.getString('reason');

        // ユーザーIDか、サーバー内のメンバーかを試行
        let targetUser = interaction.client.users.cache.get(targetIdentifier);
        if (!targetUser) {
            const targetMember = interaction.guild.members.cache.get(targetIdentifier) || 
                                 interaction.guild.members.cache.find(m => m.user.tag === targetIdentifier || m.displayName === targetIdentifier);
            if (targetMember) {
                targetUser = targetMember.user;
            } else {
                return interaction.reply({
                    content: '指定されたIDまたはユーザーは見つかりませんでした。',
                    ephemeral: true
                });
            }
        }
        
        const confirmationEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 BAN確認')
            .setDescription(`ユーザー **${targetUser.tag} (${targetUser.id})** をBANしますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetUser.id}>`, inline: true },
                { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' });

        const confirmButton = new ButtonBuilder()
            .setCustomId(`mod_confirm_BAN_${targetUser.id}_${Buffer.from(reason).toString('base64')}`)
            .setLabel('BANを実行')
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
