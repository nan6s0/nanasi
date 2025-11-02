const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        
        // モデレーション関連のボタンのみを処理
        if (!interaction.customId.startsWith('mod_')) return;

        // 1. キャンセルボタンの処理
        if (interaction.customId === 'mod_cancel') {
            await interaction.update({
                content: '🚫 モデレーション操作をキャンセルしました。',
                embeds: [],
                components: [],
                ephemeral: true
            });
            return;
        }

        // 2. 確定ボタンの処理 (mod_confirm_ACTION_TARGETID_REASON)
        if (interaction.customId.startsWith('mod_confirm_')) {
            await interaction.deferUpdate(); // 処理に時間がかかる可能性があるため遅延応答

            const parts = interaction.customId.split('_');
            const action = parts[2];
            const targetId = parts[3];
            const reasonIndex = action === 'TIMEOUT' ? 5 : 4;
            const base64Reason = parts[reasonIndex];
            const reason = Buffer.from(base64Reason, 'base64').toString('utf8');
            
            // TIMEOUTの場合のみ期間を取得
            const durationMs = action === 'TIMEOUT' ? parts[4] : null;

            const guild = interaction.guild;
            let resultMessage = '';
            let targetTag = targetId; // ログ表示用

            try {
                switch (action) {
                    case 'KICK':
                        const memberToKick = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToKick) throw new Error('メンバーが見つからないか、既にサーバーを退出しています。');
                        targetTag = memberToKick.user.tag;
                        await memberToKick.kick(`[Staff: ${interaction.user.tag}] ${reason}`);
                        resultMessage = `✅ **${targetTag}** を理由: **${reason}** でキックしました。`;
                        break;

                    case 'BAN':
                        // BANはメンバーでなくてもIDで可能
                        await guild.bans.create(targetId, { reason: `[Staff: ${interaction.user.tag}] ${reason}` });
                        
                        // ターゲットのタグを取得を試みる
                        const bannedUser = await interaction.client.users.fetch(targetId).catch(() => null);
                        targetTag = bannedUser ? bannedUser.tag : targetId;

                        resultMessage = `✅ **${targetTag}** を理由: **${reason}** でBANしました。`;
                        break;

                    case 'TIMEOUT':
                        const memberToTimeout = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToTimeout) throw new Error('メンバーが見つからないか、既にサーバーを退出しています。');
                        targetTag = memberToTimeout.user.tag;
                        await memberToTimeout.timeout(parseInt(durationMs), `[Staff: ${interaction.user.tag}] ${reason}`);
                        
                        // 表示用の期間名を取得 (例: 1時間)
                        const durationName = interaction.message.embeds[0].fields.find(f => f.name === '期間')?.value || `${parseInt(durationMs) / 3600000}時間`;
                        
                        resultMessage = `✅ **${targetTag}** を期間: **${durationName}**、理由: **${reason}** でタイムアウトしました。`;
                        break;
                    
                    case 'UNBAN':
                        await guild.bans.remove(targetId, `[Staff: ${interaction.user.tag}] ${reason}`);
                        
                        // ターゲットのタグを取得を試みる
                        const unbannedUser = await interaction.client.users.fetch(targetId).catch(() => null);
                        targetTag = unbannedUser ? unbannedUser.tag : targetId;

                        resultMessage = `✅ **${targetTag}** のBANを理由: **${reason}** で解除しました。`;
                        break;

                    case 'UNTIMEOUT':
                        const memberToUntimeout = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToUntimeout) throw new Error('メンバーが見つからないか、タイムアウトされていません。');
                        targetTag = memberToUntimeout.user.tag;

                        // タイムアウト解除は、タイムアウトを null/0 に設定する
                        await memberToUntimeout.timeout(null, `[Staff: ${interaction.user.tag}] ${reason}`);
                        resultMessage = `✅ **${targetTag}** のタイムアウトを理由: **${reason}** で解除しました。`;
                        break;

                    default:
                        resultMessage = 'エラー: 不明なモデレーションアクションです。';
                        break;
                }

            } catch (error) {
                console.error(`モデレーション実行エラー (${action}):`, error);
                resultMessage = `❌ **${action}** の実行に失敗しました。ボットの権限または階層を確認してください。\nエラー: \`${error.message}\``;
            }

            // 確認メッセージを結果で更新
            await interaction.editReply({
                content: resultMessage,
                embeds: [],
                components: [],
            });
        }
    }
};
