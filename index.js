const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif!\n');
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Slash Komutlarını Discord'a Otomatik Kaydetme
const slashCommands = [
    { name: 'selam', description: 'Botla selamlaşırsınız.' },
    { name: 'yardım', description: 'Gelişmiş komut listesini gösterir.' },
    { name: 'ping', description: 'Botun gecikme süresini gösterir.' },
    { name: 'zar', description: '1 ile 6 arasında rastgele zar atar.' },
    { name: 'yazıtura', description: 'Yazı tura atar.' },
    { name: 'bilgi', description: 'Sunucu hakkında bilgi verir.' },
    { 
        name: 'temizle', 
        description: 'Belirtilen miktarda mesaj siler.', 
        options: [{ name: 'sayı', type: 4, description: 'Silinecek mesaj sayısı (1-100)', required: true }] 
    },
    { 
        name: 'partner', 
        description: '#partner-log kanalında partnerlik paylaşımı yapar.', 
        options: [{ name: 'metin', type: 3, description: 'Partner metni ve davet linki', required: true }] 
    }
];

client.once('ready', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı! Türkçe bot aktif.`);

    // Slash komutlarını global olarak kaydet
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('✅ Slash (/) komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('❌ Slash komutları kaydedilirken hata oluştu:', error);
    }
});

// ==========================================
// 📥 HOŞ GELDİN & GİDİŞ SİSTEMİ
// ==========================================
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.find(c => c.name === 'hosgeldin-hg' || c.name === 'gelen-giden' || c.name === 'genel');
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('🎉 Sunucuya Yeni Biri Katıldı!')
        .setDescription(`Aramıza hoş geldin ${member}! Seninle beraber **${member.guild.memberCount}** kişi olduk.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await kanal.send({ embeds: [embed] });
});

client.on('guildMemberRemove', async (member) => {
    const kanal = member.guild.channels.cache.find(c => c.name === 'hosgeldin-hg' || c.name === 'gelen-giden' || c.name === 'genel');
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('👋 Aramızdan Biri Ayrıldı')
        .setDescription(`**${member.user.tag}** sunucumuzdan ayrıldı. Toplam **${member.guild.memberCount}** kişi kaldık.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await kanal.send({ embeds: [embed] });
});

// ==========================================
// 💬 1. YÖNTEM: a! İLE BAŞLAYAN MESAJ KOMUTLARI
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('a!')) return; // Sadece a! ile başlayanları algılar

    const args = message.content.slice(2).trim().split(/ +/);
    const komut = args.shift().toLowerCase();

    if (komut === 'selam' || komut === 'merhaba') {
        await message.reply(`Aleykümselam ${message.author}! Sana nasıl yardımcı olabilirim?`);
    }
    else if (komut === 'nasılsın') {
        await message.reply('Çok iyiyim, teşekkürler! Sunucunu yönetmene yardım etmek için buradayım.');
    }
    else if (komut === 'ping') {
        await message.reply(`Pong! 🏓 Bot Gecikmesi: **${Math.round(client.ws.ping)}ms**`);
    }
    else if (komut === 'bilgi' || komut === 'sunucu') {
        const sunucuEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 ${message.guild.name} - Sunucu Bilgileri`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Sunucu Sahibi', value: `<@${message.guild.ownerId}>`, inline: true },
                { name: '👥 Toplam Üye', value: `${message.guild.memberCount}`, inline: true },
                { name: '💬 Kanal Sayısı', value: `${message.guild.channels.cache.size}`, inline: true }
            )
            .setTimestamp();
        await message.channel.send({ embeds: [sunucuEmbed] });
    }
    else if (komut === 'zar') {
        const zar = Math.floor(Math.random() * 6) + 1;
        await message.reply(`🎲 Attığın zar: **${zar}**`);
    }
    else if (komut === 'yazıtura') {
        const sonuc = Math.random() < 0.5 ? '🪙 **YAZI** geldi!' : '🪙 **TURA** geldi!';
        await message.reply(sonuc);
    }
    else if (komut === 'temizle' || komut === 'sil') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ **Mesajları Yönet** yetkin olmalı!');
        }
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) {
            return message.reply('⚠️ 1 ile 100 arasında bir sayı girmelisin! Örnek: `a!temizle 15`');
        }
        await message.channel.bulkDelete(miktar, true).catch(() => {
            message.reply('❌ 14 günden eski mesajlar toplu silinemez.');
        });
    }
    else if (komut === 'partner') {
        const metin = args.join(' ');
        if (!metin) return message.reply('⚠️ Partner metnini yazmalısın! Örnek: `a!partner Davet linkimiz: discord.gg/ornek`');

        const logKanal = message.guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logKanal) return message.reply('❌ Sunucuda **#partner-log** kanalı bulunamadı!');

        const partnerEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🤝 YENİ PARTNERLİK ANLAŞMASI!')
            .setDescription(metin)
            .addFields({ name: '🛡️ Yetkili', value: `${message.author}`, inline: true })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        await logKanal.send({ content: '@everyone & @here', embeds: [partnerEmbed] });
        await message.reply('✅ Partner duyurusu **#partner-log** kanalına gönderildi!');
    }
    else if (komut === 'yardım') {
        const yardimEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 Türkçe Bot Komut Listesi')
            .setDescription('Komutları ister **`a!`** ön ekiyle ister **`/`** ile kullanabilirsin:')
            .addFields(
                { name: '🟢 Komutlar', value: '`selam`, `nasılsın`, `ping`, `bilgi`, `zar`, `yazıtura`, `temizle`, `partner`, `yardım`' }
            )
            .setFooter({ text: 'Bot 7/24 Aktif' });
        await message.channel.send({ embeds: [yardimEmbed] });
    }
});

