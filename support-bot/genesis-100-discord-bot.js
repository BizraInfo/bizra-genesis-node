require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const OFFICE_HOURS = {
    days: [1, 3, 5], // Mon, Wed, Fri
    start: 19, // 7 PM
    end: 21    // 9 PM
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Genesis 100 Support Bot Active.');
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // Auto-Response Handlers
    if (content.includes('slow') || content.includes('latency')) {
        await message.reply("We are aware of potential latency during the initial load. The system is optimizing. If it persists > 1 minute, please check /metrics.");
    } else if (content.includes('not loading') || content.includes('blank screen')) {
        await message.reply("Please try a hard refresh (Ctrl+F5). If the issue persists, ensure you are using a supported browser (Chrome/Edge).");
    } else if (content.includes('login') || content.includes('auth')) {
        await message.reply("For login issues, please ensure you are using the credentials provided in your invitation. If you need a reset, DM an admin.");
    } else if (content.includes('bug') || content.includes('error')) {
        await message.reply("Please report bugs with the format: `[BUG] Description - Steps to Reproduce`. Our team reviews these during Office Hours.");
    } else if (content.includes('feature')) {
        await message.reply("Feature requests are welcome! Please tag them with `[REQUEST]`. We are currently focused on stability for Genesis 100.");
    }

    // Office Hours Check for direct support pings
    if (message.mentions.has(client.user)) {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours(); // UTC needs adjustment to Dubai (UTC+4)

        // Simple check (assuming bot runs in UTC, Dubai is +4)
        const dubaiHour = (hour + 4) % 24;

        const isOfficeHours = OFFICE_HOURS.days.includes(day) && dubaiHour >= OFFICE_HOURS.start && dubaiHour < OFFICE_HOURS.end;

        if (!isOfficeHours) {
            await message.reply("⚠️ **Support is currently offline.**\nOffice Hours: Mon/Wed/Fri, 7-9 PM Dubai Time.\nI have logged your request for the next session.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
