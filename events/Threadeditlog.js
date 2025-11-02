const { Events, EmbedBuilder, ChannelType, ThreadChannel } = require('discord.js');

// === 設定ID ===
const forumChannelId = '1434095946958114918'; // 監視対象のフォーラムチャンネルID
const logChannelId = '1434160928294965319'; // ログを送信するチャンネルID
const mentionRoleId = '1434162285693108224'; // 通知用ロールID

module.exports = {
    name: Events.ThreadUpdate,
    once: false,
    async execute(oldThread, newThread) {
        // 監視対象外のチャンネルのスレッドは無視
        if (newThread.parentId !== forumChannelId) return;
        
        // スレッドに権限があるか確認
        const logChannel = newThread.guild.channels.cache.get(logChannelId);
        if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

        // ログの内容を格納する配列
        const changes = [];

        // 1. スレッド名の変更
        if (oldThread.name !== newThread.name) {
            changes.push(`- **名前**: \`${oldThread.name}\` → \`${newThread.name}\``);
        }

        // 2. スレッドのアーカイブ状態の変更
        if (oldThread.archived !== newThread.archived) {
            changes.push(`- **アーカイブ状態**: ${oldThread.archived ? '✅ アーカイブ済' : '❌ 非アーカイブ'} → ${newThread.archived ? '✅ アーカイブ済' : '❌ 非アーカイブ'}`);
        }
        
        // 3. ロック状態の変更
        if (oldThread.locked !== newThread.locked) {
            changes.push(`- **ロック状態**: ${oldThread.locked ? '🔒 ロック済' : '🔓 非ロック'} → ${newThread.locked ? '🔒 ロック済' : '🔓 非ロック'}`);
        }

        // 4. トピック（スレッドの最初のメッセージ）が変更された場合
        // Discord.js v14ではThreadUpdateイベントはトピック変更を直接捕捉しないため、ここではスレッド名や状態変更に限定します。

        if (changes.length === 0) return; // ログに残す変更がない場合は終了

        // メンション付きの通知メッセージを準備
        const mentionContent = `<@&${mentionRoleId}>`;
        
        const logEmbed = new EmbedBuilder()
            .setColor(0xFFA500) // オレンジ
            .setTitle(`📢 配布スレッドが更新されました`)
            .setURL(newThread.url)
            .setDescription(`スレッド **${newThread.name}** に変更がありました。`)
            .addFields(
                { name: '変更内容', value: changes.join('\n') },
                { name: 'チャンネル', value: `<#${newThread.parentId}>`, inline: true },
                { name: 'スレッドURL', value: `[クリックして移動](${newThread.url})`, inline: true }
            )
            .setTimestamp();

        try {
            await logChannel.send({
                content: mentionContent, // ロールメンション
                embeds: [logEmbed]
            });
        } catch (error) {
            console.error('スレッド更新ログの送信に失敗:', error);
        }
    },
};
