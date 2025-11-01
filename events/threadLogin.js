// events/threadLogin.js

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
        // アクティブなスレッドをすべて取得
        const activeThreads = await forumChannel.threads.fetchActive();
        
        // 💡 念のため、archiveDurationに関わらず過去3日間のパブリックスレッドもフェッチ
        // await forumChannel.threads.fetchArchived({ type: 'public', before: Date.now() - 3 * 24 * 60 * 60 * 1000 });

        for (const thread of activeThreads.threads.values()) {
            
            // 💡 修正: lastMessageIdがなければ、スレッド自体の作成時刻を最終アクティビティとする
            let lastActivityTime;
            
            if (thread.lastMessageId) {
                // lastMessageIdが存在する場合、そのメッセージのタイムスタンプを使用
                // lastMessageはnullの場合があるため、lastMessageId経由で確認する
                if (thread.lastMessage) {
                    lastActivityTime = thread.lastMessage.createdTimestamp;
                } else {
                    // lastMessageがキャッシュされていなくても、最終活動時刻はスレッドオブジェクトにあります
                    lastActivityTime = thread.threadMetadata.archiveTimestamp; 
                }
            }
            
            // スレッド作成後、一度もメッセージが送信されていない場合
            if (!thread.lastMessageId) {
                lastActivityTime = thread.createdTimestamp;
            }

            // lastActivityTimeが有効な値であることを確認
            if (!lastActivityTime) {
                // 最悪の場合、スレッドの作成時刻を使用
                lastActivityTime = thread.createdTimestamp;
            }

            // 非アクティブ期間を計算し、10日以上かチェック
            if (now - lastActivityTime > thresholdMs) {
                
                const bumpMessage = '⏫'; 

                try {
                    await thread.send({ content: bumpMessage });
                    console.log(`[ThreadLogin] スレッド '${thread.name}' (${thread.id}) が非アクティブだったためアクティブ化しました。`);
                    bumpedCount++;
                    
                } catch (error) {
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
    checkAndBumpThreads
};
