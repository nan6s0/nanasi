const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const targetGuildId = '1434084039647821836'; // 対象サーバーID
// ⚠️ 退出ログを送信するチャンネルIDは、歓迎チャンネルとは別に設定することを推奨
const leaveLogChannelId = '1434150986980786198'; // 退出メッセージ送信先チャンネルID

module.exports = {
    // GuildMemberRemove イベントを購読
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        // 意図しないサーバーでの実行を防ぐため、対象サーバーIDをチェック
        if (member.guild.id !== targetGuildId) return;

        // ログチャンネルを取得
        const logChannel = member.guild.channels.cache.get(leaveLogChannelId);

        if (!logChannel) {
            console.error(`ログチャンネルID ${leaveLogChannelId} が見つかりません。`);
            return;
        }

        // メンバーがサーバーに参加していた期間を計算
        const joinTimestamp = member.joinedTimestamp;
        let stayDuration = '不明';

        if (joinTimestamp) {
            const ms = Date.now() - joinTimestamp;
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));
            const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            
            let durationParts = [];
            if (days > 0) durationParts.push(`${days}日`);
            if (hours > 0) durationParts.push(`${hours}時間`);
            if (minutes > 0) durationParts.push(`${minutes}分`);
            
            stayDuration = durationParts.length > 0 ? durationParts.join('') : '数秒以内';
        }

        // 退出ログ用Embedの作成
        const leaveEmbed = new EmbedBuilder()
            .setColor(0xE74C3C) // 赤色 (退出/警告の色)
            .setTitle('🚪 メンバー退出')
            .setDescription(`ユーザーがサーバーを退出しました。`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 ユーザー', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                { name: '📅 参加期間', value: `\`${stayDuration}\``, inline: true },
                { name: '👥 現在のメンバー数', value: `\`${member.guild.memberCount}\` 人`, inline: true }
            )
            .setFooter({ text: `ユーザーID: ${member.id}` })
            .setTimestamp();
        
        // ユーザーが持っていたロールの一覧を取得 (Botロールは除外)
        const roles = member.roles.cache
            .filter(role => role.name !== '@everyone' && !role.managed)
            .map(role => role.name)
            .join(', ') || 'なし';
        
        leaveEmbed.addFields({ 
            name: '🏷️ 保持していたロール', 
            value: roles.length > 1024 ? '多すぎるため省略...' : roles, 
            inline: false 
        });

        try {
            await logChannel.send({ embeds: [leaveEmbed] });
        } catch (error) {
            console.error(`退出ログチャンネルへのメッセージ送信中にエラーが発生しました: ${error}`);
        }
    },
};
