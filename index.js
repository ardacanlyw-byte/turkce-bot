// --- RENDER PORT ÇÖZÜCÜ (Kaldırma!) ---
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif!\n');
}).listen(process.env.PORT || 3000);

// --- DISCORD.JS BAĞLANTILARI ---
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

// --- BOT HAZIR OLDUĞUNDA ---
client.once('clientReady', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı! Türkçe bot aktif.`);

    // Tamamen Türkçe Slash Komutları
    const commands = [
        new SlashCommandBuilder().setName('yardım').setDescription('Botun tüm komut listesini gösterir.'),
        new SlashCommandBuilder().setName('ping').setDescription('Botun gecikme süresini ölçer.'),
        new SlashCommandBuilder().setName('zar').setDescription('1 ile 6 arasında rastgele zar atar.'),
        new SlashCommandBuilder().setName('temizle').setDescription('Belirtilen miktarda mesajı siler.').addIntegerOption(option => option.name('sayı').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Bir kullanıcıyı sunucudan kalıcı olarak yasaklar.').addUserOption(option => option.name('kullanıcı').setDescription('Yasaklanacak kişi').setRequired(true)).addStringOption(option => option.name('sebep').setDescription('Yasaklama sebebi')),
        new SlashCommandBuilder().setName('yasak-kaldır').setDescription('ID ile kullanıcının yasağını kaldırır.').addStringOption(option => option.name('id').setDescription('Kullanıcı ID').setRequired(true)),
        new SlashCommandBuilder().setName('at').setDescription('Bir kullanıcıyı sunucudan atar.').addUserOption(option => option.name('kullanıcı').setDescription('Atılacak kişi').setRequired(true)).addStringOption(option => option.name('sebep').setDescription('Atılma sebebi')),
        new SlashCommandBuilder().setName('sustur').setDescription('Bir kullanıcıya zaman aşımı (mute) uygular.').addUserOption(option => option.name('kullanıcı').setDescription('Susturulacak kişi').setRequired(true)).addIntegerOption(option => option.name('dakika').setDescription('Süre (dakika)').setRequired(true)),
        new SlashCommandBuilder().setName('yavaş-mod').setDescription('Kanalda yavaş mod (slowmode) ayarlar.').addIntegerOption(option => option.name('saniye').setDescription('Saniye (0 kapatır)').setRequired(true)),
        new SlashCommandBuilder().setName('kilitle').setDescription('Kanalı mesaj yazmaya kapatır.'),
        new SlashCommandBuilder().setName('kilit-aç').setDescription('Kanalın kilidini açar.'),
        new SlashCommandBuilder().setName('kullanıcı-bilgi').setDescription('Bir kullanıcının detaylı bilgilerini gösterir.').addUserOption(option => option.name('kullanıcı').setDescription('Bilgisi istenen kişi')),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu istatistiklerini gösterir.'),
        new SlashCommandBuilder().setName('duyuru').setDescription('Bot aracılığıyla duyuru metni yayımlar.').addStringOption(option => option.name('mesaj').setDescription('Duyuru metni').setRequired(true)),
        new SlashCommandBuilder().setName('partner').setDescription('Partnerlik duyurusu yapar.').addStringOption(option => option.name('metin').setDescription('Partner metni veya davet linki').setRequired(true))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Türkçe Slash (/) komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error(error);
    }
});

// ==========================================
// --- OTOMATİK GELİŞMİŞ LOG SİSTEMLERİ ---
// ==========================================

// 1. Üye Katılma / Ayrılma Logu
client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'hosgeldin-hg' || ch.name === 'hoşgeldin');
    if (channel) {
        channel.send(`🎉 Sunucumuza hoş geldin, ${member}! Seninle beraber **${member.guild.memberCount}** kişi olduk.`);
    }
});

client.on('guildMemberRemove', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'hosgeldin-hg' || ch.name === 'hoşgeldin');
    if (channel) {
        channel.send(`👋 **${member.user.tag}** aramızdan ayrıldı.`);
    }
});

// 2. Mesaj Silinme Logu (#mesaj-log veya #mod-log kanalına gider)
client.on('messageDelete', message => {
    if (!message.guild || message.author?.bot) return;
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'mesaj-log' || ch.name === 'mod-log');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Mesaj Silindi')
        .setColor('#ff3333')
        .addFields(
            { name: 'Kullanıcı', value: `${message.author} (${message.author.tag})`, inline: true },
            { name: 'Kanal', value: `${message.channel}`, inline: true },
            { name: 'Silinen Mesaj', value: message.content || '*İçerik yok (Görsel veya Embed)*' }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// 3. Mesaj Düzenlenme Logu
client.on('messageUpdate', (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const logChannel = oldMessage.guild.channels.cache.find(ch => ch.name === 'mesaj-log' || ch.name === 'mod-log');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('✏️ Mesaj Düzenlendi')
        .setColor('#ffaa00')
        .addFields(
            { name: 'Kullanıcı', value: `${oldMessage.author} (${oldMessage.author.tag})`, inline: true },
            { name: 'Kanal', value: `${oldMessage.channel}`, inline: true },
            { name: 'Eski Mesaj', value: oldMessage.content || '*Yok*' },
            { name: 'Yeni Mesaj', value: newMessage.content || '*Yok*' }
        )
        .setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
});

// --- MESAJ TABANLI KOMUTLAR (a!) ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // YARDIM
    if (command === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Türkçe Gelişmiş Bot Komut Listesi')
            .setColor('#0099ff')
            .addFields(
                { name: '🛡️ Moderasyon', value: '`a!yasakla`, `a!yasak-kaldır`, `a!at`, `a!sustur`, `a!temizle`, `a!yavaş-mod`, `a!kilitle`, `a!kilit-aç`' },
                { name: '📊 Bilgi & Eğlence', value: '`a!kullanıcı-bilgi`, `a!sunucu-bilgi`, `a!duyuru`, `a!selam`, `a!ping`, `a!zar`, `a!partner`' }
            )
            .setFooter({ text: 'Komutları ister a! ön ekiyle ister / ile kullanabilirsin!' });
        return message.reply({ embeds: [embed] });
    }

    if (command === 'selam') return message.reply(`Aleykümselam ${message.author}! Nasıl yardımcı olabilirim?`);
    if (command === 'ping') return message.reply(`Pong! 🏓 Gecikme süresi: **${client.ws.ping}ms**`);
    
    if (command === 'zar') {
        const sonuc = Math.floor(Math.random() * 6) + 1;
        return message.reply(`🎲 Attığın zar: **${sonuc}**`);
    }

    // TEMİZLE
    if (command === 'temizle') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply('❌ Bu komut için *Mesajları Yönet* yetkin olmalı!');
        
        const count = parseInt(args[0]);
        if (!count || count < 1 || count > 100)
            return message.reply('⚠️ Lütfen 1 ile 100 arasında bir sayı belirtin!');

        await message.channel.bulkDelete(count, true).catch(() => {});
        const msg = await message.channel.send(`🧹 Başarıyla **${count}** adet mesaj silindi.`);
        setTimeout(() => msg.delete().catch(() => {}), 3000);
    }

    // YASAKLA (BAN)
    if (command === 'yasakla') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply('❌ Bu komut için *Üyeleri Yasakla* yetkin olmalı!');

        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
        if (!user) return message.reply('⚠️ Kullanım: `a!yasakla @kullanıcı [sebep]`');

        await message.guild.bans.create(user, { reason });
        return message.reply(`✅ **${user.tag}** sunucudan yasaklandı.`);
    }

    // YASAK KALDIR (UNBAN)
    if (command === 'yasak-kaldır') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply('❌ Yetkiniz yok!');
        const userId = args[0];
        if (!userId) return message.reply('⚠️ Kullanım: `a!yasak-kaldır [Kullanıcı ID]`');
        
        await message.guild.bans.remove(userId);
        return message.reply(`✅ Belirtilen kullanıcının yasağı kaldırıldı.`);
    }

    // AT (KICK)
    if (command === 'at') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply('❌ Bu komut için yetkin yok!');

        const user = message.mentions.users.first();
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
        if (!user) return message.reply('⚠️ Kullanım: `a!at @kullanıcı [sebep]`');

        const member = message.guild.members.cache.get(user.id);
        await member.kick(reason);
        return message.reply(`✅ **${user.tag}** sunucudan atıldı.`);
    }

    // SUSTUR (TIMEOUT)
    if (command === 'sustur') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
            return message.reply('❌ Yetkiniz yok!');

        const user = message.mentions.users.first();
        const minutes = parseInt(args[1]);
        if (!user || !minutes) return message.reply('⚠️ Kullanım: `a!sustur @kullanıcı [dakika]`');

        const member = message.guild.members.cache.get(user.id);
        await member.timeout(minutes * 60 * 1000, 'Moderatör tarafından susturuldu.');
        return message.reply(`🔇 **${user.tag}** ${minutes} dakika süreyle susturuldu.`);
    }

    // YAVAŞ MOD (SLOWMODE)
    if (command === 'yavaş-mod') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return message.reply('❌ Yetkiniz yok!');

        const time = parseInt(args[0]);
        if (isNaN(time)) return message.reply('⚠️ Kullanım: `a!yavaş-mod [saniye]`');

        await message.channel.setRateLimitPerUser(time);
        return message.reply(`⏱️ Kanal yavaş modu **${time}** saniye yapıldı.`);
    }

    // KİLİTLE & KİLİT AÇ
    if (command === 'kilitle') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Yetkiniz yok!');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply('🔒 Kanal mesaj yazmaya kapatıldı.');
    }

    if (command === 'kilit-aç') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Yetkiniz yok!');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return message.reply('🔓 Kanalın kilidi açıldı.');
    }

    // KULLANICI BİLGİ
    if (command === 'kullanıcı-bilgi') {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${member.user.tag} Bilgileri`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: member.id, inline: true },
                { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🤖 Hesap Oluşturma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setColor('#00ffcc');
        return message.reply({ embeds: [embed] });
    }

    // SUNUCU BİLGİ
    if (command === 'sunucu-bilgi') {
        const { guild } = message;
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name} İstatistikleri`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Sunucu Sahibi', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Üye Sayısı', value: `${guild.memberCount} kişi`, inline: true },
                { name: '📅 Kuruluş Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
            )
            .setColor('#ff00aa');
        return message.reply({ embeds: [embed] });
    }

    // DUYURU (SAY)
    if (command === 'duyuru') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Yetkiniz yok!');
        const text = args.join(' ');
        if (!text) return message.reply('⚠️ Yazılacak duyuru metnini belirtin.');
        await message.delete().catch(() => {});
        return message.channel.send(`📢 **Duyuru:** ${text}`);
    }

    // PARTNER
    if (command === 'partner') {
        const text = args.join(' ');
        if (!text) return message.reply('⚠️ Partner metnini yazın!');
        const logChannel = message.guild.channels.cache.find(ch => ch.name === 'partner-log');
        if (!logChannel) return message.reply('⚠️ `#partner-log` adında kanal bulamadım!');

        const embed = new EmbedBuilder().setTitle('🤝 Yeni Partner Duyurusu!').setDescription(text).setColor('#ffd700');
        await logChannel.send({ embeds: [embed] });
        return message.reply('✅ Partner duyurusu başarıyla `#partner-log` kanalına gönderildi!');
    }
});

