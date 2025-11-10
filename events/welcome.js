const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID (使用前に必ずご自身のサーバーIDとチャンネルIDに書き換えてください) ===
const targetGuildId = '1434084039647821836'; // 対象サーバーID
const welcomeChannelId = '1434150986980786198'; // 歓迎メッセージ送信先チャンネルID
// 重要なチャンネルのIDを設定します (例: ルールチャンネル, 自己紹介チャンネルなど)
const rulesChannelId = '1434085112030691421'; 
const guideChannelId = '1434099904698908754'; 

module.exports = {
    // GuildMemberAdd イベントを購読
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        // 意図しないサーバーでの実行を防ぐため、対象サーバーIDをチェック
        if (member.guild.id !== targetGuildId) return;

        // ------------------------------------
        // 1. サーバーチャンネルへの歓迎メッセージ送信 (Embed化)
        // ------------------------------------
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (welcomeChannel) {
            // サーバーチャンネル用のEmbedを作成
            const channelWelcomeEmbed = new EmbedBuilder()
                .setColor(0x3498DB) // 明るい青色
                .setTitle(`🎉 ${member.guild.name}へようこそ！`)
                .setDescription(`新メンバーの **${member}** さんがいらっしゃいました！\n皆さんで一緒に楽しく活動しましょう！`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true })) // 新メンバーのアバターをサムネイルに
                .addFields(
                    {
                        name: '📢 まずはここから',
                        // チャンネルIDを使って、mention可能な形式で表示
                        value: `① <#${rulesChannelId}> で利用規約をご確認ください。\n② <#${guideChannelId}> で配布のルールやガイドを確認してください。`,
                        inline: false
                    },
                    {
                        name: '👥 現在のメンバー数',
                        value: `\`${member.guild.memberCount}\` 人`,
                        inline: true
                    }
                )
                // 参加者をハイライト
                .setFooter({ text: `ようこそ！ ${member.user.tag}！`, iconURL: member.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            try {
                // チャンネルにEmbedを送信
                await welcomeChannel.send({ 
                    content: `✨ Welcome ${member}!`, // Embedの上にメンションを付ける
                    embeds: [channelWelcomeEmbed] 
                });
            } catch (error) {
                console.error(`歓迎チャンネルへのEmbed送信中にエラーが発生しました: ${error}`);
            }
        }

        // ------------------------------------
        // 2. メンバーのDMへの埋め込みメッセージ送信 (変更なし)
        // ------------------------------------
        const dmEmbed = new EmbedBuilder()
            .setColor(0x00AABB) // 好みの色に変更可能 (例: Discordの青)
            .setTitle('ようこそ！配布サーバーへ！')
            .setDescription('ご参加ありがとうございます！配布を受け取る前に、以下のリンクを確認してください。')
            .addFields(
                { 
                    name: '💡 サーバー利用規約', 
                    value: 'まずはこちらでルールを確認してください！\n[利用規約を確認する！](https://canary.discord.com/channels/1434084039647821836/1434085112030691421)'
                },
                { 
                    name: '🎁 配布受け取りのルール', 
                    value: '配布を受け取る際の注意事項はこちら！\n[配布ルールを確認する！](https://canary.discord.com/channels/1434084039647821836/1434099904698908754)'
                }
            )
            .setThumbnail(member.guild.iconURL({ dynamic: true })) // サーバーアイコンをサムネイルに
            .setTimestamp();
        
        try {
            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log(`${member.user.tag} にDMを送信できませんでした。DMが閉じられています。`);
        }
    },
};
