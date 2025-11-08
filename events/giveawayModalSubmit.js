const { Events, EmbedBuilder, ChannelType } = require('discord.js');

// === 設定 ===
// 参加リアクションに使用するカスタム絵文字ID（:takonya: のIDを仮定）
const GIVEAWAY_EMOJI_ID = '1434097896667746324'; 

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isModalSubmit() || interaction.customId !== 'giveaway_start_modal') return;

        await interaction.deferReply({ ephemeral: true });

        const title = interaction.fields.getTextInputValue('giveaway_title');
        const content = interaction.fields.getTextInputValue('giveaway_content');
        const winnerCountStr = interaction.fields.getTextInputValue('giveaway_winners');
        
        const winnerCount = parseInt(winnerCountStr, 10);

        if (isNaN(winnerCount) || winnerCount <= 0) {
            return interaction.editReply({ 
                content: '当選人数は1以上の有効な半角数字で入力してください。',
            });
        }
        
        // ギブアウェイメッセージのEmbedを作成
        const giveawayEmbed = new EmbedBuilder()
            .setColor(0xFEE75C) // 黄色
            .setTitle(`🎁 ${title}`)
            .setDescription(`**景品内容:**\n${content}\n\n**✅ 参加方法:**\nこのメッセージに <:takonya:${GIVEAWAY_EMOJI_ID}> のリアクションを付けてください！`)
            .addFields(
                { name: '🎉 当選人数', value: `${winnerCount}名`, inline: true },
                { name: '👥 現在の参加者', value: `0名`, inline: true } // 初期参加者数
            )
            .setFooter({ text: `当選人数: ${winnerCount}人 | リアクションで参加 | ギブアウェイ開始者: ${interaction.user.tag}` })
            .setTimestamp();
        
        try {
            // ギブアウェイメッセージを送信
            const giveawayMessage = await interaction.channel.send({ 
                embeds: [giveawayEmbed],
                // メッセージを簡単に識別できるように、CustomIdを持つコンポーネントを付けておく（必須ではないが便利）
                // components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('giveaway_placeholder').setLabel('参加').setStyle(ButtonStyle.Secondary).setDisabled(true))]
            });

            // BOT自身が最初のリアクションを追加 (参加ボタンの代わり)
            const emoji = interaction.client.emojis.cache.get(GIVEAWAY_EMOJI_ID);
            if (emoji) {
                await giveawayMessage.react(emoji);
            } else {
                // カスタム絵文字が見つからない場合は、一般的な🎉で代用
                await giveawayMessage.react('🎉'); 
            }
            
            await interaction.editReply({ 
                content: `✅ ギブアウェイメッセージを <#${interaction.channelId}> に送信しました！`,
            });
            
        } catch (error) {
            console.error('ギブアウェイメッセージ送信中にエラーが発生しました:', error);
            await interaction.editReply({ 
                content: 'メッセージの送信中にエラーが発生しました。ボットに発言権限があるか確認してください。'
            });
        }
    },
};