// --- TÜRKÇE SLASH (/) KOMUT YÖNETİCİSİ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Türkçe Gelişmiş Bot Komut Listesi')
            .setColor('#0099ff')
            .addFields(
                { name: '🛡️ Moderasyon', value: '`/yasakla`, `/yasak-kaldır`, `/at`, `/sustur`, `/temizle`, `/yavaş-mod`, `/kilitle`, `/kilit-aç`' },
                { name: '📊 Bilgi & Eğlence', value: '`/kullanıcı-bilgi`, `/sunucu-bilgi`, `/duyuru`, `/selam`, `/ping`, `/zar`, `/partner`' }
            );
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (commandName === 'selam') await interaction.reply(`Aleykümselam ${interaction.user}!`);
    if (commandName === 'ping') await interaction.reply(`Pong! 🏓 Gecikme: **${client.ws.ping}ms**`);
    
    if (commandName === 'zar') {
        const sonuc = Math.floor(Math.random() * 6) + 1;
        await interaction.reply(`🎲 Attığın zar: **${sonuc}**`);
    }

    if (commandName === 'temizle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return interaction.reply({ content: '❌ Mesajları Yönet yetkin yok!', ephemeral: true });
        const count = interaction.options.getInteger('sayı');
        await interaction.channel.bulkDelete(count, true).catch(() => {});
        await interaction.reply({ content: `🧹 **${count}** adet mesaj silindi.`, ephemeral: true });
    }

    if (commandName === 'yasakla') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('sebep') || 'Sebep yok';
        await interaction.guild.bans.create(user, { reason });
        await interaction.reply(`✅ **${user.tag}** yasaklandı.`);
    }

    if (commandName === 'yasak-kaldır') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const id = interaction.options.getString('id');
        await interaction.guild.bans.remove(id);
        await interaction.reply(`✅ Yasağı kaldırıldı.`);
    }

    if (commandName === 'at') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const user = interaction.options.getUser('kullanıcı');
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick();
        await interaction.reply(`✅ **${user.tag}** atıldı.`);
    }

    if (commandName === 'sustur') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const user = interaction.options.getUser('kullanıcı');
        const mins = interaction.options.getInteger('dakika');
        const member = await interaction.guild.members.fetch(user.id);
        await member.timeout(mins * 60 * 1000);
        await interaction.reply(`🔇 **${user.tag}** ${mins} dakika susturuldu.`);
    }

    if (commandName === 'yavaş-mod') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const sec = interaction.options.getInteger('saniye');
        await interaction.channel.setRateLimitPerUser(sec);
        await interaction.reply(`⏱️ Yavaş mod **${sec}** saniye yapıldı.`);
    }

    if (commandName === 'kilitle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        await interaction.reply('🔒 Kanal kilitlendi.');
    }

    if (commandName === 'kilit-aç') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
        await interaction.reply('🔓 Kanal kilidi açıldı.');
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
        await interaction.reply({ embeds: [embed] });
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
        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'duyuru') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const text = interaction.options.getString('mesaj');
        await interaction.channel.send(`📢 **Duyuru:** ${text}`);
        await interaction.reply({ content: '✅ Duyuru gönderildi.', ephemeral: true });
    }

    if (commandName === 'partner') {
        const text = interaction.options.getString('metin');
        const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'partner-log');
        if (!logChannel) return interaction.reply({ content: '⚠️ `#partner-log` kanalı yok!', ephemeral: true });

        const embed = new EmbedBuilder().setTitle('🤝 Yeni Partner Duyurusu!').setDescription(text).setColor('#ffd700');
        await logChannel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Gönderildi!', ephemeral: true });
    }
});

// Botu başlat
client.login(process.env.DISCORD_TOKEN);
