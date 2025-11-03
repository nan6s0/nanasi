const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// MessageFlagsをインポートし、ephemeral: trueをflags: 64に置き換えます
const { MessageFlags } = require('discord.js');
const EPHEMERAL_FLAG = MessageFlags.Ephemeral; // 64

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

        // 1. ユーザーIDとして取得を試みる (キャッシュから)
        let targetUser = interaction.client.users.cache.get(targetIdentifier);
        
        if (!targetUser) {
            // 2. メンバーとして取得を試みる
            const targetMember = interaction.guild.members.cache.get(targetIdentifier) || 
                                 interaction.guild.members.cache.find(m => m.user.tag === targetIdentifier || m.displayName === targetIdentifier);
            
            if (targetMember) {
                targetUser = targetMember.user;
            } else {
                // 3. サーバー外のユーザー/不明なユーザーIDとして処理 (★ ここを修正)
                
                // 有効なDiscord IDの形式か確認 (簡易的なチェック)
                if (!/^\d{17,19}$/.test(targetIdentifier)) {
                    return interaction.reply({
                        content: '指定された識別子 (ID/タグ) が無効です。IDの場合は17～19桁の数字で指定してください。',
                        flags: EPHEMERAL_FLAG // ephemeral: true の代替
                    });
                }

                // サーバー外のユーザーとして扱うため、一時的なUserオブジェクトを作成
                targetUser = {
                    id: targetIdentifier,
                    tag: `サーバー外ユーザー (${targetIdentifier})` 
                };
            }
        }

        // 既にBANされているか確認（任意だがUX向上に役立つ）
        try {
            const banEntry = await interaction.guild.bans.fetch(targetUser.id).catch(() => null);
            if (banEntry) {
                return interaction.reply({
                    content: `ユーザー **${targetUser.tag}** は既にBANされています。`,
                    flags: EPHEMERAL_FLAG
                });
            }
        } catch (e) {
            // BANリストのフェッチ権限がない、またはAPIエラー
            console.error('BANリストの確認中にエラー:', e.message);
        }

        const confirmationEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🚨 BAN確認')
            .setDescription(`ユーザー **${targetUser.tag} (${targetUser.id})** をBANしますか？`)
            .addFields(
                { name: '対象ユーザー', value: targetUser.tag.includes('サーバー外') ? targetUser.tag : `<@${targetUser.id}>`, inline: true },
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
            flags: EPHEMERAL_FLAG // ephemeral: true の代替
        });
    },
};
