const { Events } = require('discord.js');

// === 設定ID ===
const staffUserId = '707800417131692104'; // コマンド実行専用ユーザーID
// コピー元のメッセージIDとチャンネルID
const sourceGuildId = '1434084039647821836';
const sourceChannelId = '1434085112030691421';
const sourceMessageId = '1434101819554140200';

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        // 1. ユーザーIDとメッセージ内容のチェック
        if (message.author.id !== staffUserId) return; // 特定のユーザーでなければ無視
        if (message.content.toLowerCase() !== 'rule') return; // メッセージが 'rule' でなければ無視
        
        // 2. ログメッセージなので、送信元のメッセージはすぐに削除
        try {
            if (message.deletable) {
                await message.delete();
            }
        } catch (error) {
            console.error('送信元メッセージの削除に失敗:', error);
            // 権限がない場合も処理は継続
        }

        // 3. コピー元のメッセージを取得
        try {
            // コピー元のチャンネルをフェッチ (異なるチャンネルから取得するため)
            const sourceChannel = message.client.channels.cache.get(sourceChannelId) || 
                                  await message.client.channels.fetch(sourceChannelId);
            
            if (!sourceChannel) {
                console.error(`[RuleEvent] コピー元チャンネルID ${sourceChannelId} が見つかりません。`);
                return;
            }

            // コピー元のメッセージをフェッチ
            const sourceMessage = await sourceChannel.messages.fetch(sourceMessageId);

            if (!sourceMessage) {
                console.error(`[RuleEvent] コピー元メッセージID ${sourceMessageId} が見つかりません。`);
                return;
            }

            // 4. 受信したチャンネルにメッセージの内容を送信
            // Embedやコンポーネントなども含めて正確にコピーするには、message.send()ではなく、
            // message.content, message.embeds, message.componentsなどを使って送信する。
            
            const messagePayload = {
                content: sourceMessage.content || null,
                embeds: sourceMessage.embeds.map(embed => embed.toJSON()), // Embedをコピー
                files: sourceMessage.attachments.map(attachment => attachment.url), // 添付ファイルをコピー
                components: sourceMessage.components.map(component => component.toJSON()), // コンポーネントをコピー
            };

            await message.channel.send(messagePayload);
            console.log(`[RuleEvent] ${message.author.tag} の要求により、ルールメッセージをチャンネル ${message.channel.name} に送信しました。`);

        } catch (error) {
            console.error('メッセージのフェッチまたは送信中にエラーが発生しました:', error);
            // 失敗した場合、実行者にのみエラーを通知
            if (message.channel.viewable) {
                message.channel.send(`エラー: ルールメッセージの取得または送信に失敗しました。`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }
        }
    },
};
