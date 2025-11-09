const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const categoryId = '1434106965423820902'; // チケットチャンネルを作成するカテゴリID
const logChannelId = '1434111754232664125'; // 作成ログを送信するチャンネルID
const staffId = '1434084127774085200'; // チケットチャンネルで権限を持つユーザー/ロールのID

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
            await interaction.deferReply({ ephemeral: true }); 

            const user = interaction.user;
            const guild = interaction.guild;
            const logChannel = guild.channels.cache.get(logChannelId);

            // 1. 既存のチケットチャンネルチェック (ユーザーがカテゴリ内に所持しているかを確認)
            const existingChannel = guild.channels.cache.find(c => 
                c.parentId === categoryId && 
                c.type === ChannelType.GuildText &&
                // ユーザーに ViewChannel 権限が許可されているかチェック
                c.permissionOverwrites.cache.some(p => p.id === user.id && p.allow.has(PermissionFlagsBits.ViewChannel))
            );

            if (existingChannel) {
                return interaction.editReply({ 
                    content: `既にチケットチャンネルがあります。複数作成することはできません: ${existingChannel}`,
                    ephemeral: true 
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
                        { id: staffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                // --- 作成ログの送信 ---
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎫 チケット作成ログ')
                    .setDescription(`**${user.tag}** がチケットを開きました。`)
                    .addFields(
                        { name: 'ユーザー', value: `<@${user.id}>`, inline: true },
                        { name: 'チャンネル', value: `<#${ticketChannel.id}>`, inline: true }
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
                
                // クローズボタン（確認ステップ）の作成
                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_close_ticket')
                        .setLabel('チケットをクローズ')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({
                    content: `**<@${user.id}>** 様、<@&${staffId}>が対応します。`, 
                    embeds: [welcomeEmbed],
                    components: [closeButton]
                });

                await interaction.editReply({ 
                    content: `チケットチャンネルを作成しました: ${ticketChannel}`,
                    ephemeral: true 
                });

            } catch (error) {
                console.error('チケット作成中にエラーが発生しました:', error);
                await interaction.editReply({ 
                    content: 'チケットの作成中にエラーが発生しました。ボットに必要な権限があるか確認してください。', 
                    ephemeral: true 
                }).catch(() => {});
            }
        }

        // ============================
        // 2. チケットクローズ処理
        // ============================

        // チケットクローズ確認ボタンの処理
        if (interaction.customId === 'confirm_close_ticket') {
            // チャンネル表示権限を持つユーザーまたはスタッフのみが実行可能
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ViewChannel)) {
                 return interaction.reply({ 
                    content: 'このボタンを押す権限がありません。', 
                    ephemeral: true 
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

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });
            return;
        }

        // チャンネル削除実行 or キャンセルボタンの処理
        if (interaction.customId === 'close_ticket' || interaction.customId === 'cancel_close') {
            await interaction.deferReply({ ephemeral: true });

            if (interaction.customId === 'close_ticket') {
                try {
                    // 1. クローズ確認メッセージ（元のメッセージ）を編集し、ボタンを無効化
                    await interaction.message.edit({
                        content: '✅ チャンネルを削除しています...',
                        embeds: [],
                        components: [], 
                    });
                    
                    // 2. Ephemeralな応答メッセージをチャンネル削除前に確定させる (Unknown Messageエラー回避)
                    await interaction.editReply({ 
                        content: 'チケットチャンネルを削除しました。このチャンネルは間もなく閉じられます。', 
                        ephemeral: true 
                    });

                    // 3. チャンネルを削除
                    await interaction.channel.delete();

                } catch (error) {
                    // チャンネル削除中にエラーが発生した場合
                    if (error.code === 10008) {
                         // Unknown Messageエラーは、チャンネルは削除済みとみなし静かに終了
                         return;
                    }
                    
                    console.error('チャンネル削除中にエラーが発生しました:', error);
                    await interaction.followUp({ 
                        content: 'チャンネルの削除中にエラーが発生しました。ボットの削除権限を確認してください。', 
                        ephemeral: true 
                    }).catch(() => {});
                }
            } else if (interaction.customId === 'cancel_close') {
                // キャンセルメッセージを編集
                await interaction.message.edit({
                    content: 'キャンセルされました。',
                    embeds: [],
                    components: [],
                });
                await interaction.editReply({ 
                    content: 'チャンネル削除の確認を取り消しました。', 
                    ephemeral: true 
                });
            }
        }
    },
};
