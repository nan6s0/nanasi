const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('指定したユーザーIDのBANを解除します。')
        .addStringOption(option => 
            option.setName('target_id')
                .setDescription('BANを解除するユーザーのID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('BAN解除の理由')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        const targetId = interaction.options.getString('target_id');
        const reason = interaction.options.getString('reason');

        // ターゲットユーザーが実際にBANされているか確認（UI上の表示のため必須ではないが推奨）
        let bannedUserTag = '不明なユーザー';
        try {
            const bannedUsers = await interaction.guild.bans.fetch();
            const banEntry = bannedUsers.find(ban => ban.user.id === targetId);
            if (banEntry) {
                bannedUserTag = banEntry.user.tag;
            } else {
                return interaction.reply({
                    content: `ユーザーID \`${targetId}\` は現在BANされていません。`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('BANリストのフェッチに失敗:', error);
            bannedUserTag = `ID: ${targetId} (フェッチエラー)`;
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🔓 BAN解除確認')
            .setDescription(`ユーザー **${bannedUserTag} (${targetId})** のBANを解除しますか？`)
            .addFields(
                { name: '対象ユーザーID', value: `\`${targetId}\``, inline: true },
                { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' });

        const confirmButton = new ButtonBuilder()
            .setCustomId(`mod_confirm_UNBAN_${targetId}_${Buffer.from(reason).toString('base64')}`)
            .setLabel('BANを解除')
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