// ==========================================
// ⚡ 2. YÖNTEM: / (SLASH) KOMUTLARI
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'selam') {
        await interaction.reply(`Aleykümselam ${interaction.user}! Sana nasıl yardımcı olabilirim?`);
    }
    else if (commandName === 'yardım') {
        await interaction.reply({ 
            content: '📜 **Türkçe Bot Komut Listesi:**\n• `a!selam` veya `/selam`\n• `a!ping` veya `/ping`\n• `a!zar` veya `/zar`\n• `a!temizle` veya `/temizle`\n• `a!partner` veya `/partner`',
            ephemeral: true 
        });
    }
    else if (commandName === 'ping') {
        await interaction.reply(`Pong! 🏓 Bot Gecikmesi: **${Math.round(client.ws.ping)}ms**`);
    }
    else if (commandName === 'zar') {
        const zar = Math.floor(Math.random() * 6) + 1;
        await interaction.reply(`🎲 Attığın zar: **${zar}**`);
    }
    else if (commandName === 'yazıtura') {
        const sonuc = Math.random() < 0.5 ? '🪙 **YAZI** geldi!' : '🪙 **TURA** geldi!';
        await interaction.reply(sonuc);
    }
    else if (commandName === 'bilgi') {
        await interaction.reply(`📊 Sunucu Adı: **${interaction.guild.name}**\n👥 Üye Sayısı: **${interaction.guild.memberCount}**`);
    }
    else if (commandName === 'temizle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ **Mesajları Yönet** yetkin olmalı!', ephemeral: true });
        }
        const miktar = options.getInteger('sayı');
        await interaction.channel.bulkDelete(miktar, true).catch(() => {});
        await interaction.reply({ content: `✅ Başarıyla **${miktar}** adet mesaj silindi!`, ephemeral: true });
    }
    else if (commandName === 'partner') {
        const metin = options.getString('metin');
        const logKanal = interaction.guild.channels.cache.find(c => c.name === 'partner-log');
        if (!logKanal) return interaction.reply({ content: '❌ Sunucuda **#partner-log** kanalı bulunamadı!', ephemeral: true });

        const partnerEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🤝 YENİ PARTNERLİK ANLAŞMASI!')
            .setDescription(metin)
            .addFields({ name: '🛡️ Yetkili', value: `${interaction.user}`, inline: true })
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setTimestamp();

        await logKanal.send({ content: '@everyone & @here', embeds: [partnerEmbed] });
        await interaction.reply({ content: '✅ Partner duyurusu **#partner-log** kanalına gönderildi!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
