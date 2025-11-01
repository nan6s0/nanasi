const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const staffUserId = '707800417131692104'; // コマンド実行専用ユーザーID
const warnRoleId = '1434196623369572463'; // 警告ロールID
const logChannelId = '1434197101566365746'; // ログチャンネルID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('指定したユーザーに警告ロールを付与またはBANします。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('警告またはBANするユーザー')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('警告またはBANの理由')
                .setRequired(true))
        .setDMPermission(false), // DMでの実行を許可しない
    
    async execute(interaction) {
        // 1. 専用ユーザーのチェック
        if (interaction.user.id !== staffUserId) {
            return interaction.reply({ 
                content: 'このコマンドは特定の管理者のみ実行可能です。', 
                ephemeral: true 
            });
        }
        
        // 2. 入力値の取得と事前チェック
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        const targetMember = interaction.guild.members.cache.get(targetUser.id);
        
        if (!targetMember) {
            return interaction.reply({ 
                content: '指定されたユーザーはサーバーにいません。', 
                ephemeral: true 
            });
        }

        // 3. 実行するアクションの決定
        const isBanning = targetMember.roles.cache.has(warnRoleId);
        
        // 4. 確認メッセージ（Embed）の作成
        const actionText = isBanning ? '🚨 ユーザーBAN' : '⚠️ 警告ロール付与';
        const actionColor = isBanning ? 0xE74C3C : 0xF39C12; // 赤 or オレンジ
        
        const confirmationEmbed = new EmbedBuilder()
            .setColor(actionColor)
            .setTitle(actionText)
            .setDescription(`ユーザー **${targetUser.tag}** に対し、以下の操作を実行しようとしています。`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetUser.id}>`, inline: true },
                { name: '実行される操作', value: isBanning ? 'サーバーからBAN' : `ロール <@&${warnRoleId}> を付与`, inline: true },
                { name: '理由', value: reason }
            )
            .setFooter({ text: '以下のボタンで実行を確定してください。' })
            .setTimestamp();

        // 5. 確認ボタンの作成
        const confirmButton = new ButtonBuilder()
            // 💡 Custom IDにユーザーID、アクション、理由をエンコードして含める
            .setCustomId(`warn_confirm_${targetUser.id}_${isBanning ? 'BAN' : 'WARN'}_${Buffer.from(reason).toString('base64')}`)
            .setLabel(isBanning ? 'BANを実行' : '警告を付与')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('warn_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        // 6. 確認パネルの送信（ボタンは30分で無効化されます）
        await interaction.reply({
            embeds: [confirmationEmbed],
            components: [row],
            ephemeral: true
        });
    },
};
