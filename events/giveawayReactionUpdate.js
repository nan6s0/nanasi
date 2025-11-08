const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
// 参加リアクションに使用するカスタム絵文字ID（:takonya: のIDを仮定）
const GIVEAWAY_EMOJI_ID = '1434097896667746324'; 

// ギブアウェイメッセージのフッターのプレフィックス
const FOOTER_PREFIX = '当選人数: ';

/**
 * ギブアウェイメッセージの参加者数をリアルタイムで更新します。
 * @param {MessageReaction} reaction - リアクションオブジェクト
 */
async function updateGiveawayParticipants(reaction) {
    // BOT自身、または対象外のリアクションは無視
    if (reaction.emoji.id !== GIVEAWAY_EMOJI_ID && reaction.emoji.name !== '🎉') return;
    
    const message = reaction.message;
    
    // 1. メッセージがギブアウェイであるか確認
    if (!message.embeds[0] || !message.embeds[0].footer?.text.startsWith(FOOTER_PREFIX)) {
        return; // ギブアウェイメッセージではない
    }

    // 2. 参加者リストを取得（BOTを除く）
    // BOTが追加したリアクションを取得
    const giveawayReaction = message.reactions.cache.find(r => 
        r.emoji.id === GIVEAWAY_EMOJI_ID || r.emoji.name === '🎉'
    );
    
    if (!giveawayReaction) return; // リアクション自体が削除されていたら無視

    const users = await giveawayReaction.users.fetch();
    const participants = users.filter(user => !user.bot);
    const participantCount = participants.size;

    // 3. BOTによる初期リアクションの削除 (最初のユーザーが参加したとき)
    if (participantCount > 0 && giveawayReaction.me) {
        // 参加者が1人以上いて、かつBOT自身がリアクションしている場合
        try {
            // BOT自身が付けたリアクションを削除
            await giveawayReaction.users.remove(message.client.user.id);
            console.log(`BOTの初期ギブアウェイリアクションを削除しました。`);
        } catch (error) {
            console.error('BOTのリアクション削除に失敗しました:', error);
        }
    }

    // 4. Embedを更新
    const originalEmbed = message.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed);

    // 参加者フィールドを更新
    newEmbed.spliceFields(1, 1, { 
        name: '👥 現在の参加者', 
        value: `${participantCount}名`, 
        inline: true 
    });

    try {
        await message.edit({ embeds: [newEmbed] });
    } catch (error) {
        console.error('ギブアウェイメッセージのEmbed更新に失敗しました:', error);
    }
}


module.exports = {
    // MessageReactionAddはリアクション追加時にトリガー
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // Partial（部分的なデータ）の場合、完全なデータをフェッチ
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                // Unknown Message (10008) の場合はここでキャッチされる
                console.error('リアクションデータのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }
        
        await updateGiveawayParticipants(reaction);
    },
};

// MessageReactionRemoveはリアクション削除時にトリガー（参加者が減る可能性があるため）
module.exports.remove = {
    name: Events.MessageReactionRemove,
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // Partial（部分的なデータ）の場合、完全なデータをフェッチ
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('リアクション削除データのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }

        // updateGiveawayParticipants は MessageReactionRemove でも機能する
        await updateGiveawayParticipants(reaction);
    }
};
