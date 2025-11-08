const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const categoryId = '1434106965423820902'; // チケットチャンネルを作成するカテゴリID
const logChannelId = '1434111754232664125'; // 作成ログを送信するチャンネルID
const staffId = '707800417131692104'; // チケットチャンネルで権限を持つユーザー/ロールのID

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
            // タイムアウトエラー(10062)を防ぐため、最初にdeferReply
            await interaction.deferReply({ ephemeral: true }); 

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
                    ephemeral: true 
                });
            }

            // 2. チャンネル名の生成 (新しいフォーマット: 🎫｜ユーザー名)
            // ユーザー名の特殊文字を置換せず、そのまま使用
            const channelName = `🎫｜${user.username}`; 

            try {
                // 3. チャンネルの作成
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        // @everyone には表示を拒否
                        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                        // チケット作成者には表示と送信を許可
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        // スタッフには表示と送信を許可
                        { id: staffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                // --- 作成ログの送信（日本時間 UTC+6） ---
                // 注意: DiscordのタイムスタンプはUTCを使用するため、ここではローカルタイムゾーンを考慮せずUTCで表示
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎫 チケット作成ログ')
                    .setDescription(`**${user.tag}** がチケットを開きました。`)
                    .addFields(
                        { name: 'ユーザー', value: `<@${user.id}>`, inline: true },
                        { name: 'チャンネル', value: `<#${ticketChannel.id}>`, inline: true }
                    )
                    .setTimestamp(); // UTCで時刻を表示
                
                if (logChannel) {
                    await logChannel.send({ embeds: [logEmbed] });
                }

                // --- チケットチャンネルへのメッセージ送信 ---
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('お問い合わせありがとうございます！')
                    .setDescription('お問い合わせ内容を送信してお待ちください。');
                
                // クローズボタンの作成
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
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ViewChannel) && interaction.user.id !== staffId) {
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

            // メッセージに返信することで、確認ボタンを表示
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

            // スタッフ（707800417131692104）のみが最終決定ボタンを押せるようにチェック
            // ※ confirm_close_ticket は誰でも押せるが、削除実行はスタッフのみに限定
            // if (interaction.user.id !== staffId) {
            //     return interaction.editReply({ 
            //         content: 'この最終削除ボタンはスタッフ専用です。', 
            //         ephemeral: true 
            //     });
            // }

            if (interaction.customId === 'close_ticket') {
                try {
                    // チャンネルを削除する前に、確認メッセージを編集（ボタンを無効化）
                    await interaction.message.edit({
                        content: '✅ チャンネルを削除しています...',
                        embeds: [],
                        components: [], // ボタンを削除
                    });
                    
                    // チャンネルを削除
                    await interaction.channel.delete();
                    
                    // deferReplyした応答をeditReplyで完了させる
                    await interaction.editReply({ 
                        content: 'チケットチャンネルを削除しました。', 
                        ephemeral: true 
                    });

                } catch (error) {
                    console.error('チャンネル削除中にエラーが発生しました:', error);
                    await interaction.editReply({ 
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
