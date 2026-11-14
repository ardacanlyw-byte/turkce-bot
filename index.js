// --- RENDER PORT ÇÖZÜCÜ (Kaldırma!) ---
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif!\n');
}).listen(process.env.PORT || 3000);

// --- GLOBAL HATA KORUMASI ---
process.on('unhandledRejection', error => console.error('Asenkron Hata:', error));
process.on('uncaughtException', error => console.error('Sistem Hatası:', error));

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

const PREFIX = "a!";

// Kullanıcı bazlı partner sayaç veritabanı (Bellek üstü harita)
// partnerStats.get(userId) = { daily, weekly, allTime, lastDate }
const partnerStats = new Map();

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// --- BOT HAZIR OLDUĞUNDA VE KOMUTLARI YÜKLEME ---
client.once('clientReady', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı! Gelişmiş partner sayaç sistemi aktif.`);

    const commands = [
        new SlashCommandBuilder().setName('yardım').setDescription('Kategorize edilmiş gelişmiş komut listesini gösterir.'),
        new SlashCommandBuilder().setName('ping').setDescription('Botun gecikme süresini ölçer.'),
        new SlashCommandBuilder().setName('temizle').setDescription('Belirtilen miktarda mesajı siler.').addIntegerOption(o => o.setName('sayı').setDescription('Silinecek miktar (1-100)').setRequired(true)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Bir kullanıcıyı yasaklar.').addUserOption(o => o.setName('kullanıcı').setDescription('Yasaklanacak kişi').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Sebep')),
        new SlashCommandBuilder().setName('yasak-kaldır').setDescription('ID ile yasağı kaldırır.').addStringOption(o => o.setName('id').setDescription('Kullanıcı ID').setRequired(true)),
        new SlashCommandBuilder().setName('at').setDescription('Sunucudan atar.').addUserOption(o => o.setName('kullanıcı').setDescription('Atılacak kişi').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Sebep')),
        new SlashCommandBuilder().setName('sustur').setDescription('Zaman aşımı (mute) uygular.').addUserOption(o => o.setName('kullanıcı').setDescription('Susturulacak kişi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setDescription('Süre (dakika)').setRequired(true)),
        new SlashCommandBuilder().setName('yavaş-mod').setDescription('Kanalda yavaş mod ayarlar.').addIntegerOption(o => o.setName('saniye').setDescription('Saniye (0 kapatır)').setRequired(true)),
        new SlashCommandBuilder().setName('kilitle').setDescription('Bulunduğun kanalı kilitler.'),
        new SlashCommandBuilder().setName('kilit-aç').setDescription('Kanalın kilidini açar.'),
        new SlashCommandBuilder().setName('kullanıcı-bilgi').setDescription('Kullanıcı detaylarını gösterir.').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi')),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu istatistiklerini gösterir.'),
        new SlashCommandBuilder().setName('duyuru').setDescription('Duyuru yayınlar.').addStringOption(o => o.setName('mesaj').setDescription('Metin').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Tüm komutlar başarıyla yüklendi!');
    } catch (e) {
        console.error(e);
    }
});

// ==========================================
// --- KAPSAMLI OTOMATİK LOG SİSTEMLERİ ---
// ==========================================

// 1. Üye Katılma Logu (#hosgeldin-hg)
client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('hosgeldin') || ch.name.toLowerCase().includes('giriş-çıkış'));
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🎉 Yeni Bir Üye Katıldı!')
        .setDescription(`Aramıza hoş geldin ${member}!`)
        .addFields(
            { name: '👥 Toplam Üye', value: `${member.guild.memberCount} kişi`, inline: true },
            { name: '📅 Hesap Kuruluşu', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setColor('#00ffcc')
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    channel.send({ embeds: [embed] }).catch(() => {});
});

// 2. Üye Ayrılma Logu (#hosgeldin-hg)
client.on('guildMemberRemove', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('hosgeldin') || ch.name.toLowerCase().includes('giriş-çıkış'));
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('👋 Bir Üye Ayrıldı')
        .setDescription(`**${member.user.tag}** aramızdan ayrıldı.`)
        .setColor('#ff3333');
    channel.send({ embeds: [embed] }).catch(() => {});
});

// 3. Mesaj Silinme Logu (#mesaj-log)
client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name.toLowerCase().includes('mesaj-log') || ch.name.toLowerCase().includes('mod-log'));
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Mesaj Silindi')
        .setColor('#ff3333')
        .addFields(
            { name: '👤 Yazan', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: '📍 Kanal', value: `${message.channel}`, inline: true },
            { name: '📝 Silinen Mesaj', value: message.content || '*İçerik yok (Görsel veya Embed)*' }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// ==========================================
// --- MESAJ YÖNETİCİSİ VE PARTNER SİSTEMİ ---
// ==========================================
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const channelName = message.channel.name.toLowerCase();

    // Belirttiğin kanallarda link algılama (╰꒷🌼・partnerler-2 veya ︰꒷🏵️・partnerler)
    if (channelName.includes('partnerler-2') || channelName.includes('partnerler')) {
        const hasInvite = message.content.includes('discord.gg/') || message.content.includes('discord.com/invite');
        
        if (hasInvite) {
            const userId = message.author.id;
            const today = getTodayString();

            if (!partnerStats.has(userId)) {
                partnerStats.set(userId, { daily: 0, weekly: 0, allTime: 0, lastDate: today });
            }

            const stats = partnerStats.get(userId);

            // Yeni güne geçildiyse günlük sayacı sıfırla
            if (stats.lastDate !== today) {
                stats.daily = 0;
                stats.lastDate = today;
            }

            stats.daily += 1;
            stats.weekly += 1;
            stats.allTime += 1;

            const partnerEmbed = new EmbedBuilder()
                .setTitle('🟩 Partner Kaydı')
                .setDescription(`> ${message.author} partner mesajı attı!`)
                .setColor('#00FF00')
                .addFields(
                    { name: '📅 Bugün', value: `**${stats.daily}** partner`, inline: true },
                    { name: '📊 Bu Hafta', value: `**${stats.weekly}** partner`, inline: true },
                    { name: '🏆 Tüm Zamanlar', value: `**${stats.allTime}** partner`, inline: true }
                )
                .setFooter({ text: `ID: ${message.author.id}` })
                .setTimestamp();

            // Orijinal mesaj silinmeden, altına yanıt (reply) olarak gönderilir
            await message.reply({ embeds: [partnerEmbed] }).catch(() => {});
            return;
        }
    }

    // --- PREFIX (a!) KOMUTLARI ---
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Kategorize Edilmiş Yardım Menüsü
    if (cmd === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Avenix Bot - Gelişmiş Komut Merkezi')
            .setDescription('Tüm komutları ister ön ek (`a!`) ile isterseniz slash (`/`) ile kullanabilirsiniz.')
            .setColor('#0099ff')
            .addFields(
                { 
                    name: '🛡️ Gelişmiş Moderasyon', 
                    value: '`a!yasakla`, `a!yasak-kaldır`, `a!at`, `a!sustur`, `a!temizle`, `a!yavaş-mod`, `a!kilitle`, `a!kilit-aç`' 
                },
                { 
                    name: '📊 Bilgi & Yönetim', 
                    value: '`a!kullanıcı-bilgi`, `a!sunucu-bilgi`, `a!duyuru`, `a!ping`' 
                },
                { 
                    name: '🤝 Partnerlik & Sayaç Sistemi', 
                    value: '`╰꒷🌼・partnerler-2` ve `︰꒷🏵️・partnerler` kanallarına link atıldığında bot mesajı silmeden altına günlük/haftalık/tüm zamanlar sayaçlı kutucuk ekler.' 
                }
            )
            .setFooter({ text: 'Gelişmiş Bot Altyapısı' })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'ping') return message.reply(`Pong! Gecikme: **${client.ws.ping}ms**`);

    if (cmd === 'temizle') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Mesajları Yönet yetkin yok!');
        const count = parseInt(args[0]);
        if (!count || count < 1 || count > 100) return message.reply('⚠️ Lütfen 1 ile 100 arasında bir sayı belirt.');
        await message.channel.bulkDelete(count, true).catch(() => {});
        const m = await message.channel.send(`🧹 **${count}** adet mesaj silindi.`);
        setTimeout(() => m.delete().catch(() => {}), 3000);
    }

    if (cmd === 'yasakla') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ Üyeleri Yasakla yetkin yok!');
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        if (!user) return message.reply('⚠️ Kullanım: `a!yasakla @kullanıcı [sebep]`');
        try {
            await message.guild.bans.create(user, { reason });
            return message.reply(`✅ **${user.tag}** sunucudan yasaklandı.`);
        } catch {
            return message.reply('❌ Kullanıcı yasaklanamadı (Yetkim yetmiyor olabilir).');
        }
    }

    if (cmd === 'yasak-kaldır') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ Yetkin yok!');
        const id = args[0];
        if (!id) return message.reply('⚠️ Kullanım: `a!yasak-kaldır [Kullanıcı ID]`');
        try {
            await message.guild.bans.remove(id);
            return message.reply(`✅ Belirtilen ID sahibinin yasağı kaldırıldı.`);
        } catch {
            return message.reply('❌ Bu ID ile yasaklı bir kullanıcı bulunamadı.');
        }
    }

    if (cmd === 'at') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply('❌ Üyeleri At yetkin yok!');
        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep yok';
        if (!user) return message.reply('⚠️ Kullanım: `a!at @kullanıcı [sebep]`');
        const member = await message.guild.members.fetch(user.id).catch(() => {});
        if (!member) return message.reply('❌ Kullanıcı sunucuda bulunamadı.');
        await member.kick(reason).catch(() => message.reply('❌ Kullanıcı atılamadı.'));
        return message.reply(`✅ **${user.tag}** sunucudan atıldı.`);
    }

    if (cmd === 'sustur') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Üyeleri Sustur yetkin yok!');
        const user = message.mentions.users.first();
        const mins = parseInt(args[1]);
        if (!user || !mins) return message.reply('⚠️ Kullanım: `a!sustur @kullanıcı [dakika]`');
        const member = await message.guild.members.fetch(user.id).catch(() => {});
        if (!member) return message.reply('❌ Üye bulunamadı.');
        await member.timeout(mins * 60 * 1000).catch(() => message.reply('❌ Susturulamadı.'));
        return message.reply(`🔇 **${user.tag}** ${mins} dakika süreyle susturuldu.`);
    }

    if (cmd === 'yavaş-mod') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Yetkin yok!');
        const sec = parseInt(args[0]);
        if (isNaN(sec)) return message.reply('⚠️ Kullanım: `a!yavaş-mod [saniye]`');
        await message.channel.setRateLimitPerUser(sec).catch(() => {});
        return message.reply(`⏱️ Kanal yavaş modu **${sec}** saniye olarak ayarlandı.`);
    }

    if (cmd === 'kilitle') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Yetkin yok!');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {});
        return message.reply('🔒 Kanal üyelerin mesaj yazmasına kapatıldı.');
    }

    if (cmd === 'kilit-aç') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Yetkin yok!');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true }).catch(() => {});
        return message.reply('🔓 Kanalın kilidi açıldı.');
    }

    if (cmd === 'kullanıcı-bilgi') {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${member.user.tag}`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: member.id, inline: true },
                { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🤖 Hesap Kuruluşu', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setColor('#00ffcc');
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'sunucu-bilgi') {
        const { guild } = message;
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} İstatistikleri`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Üye Sayısı', value: `${guild.memberCount} kişi`, inline: true },
                { name: '📅 Kuruluş', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
            )
            .setColor('#ff00aa');
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'duyuru') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Yetkin yok!');
        const text = args.join(' ');
        if (!text) return message.reply('⚠️ Duyuru metnini girin.');
        await message.delete().catch(() => {});
        return message.channel.send(`📢 **Duyuru:** ${text}`);
    }
});

// ==========================================
// --- SLASH (/) KOMUT YÖNETİCİSİ ---
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Avenix Bot - Gelişmiş Komut Merkezi')
            .setColor('#0099ff')
            .addFields(
                { name: '🛡️ Moderasyon', value: '`/yasakla`, `/yasak-kaldır`, `/at`, `/sustur`, `/temizle`, `/yavaş-mod`, `/kilitle`, `/kilit-aç`' },
                { name: '📊 Bilgi', value: '`/kullanıcı-bilgi`, `/sunucu-bilgi`, `/duyuru`, `/ping`' }
            );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'ping') return await interaction.reply({ content: `Pong! **${client.ws.ping}ms**`, ephemeral: true });

    if (commandName === 'temizle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const count = interaction.options.getInteger('sayı');
        await interaction.channel.bulkDelete(count, true).catch(() => {});
        return await interaction.reply({ content: `🧹 **${count}** mesaj silindi.`, ephemeral: true });
    }

    if (commandName === 'yasakla') {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return await interaction.editReply('❌ Yetkin yok!');
        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep yok';
        try {
            await interaction.guild.bans.create(user, { reason });
            await interaction.editReply(`✅ **${user.tag}** yasaklandı.`);
        } catch {
            await interaction.editReply('❌ Yasaklanamadı.');
        }
    }

    if (commandName === 'yasak-kaldır') {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return await interaction.editReply('❌ Yetkin yok!');
        const id = interaction.options.getString('id');
        try {
            await interaction.guild.bans.remove(id);
            await interaction.editReply(`✅ Yasağı kaldırıldı.`);
        } catch {
            await interaction.editReply('❌ Yasak kaldırılamadı.');
        }
    }

    if (commandName === 'at') {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return await interaction.editReply('❌ Yetkin yok!');
        const user = interaction.options.getUser('kullanıcı');
        const member = await interaction.guild.members.fetch(user.id).catch(() => {});
        if (!member) return await interaction.editReply('❌ Üye bulunamadı.');
        await member.kick().catch(() => {});
        await interaction.editReply(`✅ **${user.tag}** atıldı.`);
    }

    if (commandName === 'sustur') {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return await interaction.editReply('❌ Yetkin yok!');
        const user = interaction.options.getUser('kullanıcı');
        const mins = interaction.options.getInteger('dakika');
        const member = await interaction.guild.members.fetch(user.id).catch(() => {});
        if (!member) return await interaction.editReply('❌ Üye bulunamadı.');
        await member.timeout(mins * 60 * 1000).catch(() => {});
        await interaction.editReply(`🔇 **${user.tag}** ${mins} dakika susturuldu.`);
    }

    if (commandName === 'yavaş-mod') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const sec = interaction.options.getInteger('saniye');
        await interaction.channel.setRateLimitPerUser(sec).catch(() => {});
        await interaction.reply({ content: `⏱️ Yavaş mod **${sec}** saniye yapıldı.`, ephemeral: true });
    }

    if (commandName === 'kilitle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => {});
        await interaction.reply({ content: '🔒 Kilitlendi.', ephemeral: true });
    }

    if (commandName::kilit-aç) { // (Syntax check fix)
    }

    if (commandName === 'kilit-aç') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true }).catch(() => {});
        await interaction.reply({ content: '🔓 Kilidi açıldı.', ephemeral: true });
    }

    if (commandName === 'kullanıcı-bilgi') {
        const member = interaction.options.getMember('kullanıcı') || interaction.member;
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${member.user.tag}`)
            .addFields(
                { name: '🆔 ID', value: member.id, inline: true },
                { name: '📅 Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
            )
            .setColor('#00ffcc');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'sunucu-bilgi') {
        const { guild } = interaction;
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name}`)
            .addFields(
                { name: '👥 Üye', value: `${guild.memberCount}`, inline: true },
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true }
            )
            .setColor('#ff00aa');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'duyuru') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const text = interaction.options.getString('mesaj');
        await interaction.channel.send(`📢 **Duyuru:** ${text}`).catch(() => {});
        await interaction.reply({ content: '✅ Duyuru gönderildi.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
