const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const forumChannelId = '1434095946958114918'; // 監視対象のフォーラムチャンネルID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('presentlist')
        .setDescription('配布フォーラムの統計情報を表示します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel) // 誰でも実行可能
        .setDMPermission(false),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false }); // 処理に時間がかかる可能性があるため遅延応答

        const guild = interaction.guild;
        const forumChannel = guild.channels.cache.get(forumChannelId) || await guild.channels.fetch(forumChannelId).catch(() => null);

        if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
            return interaction.editReply({
                content: `エラー: 設定されたフォーラムチャンネルID \`${forumChannelId}\` が見つからないか、フォーラムではありません。`,
            });
        }

        try {
            // アクティブなスレッドをすべてフェッチ
            const activeThreads = await forumChannel.threads.fetchActive({ force: true });
            const activeThreadCount = activeThreads.threads.size;
            
            // アーカイブ済みのスレッドもカウント
            const archivedThreads = await forumChannel.threads.fetchArchived({ type: 'public', limit: 100 }); // 最新の100件を取得
            const archivedThreadCount = archivedThreads.threads.size;
            
            // 💡 スレッド数の合計 (簡易版)
            const totalThreadCount = activeThreadCount + archivedThreadCount; 
            
            // 💡 統計の計算
            let totalMembers = 0;
            let newestThread = null;
            let oldestThread = null;

            const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];
            
            for (const thread of allThreads) {
                // スレッド作成日時を比較
                if (!newestThread || thread.createdTimestamp > newestThread.createdTimestamp) {
                    newestThread = thread;
                }
                if (!oldestThread || thread.createdTimestamp < oldestThread.createdTimestamp) {
                    oldestThread = thread;
                }
                // メンバー数は大量になる可能性があるため、ここでは省略するか、必要な場合にのみフェッチします。
            }

            const statsEmbed = new EmbedBuilder()
                .setColor(0x7289DA)
                .setTitle(`📊 配布フォーラム統計 (${forumChannel.name})`)
                .setDescription(`チャンネル <#${forumChannelId}> の現在の統計情報です。`)
                .addFields(
                    { name: '総スレッド数 (概算)', value: `**${totalThreadCount}** 件`, inline: true },
                    { name: 'アクティブなスレッド', value: `${activeThreadCount} 件`, inline: true },
                    { name: 'サーバー総メンバー数', value: `${guild.memberCount} 人`, inline: true },
                    
                    { name: '\u200B', value: '\u200B' }, // スペーサー
                    
                    { name: '最新の配布', value: newestThread ? `[${newestThread.name}](${newestThread.url})` : 'なし', inline: false },
                    { name: '最初の配布', value: oldestThread ? `[${oldestThread.name}](${oldestThread.url})` : 'なし', inline: false },
                    
                    { name: '\u200B', value: '\u200B' } // スペーサー
                )
                .setFooter({ text: '統計はアクティブなスレッドと最新のアーカイブスレッドに基づいています。' })
                .setTimestamp();

            await interaction.editReply({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('統計情報取得中にエラーが発生しました:', error);
            await interaction.editReply({ 
                content: '統計情報の取得中にエラーが発生しました。ボットに「履歴を読む」権限があるか確認してください。', 
            });
        }
    },
};
