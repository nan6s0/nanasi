const { Events, EmbedBuilder, ChannelType } = require('discord.js');

// === 設定ID ===
const MOD_LOG_CHANNEL_ID = '1434395552774357114'; // ログを送信するチャンネルID

/**
 * モデレーションログを専用チャンネルに送信するヘルパー関数
 * @param {Client} client - Discordクライアント
 * @param {string} action - アクション名 (KICK, BAN, TIMEOUT, ...)
 * @param {User} targetUser - 対象ユーザー
 * @param {User} executor - 実行したユーザー
 * @param {string} reason - 理由
 * @param {string|null} durationName - 期間名 (TIMEOUTのみ)
 */
async function sendModLog(client, action, targetUser, executor, reason, durationName = null) {
    const guild = client.guilds.cache.first();
    if (!guild) return console.error("モデレーションログ: ギルドが見つかりません。");

    const logChannel = guild.channels.cache.get(MOD_LOG_CHANNEL_ID);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) return console.error(`モデレーションログ: ログチャンネルID ${MOD_LOG_CHANNEL_ID} が見つからないか、テキストチャンネルではありません。`);

    let color;
    let title;

    switch (action) {
        case 'KICK':
            color = 0xF39C12; // オレンジ
            title = '👢 ユーザーキック';
            break;
        case 'BAN':
            color = 0xE74C3C; // 赤
            title = '🔨 ユーザーBAN';
            break;
        case 'TIMEOUT':
            color = 0x3498DB; // 青
            title = '⏰ ユーザータイムアウト';
            break;
        case 'UNBAN':
            color = 0x2ECC71; // 緑
            title = '🔓 BAN解除';
            break;
        case 'UNTIMEOUT':
            color = 0x2ECC71; // 緑
            title = '🗣️ タイムアウト解除';
            break;
        default:
            color = 0x95A5A6;
            title = '❓ 不明なモデレーションアクション';
    }
    
    const logEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: '対象ユーザー', value: `<@${targetUser.id}> (${targetUser.tag})\nID: \`${targetUser.id}\``, inline: false },
            { name: '実行者', value: `<@${executor.id}> (${executor.tag})`, inline: true },
            { name: 'アクション', value: action, inline: true }
        )
        .setFooter({ text: `日時` })
        .setTimestamp();

    if (durationName) {
        logEmbed.addFields({ name: '期間', value: durationName, inline: true });
    }
    
    logEmbed.addFields({ name: '理由', value: reason.substring(0, 1000) });

    try {
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('モデレーションログの送信に失敗:', error);
    }
}


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

        // 2. 確定ボタンの処理 (mod_confirm_ACTION_TARGETID_...)
        if (interaction.customId.startsWith('mod_confirm_')) {
            await interaction.deferUpdate(); // 処理に時間がかかる可能性があるため遅延応答

            const parts = interaction.customId.split('_');
            const action = parts[2];
            const targetId = parts[3];
            
            // TIMEOUTの場合のみ期間を含むため、理由のインデックスが変わる
            const reasonIndex = action === 'TIMEOUT' ? 5 : 4; 
            const base64Reason = parts[reasonIndex];
            const reason = Buffer.from(base64Reason, 'base64').toString('utf8');
            
            // TIMEOUTの場合のみ期間を取得
            const durationMs = action === 'TIMEOUT' ? parts[4] : null;

            const guild = interaction.guild;
            const executor = interaction.user;
            let resultMessage = '';
            let durationName = null;
            let targetUser;

            try {
                // ターゲットユーザーの取得 (タグ表示用)
                targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
                if (!targetUser) {
                    // BAN/UNBAN以外でユーザーが見つからない場合はエラー
                    if (action !== 'BAN' && action !== 'UNBAN') {
                        throw new Error('メンバーが見つからないか、既にサーバーを退出しています。');
                    }
                    // BAN/UNBANの場合は、IDで仮のUserオブジェクトを作成
                    targetUser = { id: targetId, tag: `不明なユーザー (${targetId})` };
                }

                switch (action) {
                    case 'KICK':
                        const memberToKick = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToKick) throw new Error('メンバーが見つからないか、既にサーバーを退出しています。');
                        await memberToKick.kick(`[Staff: ${executor.tag}] ${reason}`);
                        resultMessage = `✅ **${targetUser.tag}** を理由: **${reason}** でキックしました。`;
                        break;

                    case 'BAN':
                        await guild.bans.create(targetId, { reason: `[Staff: ${executor.tag}] ${reason}` });
                        resultMessage = `✅ **${targetUser.tag}** を理由: **${reason}** でBANしました。`;
                        break;

                    case 'TIMEOUT':
                        const memberToTimeout = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToTimeout) throw new Error('メンバーが見つからないか、既にサーバーを退出しています。');
                        
                        durationName = interaction.message.embeds[0].fields.find(f => f.name === '期間')?.value || `${parseInt(durationMs) / 3600000}時間`;
                        
                        await memberToTimeout.timeout(parseInt(durationMs), `[Staff: ${executor.tag}] ${reason}`);
                        resultMessage = `✅ **${targetUser.tag}** を期間: **${durationName}**、理由: **${reason}** でタイムアウトしました。`;
                        break;
                    
                    case 'UNBAN':
                        await guild.bans.remove(targetId, `[Staff: ${executor.tag}] ${reason}`);
                        resultMessage = `✅ **${targetUser.tag}** のBANを理由: **${reason}** で解除しました。`;
                        break;

                    case 'UNTIMEOUT':
                        const memberToUntimeout = await guild.members.fetch(targetId).catch(() => null);
                        if (!memberToUntimeout) throw new Error('メンバーが見つからないか、タイムアウトされていません。');

                        // タイムアウト解除は duration: null を設定
                        await memberToUntimeout.timeout(null, `[Staff: ${executor.tag}] ${reason}`);
                        resultMessage = `✅ **${targetUser.tag}** のタイムアウトを理由: **${reason}** で解除しました。`;
                        break;

                    default:
                        resultMessage = 'エラー: 不明なモデレーションアクションです。';
                        break;
                }

                // 実行に成功した場合のみログを送信
                if (resultMessage.startsWith('✅')) {
                    await sendModLog(interaction.client, action, targetUser, executor, reason, durationName);
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
