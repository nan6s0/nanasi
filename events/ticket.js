const { Events, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// === 設定ID ===
const categoryId = '1434106965423820902'; // チケットチャンネルを作成するカテゴリID
const logChannelId = '1434111754232664125'; // 作成ログを送信するチャンネルID
const staffId = '707800417131692104'; // チケットチャンネルで権限を持つユーザー/ロールのID

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // ============================
        // 1. チケットオープンボタンの処理
        // ============================
        if (interaction.isButton() && interaction.customId === 'open_ticket') {
            await interaction.deferReply({ ephemeral: true }); // 処理中は「考え中」を表示

            const user = interaction.user;
            const guild = interaction.guild;
            const logChannel = guild.channels.cache.get(logChannelId);

            // チャンネル名の生成 (例: ticket-username)
            const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

            try {
                // チャンネルの作成
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: categoryId, // 指定されたカテゴリ
                    permissionOverwrites: [
                        // @everyoneの権限設定 (メッセージ閲覧・送信を拒否)
                        {
                            id: guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        // チャンネル作成者 (ユーザー) の権限設定 (閲覧・送信を許可)
                        {
                            id: user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        // 707800417131692104 (専用ユーザー/ロール) の権限設定 (閲覧・送信を許可)
                        {
                            id: staffId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                    ],
                });

                // --- 作成ログの送信（日本時間 UTC+6） ---
                const now = new Date();
                // UTC+6 (日本時間 JST UTC+9 ではないので注意) の時刻を文字列として生成
                const jstPlus6 = new Date(now.getTime() + (6 * 60 * 60 * 1000)); 
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎫 チケット作成ログ')
                    .setDescription(`**${user.tag}** がチケットを開きました。`)
                    .addFields(
                        { name: 'ユーザー', value: `<@${user.id}>`, inline: true },
                        { name: 'チャンネル', value: `<#${ticketChannel.id}>`, inline: true },
                        { name: '時刻 (UTC+6)', value: `${jstPlus6.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`, inline: false }
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

                await ticketChannel.send({
                    content: `<@${user.id}> <@${staffId}>`, // メンション
                    embeds: [welcomeEmbed]
                });

                await interaction.editReply({ 
                    content: `チケットチャンネルを作成しました: ${ticketChannel}`,
                    ephemeral: true 
                });

            } catch (error) {
                console.error('チケット作成中にエラーが発生しました:', error);
                await interaction.editReply({ 
                    content: 'チケットの作成中にエラーが発生しました。', 
                    ephemeral: true 
                });
            }
            return;
        }

        // ============================
        // 2. チケットクローズコマンドの処理
        // ============================
        if (interaction.isMessageCreate()) {
            const message = interaction;
            // 707800417131692104からのメッセージかつ「チ閉じると」というテキスト
            if (message.author.id === staffId && message.content === 'チ閉じると') {
                const channel = message.channel;

                // カテゴリIDの確認 (チケットチャンネル内でのみ有効とする)
                if (channel.parentId !== categoryId) return;

                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('チャンネルを閉じますか？')
                    .setDescription('「閉じる」を押すとこのチケットチャンネルは削除されます。');

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('閉じる')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('cancel_close')
                            .setLabel('キャンセル')
                            .setStyle(ButtonStyle.Secondary),
                    );

                await channel.send({
                    embeds: [confirmEmbed],
                    components: [row],
                });

                await message.delete(); // 「チ閉じると」メッセージを削除
            }
            return;
        }


        // ============================
        // 3. チケットクローズボタンの処理
        // ============================
        if (interaction.isButton() && (interaction.customId === 'close_ticket' || interaction.customId === 'cancel_close')) {
            await interaction.deferReply({ ephemeral: true });

            // 707800417131692104専用ボタン
            if (interaction.user.id !== staffId) {
                return interaction.editReply({ 
                    content: 'このボタンはあなた専用ではありません。', 
                    ephemeral: true 
                });
            }

            if (interaction.customId === 'close_ticket') {
                // チャンネルの削除
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('チャンネル削除中にエラーが発生しました:', error);
                    await interaction.editReply({ 
                        content: 'チャンネルの削除中にエラーが発生しました。', 
                        ephemeral: true 
                    });
                }
            } else if (interaction.customId === 'cancel_close') {
                // キャンセルメッセージを編集
                await interaction.message.edit({
                    content: 'チャンネル削除をキャンセルしました。',
                    embeds: [],
                    components: [],
                });
                await interaction.editReply({ 
                    content: 'チャンネル削除の確認を取り消しました。', 
                    ephemeral: true 
                });
            }
            return;
        }
    },
};
