const { Events, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const targetGuildId = '1434084039647821836'; // 対象サーバーID
const welcomeChannelId = '1434150986980786198'; // 歓迎メッセージ送信先チャンネルID

module.exports = {
    // GuildMemberAdd イベントを購読
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        // 意図しないサーバーでの実行を防ぐため、対象サーバーIDをチェック
        if (member.guild.id !== targetGuildId) return;

        // ------------------------------------
        // 1. サーバーチャンネルへの歓迎メッセージ送信
        // ------------------------------------
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (welcomeChannel) {
            // シンプルなテキストメッセージを送信
            const serverWelcomeMessage = `${member}さん、${member.guild.name}へようこそ！ 👋\nみんなで楽しく活動しましょう！`;
            
            try {
                await welcomeChannel.send(serverWelcomeMessage);
            } catch (error) {
                console.error(`歓迎チャンネルへのメッセージ送信中にエラーが発生しました: ${error}`);
            }
        }

        // ------------------------------------
        // 2. メンバーのDMへの埋め込みメッセージ送信
        // ------------------------------------
        const dmEmbed = new EmbedBuilder()
            .setColor(0x00AABB) // 好みの色に変更可能
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
            // メンバーにDMを送信
            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            // DMが閉じられている、またはプライバシー設定により送信できない場合のエラー
            console.log(`${member.user.tag} にDMを送信できませんでした。DMが閉じられています。`);
            // console.error(error); // 詳細なエラーが必要な場合
        }
    },
};
