const { Events, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 💡 注意: 実際のファイルパスに合わせて修正が必要です。
// このファイルがeventsフォルダ内にあることを前提としたパス設定
const COMMANDS_PATH = path.join(__dirname, '..', 'commands');
const EVENTS_PATH = path.join(__dirname, '..', 'events');
const LOG_CHANNEL_ID = '1436897462815297556'; // 実績ログ送信先チャンネルID

/**
 * 指定されたフォルダパスから.jsファイルの一覧を取得します。
 * @param {string} folderPath フォルダの絶対パス
 * @returns {{ label: string, value: string }[]} ファイルオプションの配列
 */
function getFiles(folderPath) {
    try {
        const files = fs.readdirSync(folderPath)
            .filter(file => file.endsWith('.js'));
        
        // ファイル名を value に使用
        return files.map(file => ({
            label: file,
            value: file, 
        }));
    } catch (error) {
        console.error(`フォルダ ${folderPath} の読み込み中にエラーが発生しました:`, error);
        return [];
    }
}

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // ボタンまたはセレクトメニューのインタラクションのみ処理
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
        
        // `free_code_` で始まるカスタムIDのみをフィルタリング
        if (!interaction.customId.startsWith('free_code_')) return;

        // すべての処理はエフェメラルな応答の編集で行うため、即座に deferUpdate を実行
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            await interaction.deferUpdate({ ephemeral: true }).catch(() => {});
        }


        // ============================
        // 1. ボタン処理: free_code_start_purchase (フォルダ選択メニューの表示)
        // ============================
        if (interaction.isButton() && interaction.customId === 'free_code_start_purchase') {
            const folderSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('free_code_select_folder')
                    .setPlaceholder('コードが欲しいフォルダを選択してください')
                    .addOptions([
                        { label: 'commands/ フォルダ', description: 'スラッシュコマンドのコードを取得', value: 'commands' },
                        { label: 'events/ フォルダ', description: 'イベントハンドラーのコードを取得', value: 'events' },
                    ]),
            );

            await interaction.editReply({
                content: 'どの種類のコードが欲しいですか？',
                components: [folderSelect],
                ephemeral: true,
            });
            return;
        }

        // ============================
        // 2. セレクトメニュー処理: free_code_select_folder (ファイル選択メニューの表示)
        // ============================
        if (interaction.isStringSelectMenu() && interaction.customId === 'free_code_select_folder') {
            const folderType = interaction.values[0]; // 'commands' or 'events'
            const folderPath = folderType === 'commands' ? COMMANDS_PATH : EVENTS_PATH;
            let files = getFiles(folderPath);
            
            let options = files.map(file => ({
                label: file.label,
                value: file.value,
            }));

            if (options.length === 0) {
                return interaction.editReply({
                    content: `❌ \`${folderType}/\` フォルダには利用可能なファイルがありません。`,
                    components: [],
                });
            }

            // 25個制限の処理 (ページネーションの代わりに警告と最初の25個に制限)
            if (options.length > 25) {
                options = options.slice(0, 25);
                interaction.followUp({
                    content: '⚠️ ファイルが25個を超えているため、最初の25個のみを表示しています。',
                    ephemeral: true,
                }).catch(() => {});
            }

            const fileSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    // カスタムIDにフォルダの種類を含める
                    .setCustomId(`free_code_select_file_${folderType}`) 
                    .setPlaceholder(`${folderType}/ フォルダからファイルを選択してください`)
                    .addOptions(options),
            );

            await interaction.editReply({
                content: `**\`${folderType}/\`** フォルダから取得したいファイルを選んでください:`,
                components: [fileSelect],
            });
            return;
        }

        // ============================
        // 3. セレクトメニュー処理: free_code_select_file_* (コードのDM送信とログ記録)
        // ============================
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('free_code_select_file_')) {
            // カスタムIDからフォルダタイプを抽出 (例: free_code_select_file_commands -> commands)
            const folderType = interaction.customId.split('_').pop(); 
            const fileName = interaction.values[0];
            
            const folderPath = folderType === 'commands' ? COMMANDS_PATH : EVENTS_PATH;
            const filePath = path.join(folderPath, fileName);

            let fileContent;
            try {
                fileContent = fs.readFileSync(filePath, 'utf8');
            } catch (error) {
                console.error(`ファイル ${filePath} の読み込み中にエラーが発生しました:`, error);
                await interaction.editReply({
                    content: `❌ ファイル \`${fileName}\` の読み込み中にエラーが発生しました。`,
                    components: [],
                });
                return;
            }

            // --- 1. DM送信 ---
            try {
                const fullCode = `\`\`\`javascript\n${fileContent}\n\`\`\``;
                
                // 2000文字のメッセージ制限チェック
                if (fullCode.length > 2000) {
                    await interaction.user.send({
                        content: `**\`${folderType}/${fileName}\` の無料コードです。**\n\nファイルが大きいため、分割して送信します。`,
                    });
                    // 1950文字ごとに分割し、各チャンクにコードブロックを開始
                    const chunks = fileContent.match(/[\s\S]{1,1950}/g);
                    for (const chunk of chunks) {
                         await interaction.user.send(`\`\`\`javascript\n${chunk}\n\`\`\``);
                    }

                } else {
                    await interaction.user.send({
                        content: `**\`${folderType}/${fileName}\` の無料コードです。**\n\n${fullCode}`,
                    });
                }
                
                await interaction.editReply({
                    content: `✅ ファイル \`${folderType}/${fileName}\` のコードをDMに送信しました！DMを確認してください。`,
                    components: [],
                });

            } catch (dmError) {
                console.error('DM送信中にエラーが発生しました:', dmError);
                await interaction.editReply({
                    content: '❌ コードのDM送信に失敗しました。DMが閉じられていないか確認してください。',
                    components: [],
                });
                return; 
            }
            
            // --- 2. 実績ログ送信 ---
            const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🥇 コード購入 (無料) 実績 🥇')
                    .setDescription(`${interaction.user} が無料コードを取得しました。`)
                    .addFields(
                        { name: '取得ユーザー', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: false },
                        { name: '取得ファイル', value: `\`${folderType}/${fileName}\``, inline: true }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] }).catch(e => console.error('ログ送信失敗:', e));
            }
            return;
        }
    },
};
