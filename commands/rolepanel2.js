const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// 管理者のみが使用できるロールパネル送信コマンド
module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolepanel2')
        .setDescription('指定したロールとカスタム絵文字でリアクションロールパネルを送信します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. ロール (必須)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('リアクションで付与したいロールを選択してください。')
                .setRequired(true))
        // 2. カスタム絵文字ID (必須)
        .addStringOption(option =>
            option.setName('emoji_id')
                .setDescription('リアクションに使用するカスタム絵文字のIDを入力してください。')
                .setRequired(true))
        // 3. カスタム絵文字名 (必須)
        .addStringOption(option =>
            option.setName('emoji_name')
                .setDescription('リアクションに使用するカスタム絵文字の名前を入力してください (例: takonya)。')
                .setRequired(true))
        // 4. パネルを送信するチャンネル (必須)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('パネルを送信したいテキストチャンネルを選択してください。')
                .addChannelTypes(ChannelType.GuildText) // テキストチャンネルのみに限定
                .setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); 

        // オプション値の取得
        const role = interaction.options.getRole('role');
        const emojiId = interaction.options.getString('emoji_id');
        const emojiName = interaction.options.getString('emoji_name');
        const targetChannel = interaction.options.getChannel('channel');

        // 表示用のフルネームを作成 (<:名前:ID>)
        const roleEmojiDisplay = `<:${emojiName}:${emojiId}>`;

        // 埋め込みメッセージの作成
        const panelEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('✨ カスタムロールパネル ✨')
            .setDescription(`以下のリアクションをつけることで、ロールを付与できます。\n\n**${roleEmojiDisplay} : <@&${role.id}>**`);

        try {
            // パネルメッセージを対象チャンネルに送信
            const message = await targetChannel.send({
                embeds: [panelEmbed],
            });

            // カスタム絵文字のリアクションを追加
            await message.react(`${emojiName}:${emojiId}`);

            // 成功メッセージで応答を編集し完了させる
            await interaction.editReply({ 
                content: `ロールパネルを ${targetChannel} に送信し、リアクションを付けました。\n**ロールIDとメッセージIDを控えてください。**`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .addFields(
                            { name: 'ロールID', value: `\`${role.id}\``, inline: true },
                            { name: '絵文字ID', value: `\`${emojiId}\``, inline: true },
                            { name: 'メッセージID', value: `\`${message.id}\``, inline: false },
                            { name: 'チャンネルID', value: `\`${targetChannel.id}\``, inline: false }
                        )
                ]
            });

        } catch (error) {
            console.error('カスタムロールパネル送信中にエラーが発生しました:', error);
            await interaction.editReply({
                content: '❌ パネルの送信中にエラーが発生しました。ボットに必要な権限があるか、カスタム絵文字IDが正しいか確認してください。',
            }).catch(e => console.error('エラー通知失敗:', e));
        }
    },
};
