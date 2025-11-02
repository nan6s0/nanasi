const { Events, EmbedBuilder, ChannelType } = require('discord.js');

// === 設定ID ===
const GUILD_ID = '1434084039647821836';         // サーバーID
const ADMIN_USER_ID = '1434084039647821836';     // 常に発言が許可される特定のユーザーID（サーバーIDと同じ値）
const GLOBAL_SPEAK_ROLE_ID = '1434492742297456660'; // どこでも発言可能なロールID
const CATEGORY_SPEAK_ROLE_ID = '1434096653786153030'; // 特定カテゴリでのみ発言可能なロールID
const CATEGORY_SPEAK_CATEGORY_ID = '1434104047261974560'; // CATEGORY_SPEAK_ROLEを持つ人が話せるカテゴリID
const COMMON_ALLOWED_CATEGORY_ID = '1434106965423820902'; // 誰でも発言できる共通カテゴリID
const LOG_CHANNEL_ID = '1434395552774357114';       // ログを送信するチャンネルID

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        // 1. 基本チェック
        if (message.author.bot) return; // ボットのメッセージは無視
        if (message.guildId !== GUILD_ID) return; // 別のサーバーのメッセージは無視
        
        // ログチャンネルの準備（メッセージ削除が優先されるため、エラー時のみ使用）
        const logChannel = message.client.channels.cache.get(LOG_CHANNEL_ID);
        
        const member = message.member;
        if (!member) return; // メンバー情報が取得できない場合は無視

        const channel = message.channel;
        // カテゴリ外（DMや一部特殊チャンネル）やスレッドチャンネルは一旦除外
        if (channel.type === ChannelType.DM || !channel.parentId) {
            // スレッドは親チャンネルのパーミッションを引き継ぐため、カテゴリIDチェックの前に処理を簡略化する
            if (channel.isThread()) {
                // スレッドは親チャンネルのパーミッションに従う
                channel.parentId = channel.parent.parentId; 
            } else {
                // 親カテゴリがないチャンネル（テキストチャンネルなど）は、カテゴリIDに自チャンネルIDを設定し、次のロジックで弾く
                channel.parentId = channel.id;
            }
        }
        
        let isAllowed = false;

        // --- 2. 権限チェック ---

        // A. Tier 1: どこでも発言許可される管理者/ロールのチェック (Rule 1)
        if (member.id === ADMIN_USER_ID || member.roles.cache.has(GLOBAL_SPEAK_ROLE_ID)) {
            isAllowed = true;
        }

        // B. Tier 2: 共通カテゴリのチェック (Rule 3)
        if (!isAllowed && channel.parentId === COMMON_ALLOWED_CATEGORY_ID) {
            isAllowed = true;
        }

        // C. Tier 3: カテゴリ固有の発言許可チェック (Rule 2)
        if (!isAllowed && channel.parentId === CATEGORY_SPEAK_CATEGORY_ID) {
            if (member.roles.cache.has(CATEGORY_SPEAK_ROLE_ID)) {
                isAllowed = true;
            }
        }

        // --- 3. アクション ---
        
        if (!isAllowed) {
            // 発言が許可されない場合
            
            // ログEmbedの作成
            const logEmbed = new EmbedBuilder()
                .setColor(0xE74C3C) // 赤色
                .setTitle('❌ 発言禁止違反メッセージの削除')
                .setDescription('発言が許可されていないユーザーまたはチャンネルでメッセージが検出・削除されました。')
                .addFields(
                    { name: '👤 ユーザー', value: `${member.toString()} (\`${member.id}\`)`, inline: true },
                    { name: '💬 チャンネル', value: `${channel.toString()} (\`${channel.id}\`)`, inline: true },
                    { name: '📝 メッセージ内容', value: message.content ? `\`\`\`${message.content.substring(0, 500)}\`\`\`` : '（メッセージにテキストなし）' }
                )
                .setFooter({ text: '自動モデレーション実行' })
                .setTimestamp();

            try {
                // 1. メッセージの削除
                await message.delete();
                
                // 2. ログチャンネルに通知
                if (logChannel) {
                    await logChannel.send({ embeds: [logEmbed] });
                }

            } catch (error) {
                console.error(`メッセージ削除またはログ送信エラー:`, error);
                if (logChannel) {
                    logChannel.send({ 
                        content: `⚠️ 発言禁止違反検出後、メッセージの削除に失敗しました。\nユーザー: <@${member.id}>、チャンネル: <#${channel.id}>`,
                    }).catch(console.error);
                }
            }
        }
    },
};
