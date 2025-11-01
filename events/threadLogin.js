const { Events, ChannelType, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const forumChannelId = '1434095946958114918'; // 監視対象のフォーラムチャンネルID
const inactivityThresholdDays = 10; // 非アクティブと見なす日数 (10日)

/**
 * 10日以上活動がないスレッドをチェックし、メッセージを送信してアクティブ化する関数
 * @param {Client} client - Discordクライアントインスタンス
 */
async function checkAndBumpThreads(client) {
    console.log(`[ThreadLogin] スレッドのアクティビティチェックを開始します... (${new Date().toLocaleString()})`);
    
    // 対象チャンネルが利用可能かチェック
    const guild = client.guilds.cache.first(); // ボットが参加している最初のギルド（サーバー）を取得
    if (!guild) return console.log("[ThreadLogin] ギルドが見つかりません。");

    const forumChannel = guild.channels.cache.get(forumChannelId);

    // チャンネルの存在とタイプをチェック
    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        return console.log(`[ThreadLogin] フォーラムチャンネルID ${forumChannelId} が見つからないか、フォーラムではありません。`);
    }

    // 非アクティブ時間の閾値 (ミリ秒)
    const thresholdMs = inactivityThresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    let bumpedCount = 0;

    try {
        // アクティブなスレッドをすべて取得
        const activeThreads = await forumChannel.threads.fetchActive();
        
        for (const thread of activeThreads.threads.values()) {
            
            // スレッドの最終メッセージ時刻を取得 (最終アクティビティを示す)
            const lastActivityTime = thread.lastMessage.createdTimestamp || thread.createdTimestamp;

            // 非アクティブ期間を計算
            if (now - lastActivityTime > thresholdMs) {
                
                // 10日以上アクティビティがない場合
                const bumpMessage = '⏫'; // あと送りを消す代わりに、シンプルな絵文字でスレッドを最上部に移動させます

                try {
                    // スレッドにメッセージを送信し、スレッドをアクティブ化（最上部に移動）
                    await thread.send({ content: bumpMessage });
                    console.log(`[ThreadLogin] スレッド '${thread.name}' (${thread.id}) が非アクティブだったためアクティブ化しました。`);
                    bumpedCount++;
                    
                } catch (error) {
                    // 権限不足などでメッセージ送信に失敗した場合
                    console.error(`[ThreadLogin] スレッド '${thread.name}' へのメッセージ送信に失敗: ${error.message}`);
                }
            }
        }
        
        console.log(`[ThreadLogin] チェック完了。${bumpedCount}個のスレッドをアクティブ化しました。`);

    } catch (error) {
        console.error("[ThreadLogin] スレッドのフェッチ中にエラーが発生しました:", error);
    }
}

module.exports = {
    // このファイル自体はイベントを公開しませんが、処理関数をエクスポート
    checkAndBumpThreads
};
