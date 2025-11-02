const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('指定したメンバーをタイムアウトします。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('タイムアウトするメンバー')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('タイムアウト期間')
                .setRequired(true)
                .addChoices(
                    { name: '10分', value: '600000' },
                    { name: '1時間', value: '3600000' },
                    { name: '6時間', value: '21600000' },
                    { name: '12時間', value: '43200000' },
                    { name: '1日', value: '86400000' },
                    { name: '7日', value: '604800000' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('タイムアウトの理由')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const durationMs = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');

        // メンバーオブジェクトを取得し、権限チェックと状態チェックを行う
        const targetMember = interaction.guild.members.cache.get(targetUser.id);

        if (!targetMember) {
            return interaction.reply({
                content: '指定されたユーザーはサーバーにいません。',
                flags: 64 // ephemeral: true の代替
            });
        }

        // 既にタイムアウトされているかチェック（より丁寧なエラー処理）
        if (targetMember.isCommunicationDisabled()) {
             // 💡 修正点: flags: 64 を使用
            return interaction.reply({
                content: `<@${targetUser.id}> は現在既にタイムアウト中です。解除するには \`/untimeout\` を使用してください。`,
                flags: 64
            });
        }

        // 表示用の期間文字列を取得
        const durationName = interaction.options.get('duration').choices.find(c => c.value === durationMs).name;
        
        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🕒 タイムアウト確認')
            .setDescription(`ユーザー **${targetUser.tag}** をタイムアウトしますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetUser.id}>`, inline: true },
                { name: '期間', value: durationName, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' });

        const confirmButton = new ButtonBuilder()
            // Custom IDに期間をミリ秒で含める
            .setCustomId(`mod_confirm_TIMEOUT_${targetUser.id}_${durationMs}_${Buffer.from(reason).toString('base64')}`)
            .setLabel('タイムアウトを実行')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('mod_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [confirmationEmbed],
            components: [row],
            // ★ 修正点: ephemeral: true を flags: 64 に変更
            flags: 64 
        });
    },
};
