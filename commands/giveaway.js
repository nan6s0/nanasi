const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    PermissionFlagsBits,
    EmbedBuilder 
} = require('discord.js');

// MessageFlagsをインポートし、ephemeral: trueをflags: 64に置き換えます
const { MessageFlags } = require('discord.js');
const EPHEMERAL_FLAG = MessageFlags.Ephemeral; // 64

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('サーバーで景品配布（ギブアウェイ）の管理を行います。')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('新しいギブアウェイを開始します。')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('finish')
                .setDescription('ギブアウェイを終了し、当選者を選出します。')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('終了するギブアウェイメッセージのID')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // サーバー管理権限を持つ人のみ実行可能
        .setDMPermission(false),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            // ギブアウェイ開始のためのモーダルを表示
            const modal = new ModalBuilder()
                .setCustomId('giveaway_start_modal')
                .setTitle('景品配布（ギブアウェイ）の開始');

            // 景品タイトル
            const titleInput = new TextInputBuilder()
                .setCustomId('giveaway_title')
                .setLabel('景品のタイトル')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(256);

            // 景品内容（詳細）
            const contentInput = new TextInputBuilder()
                .setCustomId('giveaway_content')
                .setLabel('景品の詳細な内容')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            // 当選人数
            const winnerCountInput = new TextInputBuilder()
                .setCustomId('giveaway_winners')
                .setLabel('当選人数（半角数字）')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3);
            
            // フォームコンポーネントをアクション行に追加
            const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
            const secondActionRow = new ActionRowBuilder().addComponents(contentInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(winnerCountInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

            await interaction.showModal(modal);

        } else if (subcommand === 'finish') {
            // ギブアウェイ終了ロジック
            await interaction.deferReply({ flags: EPHEMERAL_FLAG });

            const messageId = interaction.options.getString('message_id');
            const channel = interaction.channel; // コマンドが実行されたチャンネルを想定

            try {
                const giveawayMessage = await channel.messages.fetch(messageId);
                
                // メッセージがギブアウェイメッセージであるか確認
                if (!giveawayMessage.embeds[0] || !giveawayMessage.embeds[0].footer?.text.startsWith('当選人数:')) {
                    return interaction.editReply({ 
                        content: '指定されたIDのメッセージは有効なギブアウェイメッセージではありません。',
                    });
                }
                
                // 当選人数を取得
                const footerText = giveawayMessage.embeds[0].footer.text;
                const winnerMatch = footerText.match(/当選人数: (\d+)人/);
                const winnerCount = winnerMatch ? parseInt(winnerMatch[1], 10) : 1;

                // リアクション情報を取得
                const reactions = giveawayMessage.reactions.cache;
                // BOTが最初に追加したリアクションのカスタムIDまたは汎用絵文字'🎉'
                const giveawayEmoji = reactions.find(r => r.emoji.id === '1434097896667746324' || r.emoji.name === '🎉'); 
                
                if (!giveawayEmoji) {
                    return interaction.editReply({ content: 'ギブアウェイリアクションが見つかりませんでした。メッセージIDを確認してください。' });
                }

                // リアクションした全ユーザーをフェッチ
                const users = await giveawayEmoji.users.fetch();
                
                // BOT自身をリストから除外 (BOTは自動で削除されているはずだが念のため)
                const participants = users.filter(user => !user.bot);
                
                if (participants.size === 0) {
                    return interaction.editReply({ content: '参加者がいませんでした。当選者は選出できません。' });
                }

                const participantsArray = Array.from(participants.keys()); // ユーザーIDの配列
                
                // 当選者を選出
                const winners = [];
                // 参加者数が当選人数より少ない場合は、全員当選とする
                const actualWinnerCount = Math.min(winnerCount, participantsArray.length);

                for (let i = 0; i < actualWinnerCount; i++) {
                    const randomIndex = Math.floor(Math.random() * participantsArray.length);
                    const winnerId = participantsArray.splice(randomIndex, 1)[0]; // 選出されたユーザーIDを配列から削除
                    winners.push(`<@${winnerId}>`);
                }

                // ギブアウェイメッセージを更新 (当選者リストの追加とフッターの変更)
                const originalEmbed = giveawayMessage.embeds[0];
                const winnerEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(0x2ECC71)
                    .setTitle(`🎉 ギブアウェイ終了: ${originalEmbed.title}`)
                    .setDescription(`当選者を選出しました！おめでとうございます！`)
                    .setFooter({ text: 'ギブアウェイは終了しました。' })
                    .spliceFields(
                        originalEmbed.fields.length - 2, // 最後の2つのフィールド(人数)を削除
                        2, 
                        { name: `🏆 当選者 (${actualWinnerCount}名)`, value: winners.join('\n') }
                    );
                
                // メッセージのコンポーネントとリアクションを削除
                await giveawayMessage.edit({ embeds: [winnerEmbed], components: [] });
                await giveawayMessage.reactions.removeAll();

                // チャンネル全体に当選報告を送信
                await channel.send({ 
                    content: `🎉 **景品配布（ギブアウェイ）当選者発表** 🎉\n${winners.join(', ')}さん、おめでとうございます！景品の受け取りについては担当者からDMがあります。`,
                    embeds: [winnerEmbed]
                });
                
                // 実行者に応答
                await interaction.editReply({ content: '✅ ギブアウェイを終了し、当選者を発表しました。' });

            } catch (error) {
                console.error('ギブアウェイ終了中にエラーが発生しました:', error);
                await interaction.editReply({ 
                    content: `ギブアウェイの終了中にエラーが発生しました。\nエラー: ${error.message}。メッセージIDが正しいか、ボットがメッセージを取得できるか確認してください。`,
                });
            }
        }
    },
};
