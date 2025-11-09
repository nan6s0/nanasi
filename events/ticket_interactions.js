const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// === 設定IDの変更 ===
const categoryId = '1434106965423820902'; // チケットチャンネルを作成するカテゴリID
const logChannelId = '1434111754232664125'; // 作成ログを送信するチャンネルID

// スタッフのユーザーIDとロールID
const staffUserId = '707800417131692104'; // 個別のスタッフユーザーID
const staffRoleId = '1434492742297456660'; // メンションしたいスタッフロールID

// Ephemeralフラグ (64)
const EPHEMERAL_FLAG = 64;

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // ボタンインタラクションのみを処理
        if (!interaction.isButton()) return;
        
        // ============================
        // 1. チケットオープンボタンの処理
        // ============================
        if (interaction.customId === 'open_ticket') {
            await interaction.deferReply({ flags: EPHEMERAL_FLAG });

            const user = interaction.user;
            const guild = interaction.guild;
            const logChannel = guild.channels.cache.get(logChannelId);

            // 1. 既存のチケットチャンネルチェック (ユーザーがカテゴリ内に所持しているかを確認)
            const existingChannel = guild.channels.cache.find(c => 
                c.parentId === categoryId && 
                c.type === ChannelType.GuildText &&
                c.permissionOverwrites.cache.some(p => p.id === user.id && p.allow.has(PermissionFlagsBits.ViewChannel))
            );

            if (existingChannel) {
                return interaction.editReply({ 
                    content: `既にチケットチャンネルがあります。複数作成することはできません: ${existingChannel}`,
                });
            }

            // 2. チャンネル名の生成: 🎫｜ユーザー名
            const channelName = `🎫｜${user.username}`; 

            try {
                // 3. チャンネルの作成
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: staffUserId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                // --- 作成ログの送信 ---
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎫 チケット作成ログ')
                    .setDescription(`**${user.tag}** がチケットを開きました。`)
                    .addFields(
                        { name: 'ユーザー', value: `<@${user.id}>`, inline: true },
                        { name: 'チャンネル名', value: `\`#${ticketChannel.name}\``, inline: true }
                    )
                    .setTimestamp();
                
                if (logChannel) {
                    await logChannel.send({ embeds: [logEmbed] });
                }

                // --- チケットチャンネルへのメッセージ送信 ---
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('お問い合わせありがとうございます！')
                    .setDescription('お問い合わせ内容を送信してお待ちください。');
                
                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_close_ticket')
                        .setLabel('チケットをクローズ')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({
                    content: `<@${user.id}> 様、<@&${staffRoleId}>が対応します。`, 
                    embeds: [welcomeEmbed],
                    components: [closeButton]
                });

                await interaction.editReply({ 
                    content: `チケットチャンネルを作成しました: ${ticketChannel}`,
                });

            } catch (error) {
                console.error('チケット作成中にエラーが発生しました:', error);
                await interaction.editReply({ 
                    content: 'チケットの作成中にエラーが発生しました。ボットに必要な権限があるか確認してください。', 
                }).catch(() => {});
            }
        }

        // ============================
        // 2. チケットクローズ処理
        // ============================

        // チケットクローズ確認ボタンの処理
        if (interaction.customId === 'confirm_close_ticket') {
            await interaction.deferReply({ flags: EPHEMERAL_FLAG }); 

            // チャンネル表示権限を持つユーザーまたはスタッフのみが実行可能
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ViewChannel)) {
                 return interaction.editReply({ 
                    content: 'このボタンを押す権限がありません。', 
                });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xCD5C5C)
                .setDescription('**本当にこのチケットをクローズしますか？**\nクローズするとチャンネルが削除されます。');

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('はい、削除します')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('キャンセル')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.editReply({
                embeds: [confirmEmbed],
                components: [confirmRow],
            });
            return;
        }

        // チャンネル削除実行 or キャンセルボタンの処理
        if (interaction.customId === 'close_ticket' || interaction.customId === 'cancel_close') {
            // 💡 修正: 処理開始時に deferReply を実行
            await interaction.deferReply({ flags: EPHEMERAL_FLAG });

            const channel = interaction.channel;
            const closer = interaction.user;

            if (interaction.customId === 'close_ticket') {
                
                // 1. クローズ確認メッセージ（元のメッセージ）を編集し、ボタンを無効化
                try {
                    // editReplyはdeferReplyの後に来るため、ここでの編集はeditReply/followUpの対象外。
                    // 元のメッセージ (embedとボタンがあるメッセージ) を編集。
                    await interaction.message.edit({
                        content: '✅ チャンネルを削除しています...',
                        embeds: [],
                        components: [], 
                    });
                } catch (e) {
                    if (e.code !== 10008) {
                        console.error('確認メッセージの編集中にエラーが発生しました:', e);
                    }
                }
                
                try {
                    // 2. Ephemeralな応答メッセージをチャンネル削除前に確定させる 
                    await interaction.editReply({ 
                        content: 'チケットチャンネルを削除しました。このチャンネルは間もなく閉じられます。', 
                    });

                    // --- クローズログの送信 (削除前に実行) ---
                    const logChannel = channel.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const closeLogEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('❌ チケットクローズログ')
                            .setDescription(`チケットチャンネルがクローズされました。`)
                            .addFields(
                                { name: 'チャンネル名', value: `\`#${channel.name}\``, inline: true },
                                { name: '実行者', value: `<@${closer.id}>`, inline: true }
                            )
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [closeLogEmbed] });
                    }
                    // --- ログ送信完了 ---

                    // 3. チャンネルを削除
                    await channel.delete();

                } catch (error) {
                    // チャンネル削除中にエラーが発生した場合
                    if (error.code === 10008) { 
                         return;
                    }
                    
                    console.error('チャンネル削除中にエラーが発生しました:', error);
                    await interaction.followUp({ 
                        content: 'チャンネルの削除中にエラーが発生しました。ボットの削除権限を確認してください。', 
                        flags: EPHEMERAL_FLAG 
                    }).catch(() => {});
                }
            } else if (interaction.customId === 'cancel_close') {
                // キャンセルメッセージを編集 (元のメッセージを編集)
                try {
                    await interaction.message.edit({
                        content: 'キャンセルされました。',
                        embeds: [],
                        components: [],
                    });
                } catch (e) {
                    if (e.code !== 10008) {
                        console.error('キャンセルメッセージの編集中にエラーが発生しました:', e);
                    }
                }

                // Ephemeralな応答を編集
                await interaction.editReply({ 
                    content: 'チャンネル削除の確認を取り消しました。', 
                });
            }
        }
    },
};
