const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

const PREFIX = '&';
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const warns = new Map();

function isStaff(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.permissions.has(PermissionsBitField.Flags.BanMembers);
}

// Comandos slash
const commands = [
    { name: 'ban', description: 'Banir um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'unban', description: 'Desbanir', options: [{ name: 'id', type: 3, required: true, description: 'ID' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'banlist', description: 'Lista de banidos' },
    { name: 'mute', description: 'Mutar', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'tempo', type: 4, required: true, description: 'Minutos' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'unmute', description: 'Desmutar', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'warn', description: 'Advertir', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'warns', description: 'Ver warns', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }] },
    { name: 'adv1', description: 'ADV STAFF 1', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'adv2', description: 'ADV STAFF 2', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'adv3', description: 'ADV STAFF 3', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'ajuda', description: 'Mostrar comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('Registrando comandos...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Comandos registrados!');
    } catch (error) {
        console.error(error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
    await registerCommands();
    console.log('Bot pronto!');
});

// Comandos de prefixo
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member = message.member;

    if (!isStaff(member)) return message.reply('❌ Você não tem permissão!');

    if (command === 'ban') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        message.reply(`✅ ${user.tag} banido por ${message.author.tag}! Motivo: ${reason}`);
    }
    else if (command === 'unban') {
        const id = args[0];
        if (!id) return message.reply('❌ Informe o ID!');
        try {
            await message.guild.members.unban(id);
            message.reply(`✅ Usuário ${id} desbanido por ${message.author.tag}!`);
        } catch { message.reply('❌ ID inválido!'); }
    }
    else if (command === 'banlist') {
        const bans = await message.guild.bans.fetch();
        if (bans.size === 0) return message.reply('📋 Nenhum banido.');
        const lista = bans.map(ban => `🔨 ${ban.user.tag} - ${ban.reason || 'Sem motivo'}`).join('\n');
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000))] });
    }
    else if (command === 'mute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const time = parseInt(args[1]);
        if (isNaN(time)) return message.reply('❌ Informe minutos!');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(time * 60 * 1000, reason);
        message.reply(`✅ ${user.tag} mutado por ${time} min por ${message.author.tag}! Motivo: ${reason}`);
    }
    else if (command === 'unmute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        message.reply(`✅ ${user.tag} desmutado por ${message.author.tag}!`);
    }
    else if (command === 'warn') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: message.author.tag, date: new Date() });
        message.reply(`✅ ${user.tag} recebeu warn de ${message.author.tag}! Motivo: ${reason} | Total: ${warns.get(user.id).length}`);
    }
    else if (command === 'warns') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const list = warns.get(user.id);
        if (!list || list.length === 0) return message.reply(`📋 ${user.tag} não tem warns.`);
        const desc = list.map((w, i) => `${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(desc)] });
    }
    else if (command === 'adv1' || command === 'adv2' || command === 'adv3') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const roleName = command === 'adv1' ? 'ADV STAFF 1' : command === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return message.reply(`❌ Cargo ${roleName} não existe!`);
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        message.reply(`✅ ${roleName} dado a ${user.tag} por ${message.author.tag}! Motivo: ${motivo}`);
    }
    else if (command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: ${PREFIX} | Slash: /`)
            .addFields(
                { name: '🔨 Moderação', value: '`ban`, `unban`, `banlist`, `mute`, `unmute`, `warn`, `warns`', inline: false },
                { name: '🏷️ ADV Staff', value: '`adv1`, `adv2`, `adv3`', inline: false }
            );
        message.reply({ embeds: [embed] });
    }
});

// Slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });

    const cmd = interaction.commandName;

    if (cmd === 'ban') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.ban(user.id, { reason: motivo });
        interaction.reply({ content: `✅ ${user.tag} banido por ${interaction.user.tag}! Motivo: ${motivo}`, ephemeral: true });
    }
    else if (cmd === 'unban') {
        const id = interaction.options.getString('id');
        try {
            await interaction.guild.members.unban(id);
            interaction.reply({ content: `✅ Usuário ${id} desbanido por ${interaction.user.tag}!`, ephemeral: true });
        } catch { interaction.reply({ content: '❌ ID inválido!', ephemeral: true }); }
    }
    else if (cmd === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} - ${ban.reason || 'Sem motivo'}`).join('\n');
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000))], ephemeral: true });
    }
    else if (cmd === 'mute') {
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        interaction.reply({ content: `✅ ${user.tag} mutado por ${tempo} min por ${interaction.user.tag}! Motivo: ${motivo}`, ephemeral: true });
    }
    else if (cmd === 'unmute') {
        const user = interaction.options.getUser('usuario');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(null);
        interaction.reply({ content: `✅ ${user.tag} desmutado por ${interaction.user.tag}!`, ephemeral: true });
    }
    else if (cmd === 'warn') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason: motivo, moderator: interaction.user.tag, date: new Date() });
        interaction.reply({ content: `✅ Warn em ${user.tag} por ${interaction.user.tag}! Motivo: ${motivo} | Total: ${warns.get(user.id).length}`, ephemeral: true });
    }
    else if (cmd === 'warns') {
        const user = interaction.options.getUser('usuario');
        const list = warns.get(user.id);
        if (!list || list.length === 0) return interaction.reply({ content: `📋 ${user.tag} não tem warns.`, ephemeral: true });
        const desc = list.map((w, i) => `${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(desc)], ephemeral: true });
    }
    else if (cmd === 'adv1' || cmd === 'adv2' || cmd === 'adv3') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        const roleName = cmd === 'adv1' ? 'ADV STAFF 1' : cmd === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.reply({ content: `❌ Cargo ${roleName} não existe!`, ephemeral: true });
        const target = await interaction.guild.members.fetch(user.id);
        await target.roles.add(role);
        interaction.reply({ content: `✅ ${roleName} dado a ${user.tag} por ${interaction.user.tag}! Motivo: ${motivo}`, ephemeral: true });
    }
    else if (cmd === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: ${PREFIX} | Slash: /`)
            .addFields(
                { name: '🔨 Moderação', value: '`ban`, `unban`, `banlist`, `mute`, `unmute`, `warn`, `warns`', inline: false },
                { name: '🏷️ ADV Staff', value: '`adv1`, `adv2`, `adv3`', inline: false }
            );
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);
