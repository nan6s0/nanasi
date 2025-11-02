const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('指定したユーザーの詳細情報を表示します。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('情報を表示するユーザー')
                .setRequired(false)) // オプションなので任意
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel) 
        .setDMPermission(false),
    
    async execute(interaction) {
        // ターゲットユーザーが指定されていなければ、コマンド実行者自身を対象とする
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetMember = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // タイムスタンプをローカライズ表示用に変換するヘルパー関数
        const formatDate = (dateMs) => {
            if (!dateMs) return '情報なし';
            return `<t:${Math.floor(dateMs / 1000)}:f> (<t:${Math.floor(dateMs / 1000)}:R>)`;
        };

        const userInfoEmbed = new EmbedBuilder()
            .setColor(targetMember?.displayColor || 0x7289DA)
            .setTitle(`👤 ${targetUser.tag} の情報`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'ユーザーID', value: `\`${targetUser.id}\``, inline: true },
                { name: 'ボット', value: targetUser.bot ? '✅ はい' : '❌ いいえ', inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                
                { name: 'アカウント作成日時', value: formatDate(targetUser.createdTimestamp), inline: false },
                { name: 'サーバー参加日時', value: targetMember ? formatDate(targetMember.joinedTimestamp) : 'サーバーにいません', inline: false }
            );

        if (targetMember) {
            const roles = targetMember.roles.cache
                .filter(role => role.id !== interaction.guildId) // @everyone を除く
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .join(', ');

            userInfoEmbed.addFields(
                { name: 'ニックネーム', value: targetMember.nickname || 'なし', inline: true },
                { name: '現在のタイムアウト状態', value: targetMember.isCommunicationDisabled() ? '⚠️ タイムアウト中' : '✅ なし', inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: `所持ロール (${targetMember.roles.cache.size - 1})`, value: roles.substring(0, 1024) || 'なし', inline: false }
            );
        }

        await interaction.reply({ embeds: [userInfoEmbed], ephemeral: false });
    },
};
