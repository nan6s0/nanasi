const { Events, EmbedBuilder, ChannelType } = require('discord.js');

// === 設定ID ===
const logChannelId = '1434202466773373099'; // ログチャンネルID
const targetGuildId = '1434084039647821836'; // 監視対象サーバーID

module.exports = {
    name: Events.MessageUpdate,
    once: false,
    // oldMessage, newMessage は編集前と編集後のメッセージオブジェクト
    async execute(oldMessage, newMessage) {
        // 監視対象サーバー外のメッセージは無視
        if (newMessage.guildId !== targetGuildId) return;
        // ボット自身のメッセージ、DM、Webhookメッセージは無視
        if (newMessage.author?.bot || newMessage.author?.system || newMessage.webhookId) return;

        // 内容が変更されていない場合は無視 (Embedやリアクションの更新など)
        if (oldMessage.content === newMessage.content) return;
        
        // oldMessageの内容が取得できない場合は、処理をスキップ (キャッシュ外)
        if (!oldMessage.content) return;
        
        const guild = newMessage.guild;
        const logChannel = guild.channels.cache.get(logChannelId);

        if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

        // Embedの作成
        const editEmbed = new EmbedBuilder()
            .setColor(0x3498DB) // 青
            .setTitle('✍️ メッセージ編集ログ')
            .setURL(newMessage.url) // 編集されたメッセージへのリンク
            .addFields(
                { name: '編集者', value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: false },
                { name: 'チャンネル', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: 'メッセージID', value: `\`${newMessage.id}\``, inline: true }
            )
            .setTimestamp();

        // 変更前後の内容をフィールドに追加
        
        // 編集前のメッセージ内容
        const oldContent = oldMessage.content.substring(0, 1000);
        editEmbed.addFields({ name: '編集前', value: `\`\`\`${oldContent}\`\`\`` });

        // 編集後のメッセージ内容
        const newContent = newMessage.content.substring(0, 1000);
        editEmbed.addFields({ name: '編集後', value: `\`\`\`${newContent}\`\`\`` });
        
        try {
            await logChannel.send({ embeds: [editEmbed] });
        } catch (error) {
            console.error('編集ログの送信に失敗:', error);
        }
    },
};
