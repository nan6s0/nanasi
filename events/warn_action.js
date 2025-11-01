const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const staffUserId = '707800417131692104'; // コマンド実行専用ユーザーID
const warnRoleId = '1434196623369572463'; // 警告ロールID
const logChannelId = '1434197101566365746'; // ログチャンネルID

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        
        // 警告/BAN関連のボタンのみを処理
        if (!interaction.customId.startsWith('warn_')) return;

        // ログチャンネルの取得
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        // 1. キャンセルボタンの処理
        if (interaction.customId === 'warn_cancel') {
            // コマンドを実行したユーザー（確認ボタンを押したユーザー）が専用ユーザーかチェック
            if (interaction.user.id !== staffUserId) {
                 return interaction.reply({ 
                    content: 'あなたにはこの操作を実行する権限がありません。', 
                    ephemeral: true 
                });
            }
            
            // 確認メッセージをキャンセル通知で上書き
            await interaction.update({
                content: '🚫 警告/BAN操作をキャンセルしました。',
                embeds: [],
                components: [],
                ephemeral: true
            });
            return;
        }

        // 2. 確定ボタンの処理 (warn_confirm_...)
        const [_, __, targetId, action, base64Reason] = interaction.customId.split('_');
        const reason = Buffer.from(base64Reason, 'base64').toString('utf8');
        const targetMember = interaction.guild.members.cache.get(targetId);
        
        // 権限チェック
        if (interaction.user.id !== staffUserId) {
            return interaction.reply({ 
                content: 'あなたにはこの操作を実行する権限がありません。', 
                ephemeral: true 
            });
        }
        
        if (!targetMember) {
            await interaction.update({ content: 'ユーザーがサーバーから退出しました。操作をキャンセルします。', embeds: [], components: [], ephemeral: true });
            return;
        }

        let resultMessage = '';
        let logEmbed;

        // --- BAN実行 ---
        if (action === 'BAN') {
            try {
                // BANの実行
                await targetMember.ban({ reason: `[Staff: ${interaction.user.tag}] ${reason}` });
                resultMessage = `✅ <@${targetId}> を理由: **${reason}** でサーバーからBANしました。`;
                
                // BANログ
                logEmbed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🚨 ユーザーBANログ')
                    .setDescription(`**${targetMember.user.tag}** がBANされました。`)
                    .addFields(
                        { name: '対象ユーザー', value: `<@${targetId}> (${targetId})`, inline: false },
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: false }
                    )
                    .setTimestamp();

            } catch (error) {
                console.error(`BAN実行エラー: ${error}`);
                resultMessage = `❌ BANの実行に失敗しました。ボットの権限を確認してください。`;
                logEmbed = new EmbedBuilder().setColor(0x808080).setDescription(`BAN失敗: ${error.message}`);
            }
        
        // --- 警告ロール付与実行 ---
        } else if (action === 'WARN') {
            try {
                // ロール付与の実行
                await targetMember.roles.add(warnRoleId, `[Staff: ${interaction.user.tag}] ${reason}`);
                resultMessage = `✅ <@${targetId}> に <@&${warnRoleId}> ロールを付与しました。`;

                // 警告ログ
                logEmbed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('⚠️ ユーザー警告ログ')
                    .setDescription(`**${targetMember.user.tag}** に警告ロールが付与されました。`)
                    .addFields(
                        { name: '対象ユーザー', value: `<@${targetId}> (${targetId})`, inline: false },
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: false }
                    )
                    .setTimestamp();

            } catch (error) {
                console.error(`警告ロール付与エラー: ${error}`);
                resultMessage = `❌ 警告ロールの付与に失敗しました。ボットの権限を確認してください。`;
                logEmbed = new EmbedBuilder().setColor(0x808080).setDescription(`警告付与失敗: ${error.message}`);
            }
        }
        
        // 3. ログの送信
        if (logEmbed && logChannel) {
            try {
                await logChannel.send({ embeds: [logEmbed] });
            } catch (e) {
                console.error('ログチャンネルへの送信に失敗しました:', e);
            }
        }

        // 4. 確認メッセージの更新
        await interaction.update({
            content: resultMessage,
            embeds: [],
            components: [],
            ephemeral: true
        });
    }
};
