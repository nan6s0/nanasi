const { Events, EmbedBuilder } = require('discord.js');

// === 設定 ===
const GIVEAWAY_EMOJI_ID = '1434097896667746324'; // :takonya: のID
const FOOTER_PREFIX = '当選人数: ';

/**
 * ギブアウェイメッセージの参加者数をリアルタイムで更新します。（削除イベント用）
 * @param {MessageReaction} reaction - リアクションオブジェクト
 */
async function updateGiveawayParticipants(reaction) {
    // 対象外の絵文字は無視
    if (reaction.emoji.id !== GIVEAWAY_EMOJI_ID && reaction.emoji.name !== '🎉') return;
    
    const message = reaction.message;
    // ギブアウェイメッセージでなければ無視
    if (!message.embeds[0] || !message.embeds[0].footer?.text.startsWith(FOOTER_PREFIX)) return;

    // 1. 参加者リストを取得（BOTを除く）
    const giveawayReaction = message.reactions.cache.find(r => 
        r.emoji.id === GIVEAWAY_EMOJI_ID || r.emoji.name === '🎉'
    );
    if (!giveawayReaction) return;

    // fetchで最新のユーザーリストを取得 (削除後の人数を取得)
    const users = await giveawayReaction.users.fetch();
    const participants = users.filter(user => !user.bot);
    const participantCount = participants.size; // 参加者が減っていれば、ここで人数が減少する

    // 2. Embedを更新
    const originalEmbed = message.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed);

    // 既存のフィールドを検索し、参加者数を更新
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
    name: Events.MessageReactionRemove, // MessageReactionRemove イベントで発火
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        // Partialチェック
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('リアクション削除データのフェッチ中にエラーが発生しました:', error);
                return;
            }
        }

        await updateGiveawayParticipants(reaction);
    },
};
