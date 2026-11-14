const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag} başarıyla giriş yaptı! Türkçe bot aktif.`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const mesaj = message.content.toLowerCase();

  if (mesaj === '!selam' || mesaj === '!merhaba') {
    await message.reply(`Aleykümselam ${message.author}! Sana nasıl yardımcı olabilirim?`);
  }
  else if (mesaj === '!yardım') {
    await message.channel.send(
      '📜 **Türkçe Bot Komutları:**\n' +
      '• `!selam` veya `!merhaba` - Botla selamlaşırsın.\n' +
      '• `!nasılsın` - Botun hatırını sorarsın.\n' +
      '• `!bilgi` - Sunucu hakkında bilgi verir.'
    );
  }
  else if (mesaj === '!nasılsın') {
    await message.reply('Çok iyiyim, teşekkürler! Sunucunu yönetmene yardım etmek için buradayım. 🤖');
  }
  else if (mesaj === '!bilgi') {
    await message.channel.send(`Bu sunucu **${message.guild.name}** adıyla tamamen Türkçe komutlarla yönetilmektedir!`);
  }
});

// EN ÖNEMLİ KISIM: Aşağıdaki tek tırnakların arasına Discord'dan aldığın Token'ı yapıştır
client.login('MTU3MTE0MDgxODk1MTk5NTUzNA.GoawhJ.1SfSYs_iqs2dqXb11Qh7-saVjgir_xOfwKECU4');
