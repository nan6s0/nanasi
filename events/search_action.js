const { Events, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

// === 設定ID ===
const searchForumChannelId = '1434095946958114918'; // 検索対象のフォーラムチャンネルID
const targetThreadId = '1434099904698908754'; // /searchコマンドを送信したスレッドID

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        
        // 1. 検索モーダルを開く処理 (ボタンクリック)
        if (interaction.isButton() && interaction.customId === 'open_search_modal') {
            
            // モーダル（フォーム）の作成
            const modal = new ModalBuilder()
                .setCustomId('search_modal')
                .setTitle('スレッド内キーワード検索');

            // テキスト入力フィールドの作成
            const keywordInput = new TextInputBuilder()
                .setCustomId('search_keyword')
                .setLabel('検索したい単語を入力してください')
                .setStyle(TextInputStyle.Short) // 1行入力
                .setRequired(true);

            // モーダルに行を追加
            const actionRow = new ActionRowBuilder().addComponents(keywordInput);
            modal.addComponents(actionRow);

            // モーダルを表示
            return interaction.showModal(modal);
        }

        // 2. 検索実行の処理 (モーダル送信)
        if (interaction.isModalSubmit() && interaction.customId === 'search_modal') {
            await interaction.deferReply({ ephemeral: true }); // 時間のかかる処理なのでdeferする

            const keyword = interaction.fields.getTextInputValue('search_keyword').trim();
            const guild = interaction.guild;
            
            // 検索結果用のEmbed
            const resultEmbed = new EmbedBuilder()
                .setTitle(`🔍 検索結果: "${keyword}"`)
                .setTimestamp();

            if (!keyword) {
                resultEmbed.setColor(0xFEE75C).setDescription('検索キーワードが入力されていません。');
                return interaction.editReply({ embeds: [resultEmbed] });
            }

            // 検索対象チャンネルの取得
            const forumChannel = guild.channels.cache.get(searchForumChannelId) || 
                                 await guild.channels.fetch(searchForumChannelId);

            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                resultEmbed.setColor(0xE74C3C).setDescription('エラー: 検索対象のフォーラムチャンネルが見つかりません。');
                return interaction.editReply({ embeds: [resultEmbed] });
            }

            let foundThreads = [];
            const maxResults = 5; // 表示する最大結果数

            try {
                // アクティブなスレッドをすべて取得
                const activeThreads = await forumChannel.threads.fetchActive({ force: true });
                
                // 既にアーカイブされているが最近活動があったスレッドも取得（過去7日間）
                // APIコストを抑えるため、ここではactiveThreadのみを主に検索対象とします。

                // 検索の実行
                for (const thread of activeThreads.threads.values()) {
                    let matched = false;
                    
                    // a. スレッドタイトルがキーワードを含むかチェック
                    if (thread.name.toLowerCase().includes(keyword.toLowerCase())) {
                        matched = true;
                    } 
                    
                    // b. スレッド内のメッセージ本文を検索（最大50件まで）
                    // 💡 注意: Discord APIのメッセージ検索はAPIレート制限が厳しいため、非推奨です。
                    // 　　　ここではタイトル検索を優先し、メッセージ検索は実装しません。
                    // 　　　より確実なのは、ボットが起動時に各スレッドの最初のメッセージ（配布告知）をキャッシュする方法です。
                    
                    if (matched) {
                        foundThreads.push({
                            name: thread.name,
                            url: thread.url
                        });
                        
                        // 最大結果数に達したら終了
                        if (foundThreads.length >= maxResults) break;
                    }
                }

                // 3. 結果の表示
                if (foundThreads.length > 0) {
                    resultEmbed.setColor(0x2ECC71); // 緑
                    const resultsText = foundThreads.map((t, index) => 
                        `${index + 1}. [${t.name}](${t.url})`
                    ).join('\n');
                    resultEmbed.setDescription(`以下のスレッドが見つかりました。\n\n${resultsText}`);
                } else {
                    resultEmbed.setColor(0xFEE75C).setDescription('キーワードに一致するスレッドは見つかりませんでした。');
                }

            } catch (error) {
                console.error('スレッド検索中にエラーが発生しました:', error);
                resultEmbed.setColor(0xE74C3C).setDescription('検索中にエラーが発生しました。ボットの権限を確認してください。');
            }

            // 結果を送信
            await interaction.editReply({ embeds: [resultEmbed] });
        }
    },
};
