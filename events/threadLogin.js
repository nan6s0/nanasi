const { Events, ChannelType } = require('discord.js');

// === 設定ID ===
const forumChannelId = '1434095946958114918'; // 監視対象のフォーラムチャンネルID
const inactivityThresholdDays = 10; // 非アクティブと見なす日数 (10日)

/**
 * 10日以上活動がないスレッドをチェックし、メッセージを送信してアクティブ化する関数
 * @param {Client} client - Discordクライアントインスタンス
 */
async function checkAndBumpThreads(client) {
    console.log(`[ThreadLogin] スレッドのアクティビティチェックを開始します... (${new Date().toLocaleString('ja-JP')})`);
    
    const guild = client.guilds.cache.first();
    if (!guild) return console.log("[ThreadLogin] ギルドが見つかりません。");

    const forumChannel = guild.channels.cache.get(forumChannelId);

    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        return console.log(`[ThreadLogin] フォーラムチャンネルID ${forumChannelId} が見つからないか、フォーラムではありません。`);
    }

    const thresholdMs = inactivityThresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    let bumpedCount = 0;

    try {
        // アクティブなスレッドをすべて取得（スレッドメタデータを含む）
        const activeThreads = await forumChannel.threads.fetchActive({ force: true });
        
        for (const thread of activeThreads.threads.values()) {
            
            // 💡 修正後の安全な最終アクティビティ時刻の取得ロジック
            let lastActivityTime;
            
            // 1. lastMessageのタイムスタンプを使用（最も正確な最終アクティビティ）
            if (thread.lastMessage) {
                lastActivityTime = thread.lastMessage.createdTimestamp;
            } 
            // 2. lastMessageがない場合、スレッド自体に記録されている最終メッセージIDのタイムスタンプを使用
            else if (thread.lastMessageId) {
                // lastMessageIdが存在する場合、そのメッセージを取得してタイムスタンプを使用
                try {
                    const lastMessage = await thread.messages.fetch(thread.lastMessageId);
                    lastActivityTime = lastMessage.createdTimestamp;
                } catch (e) {
                    // フェッチに失敗した場合、スレッドの作成時刻を使用
                    lastActivityTime = thread.createdTimestamp;
                }
            } 
            // 3. メッセージが全くない場合（lastMessageIdがない）、スレッドの作成時刻を使用
            else {
                lastActivityTime = thread.createdTimestamp;
            }

            // 非アクティブ期間をチェック
            if (now - lastActivityTime > thresholdMs) {
                
                const bumpMessage = '⏫'; // スレッドを最上部に移動させるためのメッセージ

                try {
                    // スレッドにメッセージを送信し、スレッドをアクティブ化
                    await thread.send({ content: bumpMessage });
                    console.log(`[ThreadLogin] スレッド '${thread.name}' (${thread.id}) をアクティブ化しました。`);
                    bumpedCount++;
                    
                } catch (error) {
                    console.error(`[ThreadLogin] スレッド '${thread.name}' へのメッセージ送信に失敗: ${error.message}`);
                }
            }
        }
        
        console.log(`[ThreadLogin] チェック完了。${bumpedCount}個のスレッドをアクティブ化しました。`);

    } catch (error) {
        // スレッドのフェッチ自体に失敗した場合のログ
        console.error("[ThreadLogin] スレッドのフェッチ中に致命的なエラーが発生しました:", error);
    }
}

module.exports = {
    checkAndBumpThreads
};
