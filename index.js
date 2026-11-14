// --- RENDER PORT ÇÖZÜCÜ ---
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif!\n');
}).listen(process.env.PORT || 3000);

// --- GLOBAL HATA KORUMASI ---
process.on('unhandledRejection', error => console.error('Asenkron Hata:', error));
process.on('uncaughtException', error => console.error('Sistem Hatası:', error));

// --- DISCORD.JS ---
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

// --- BOT HAZIRLIK ---
client.once('clientReady', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı! Türkçe bot aktif.`);

    const commands = [
        new SlashCommandBuilder().setName('yardım').setDescription('Botun tüm komut listesini gösterir.'),
        new SlashCommandBuilder().setName('ping').setDescription('Botun gecikme süresini ölçer.'),
        new SlashCommandBuilder().setName('zar').setDescription('1 ile 6 arasında rastgele zar atar.'),
        new SlashCommandBuilder().setName('temizle').setDescription('Belirtilen miktarda mesajı siler.').addIntegerOption(o => o.setName('sayı').setDescription('Silinecek miktar').setRequired(true)),
        new SlashCommandBuilder().setName('yasakla').setDescription('Bir kullanıcıyı yasaklar.').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true)).addStringOption(o => o.setName('sebep').setDescription('Sebep')),
        new SlashCommandBuilder().setName('yasak-kaldır').setDescription('Yasağı kaldırır.').addStringOption(o => o.setName('id').setDescription('Kullanıcı ID').setRequired(true)),
        new SlashCommandBuilder().setName('at').setDescription('Sunucudan atar.').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true)),
        new SlashCommandBuilder().setName('sustur').setDescription('Zaman aşımı uygular.').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true)).addIntegerOption(o => o.setName('dakika').setDescription('Süre').setRequired(true)),
        new SlashCommandBuilder().setName('yavaş-mod').setDescription('Yavaş mod ayarlar.').addIntegerOption(o => o.setName('saniye').setDescription('Saniye').setRequired(true)),
        new SlashCommandBuilder().setName('kilitle').setDescription('Kanalı kilitler.'),
        new SlashCommandBuilder().setName('kilit-aç').setDescription('Kanal kilidini açar.'),
        new SlashCommandBuilder().setName('kullanıcı-bilgi').setDescription('Kullanıcı bilgisi gösterir.').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi')),
        new SlashCommandBuilder().setName('sunucu-bilgi').setDescription('Sunucu bilgisi gösterir.'),
        new SlashCommandBuilder().setName('duyuru').setDescription('Duyuru yapar.').addStringOption(o => o.setName('mesaj').setDescription('Metin').setRequired(true)),
        new SlashCommandBuilder().setName('partner').setDescription('Partner duyurusu yapar.').addStringOption(o => o.setName('metin').setDescription('Metin').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash komutları yüklendi!');
    } catch (e) {
        console.error(e);
    }
});

// --- LOGLAR ---
client.on('guildMemberAdd', m => {
    const ch = m.guild.channels.cache.find(c => c.name === 'hosgeldin-hg' || c.name === 'hoşgeldin');
    if (ch) ch.send(`🎉 Hoş geldin, ${m}! Toplam **${m.guild.memberCount}** kişi olduk.`).catch(() => {});
});

client.on('guildMemberRemove', m => {
    const ch = m.guild.channels.cache.find(c => c.name === 'hosgeldin-hg' || c.name === 'hoşgeldin');
    if (ch) ch.send(`👋 **${m.user.tag}** ayrıldı.`).catch(() => {});
});

client.on('messageDelete', msg => {
    if (!msg.guild || msg.author?.bot) return;
    const ch = msg.guild.channels.cache.find(c => c.name === 'mesaj-log' || c.name === 'mod-log');
    if (!ch) return;
    ch.send({ embeds: [new EmbedBuilder().setTitle('🗑️ Mesaj Silindi').setColor('Red').addFields({ name: 'Yazan', value: `${msg.author}` }, { name: 'İçerik', value: msg.content || 'Yok' })] }).catch(() => {});
});

// --- PREFIX KOMUTLAR (a!) ---
client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;
    const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'yardım') {
        return msg.reply({ embeds: [new EmbedBuilder().setTitle('🛠️ Komutlar').setDescription('`a!yasakla`, `a!at`, `a!sustur`, `a!temizle`, `a!kilitle`, `a!kilit-aç`, `a!duyuru`, `a!partner`').setColor('Blue')] });
    }
    if (cmd === 'selam') return msg.reply(`Aleykümselam ${msg.author}!`);
    if (cmd === 'ping') return msg.reply(`Pong! **${client.ws.ping}ms**`);
    if (cmd === 'zar') return msg.reply(`🎲 Zar: **${Math.floor(Math.random() * 6) + 1}**`);

    if (cmd === 'temizle') {
        if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return msg.reply('❌ Yetkin yok!');
        const count = parseInt(args[0]);
        if (!count || count < 1 || count > 100) return msg.reply('⚠️ 1-100 arası sayı gir!');
        await msg.channel.bulkDelete(count, true).catch(() => {});
        const m = await msg.channel.send(`🧹 **${count}** mesaj silindi.`);
        setTimeout(() => m.delete().catch(() => {}), 3000);
    }
});

// --- SLASH KOMUTLAR (/) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'yardım') {
        return await interaction.reply({ content: '🛠️ Tüm komutları hem `a!` hem de `/` ile kullanabilirsin!', ephemeral: true });
    }
    if (commandName === 'ping') {
        return await interaction.reply({ content: `Pong! **${client.ws.ping}ms**`, ephemeral: true });
    }
    if (commandName === 'zar') {
        return await interaction.reply({ content: `🎲 Zar: **${Math.floor(Math.random() * 6) + 1}**` });
    }
    if (commandName === 'temizle') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return await interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
        const count = interaction.options.getInteger('sayı');
        await interaction.channel.bulkDelete(count, true).catch(() => {});
        return await interaction.reply({ content: `🧹 **${count}** mesaj silindi.`, ephemeral: true });
    }
    if (commandName === 'partner') {
        const text = interaction.options.getString('metin');
        const ch = interaction.guild.channels.cache.find(c => c.name === 'partner-log');
        if (!ch) return await interaction.reply({ content: '⚠️ `#partner-log` kanalı bulunamadı!', ephemeral: true });
        await ch.send({ embeds: [new EmbedBuilder().setTitle('🤝 Partner').setDescription(text).setColor('Gold')] });
        return await interaction.reply({ content: '✅ Partner gönderildi!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
