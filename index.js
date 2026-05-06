const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, ChannelType, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = '&';
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Cargos ADV Staff
const ADV_STAFF_ROLES = {
    'adv1': 'ADV STAFF 1',
    'adv2': 'ADV STAFF 2',
    'adv3': 'ADV STAFF 3'
};

// Palavrões bloqueados
const badWords = ['vadia', 'puta', 'caralho', 'merda', 'bosta', 'desgraça', 'fuder', 'foder', 'filho da puta', 'arrombado', 'viado', 'corno', 'pau no cu', 'cuzão', 'porra', 'cacete', 'krl', 'pkrl', 'fdp'];

// Sistema de warns e avaliações
const warns = new Map();
const avaliacoes = new Map();

// Verificar se é staff
function isStaff(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
           member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

// Enviar log para canal específico
async function sendLog(guild, channelName, embed) {
    try {
        const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.log(`❌ Erro ao enviar log: ${error.message}`);
    }
}

// Criar embed de log
function createLogEmbed(title, description, color, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
    
    fields.forEach(field => {
        embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
    });
    
    return embed;
}

// Nota em barras (1 a 10)
function barraNota(nota) {
    const total = 20;
    const preenchidos = Math.round((nota / 10) * total);
    const vazios = total - preenchidos;
    return '▰'.repeat(preenchidos) + '▱'.repeat(vazios);
}

// Registrar comandos de barra
const commands = [
    { name: 'ban', description: 'Banir um membro', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'unban', description: 'Desbanir um membro', options: [{ name: 'id', description: 'ID do usuário', type: 3, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'banlist', description: 'Ver lista de membros banidos' },
    { name: 'mute', description: 'Mutar um membro', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'tempo', description: 'Minutos', type: 4, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'unmute', description: 'Desmutar um membro', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'warn', description: 'Advertir um membro', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'warns', description: 'Ver warns de um membro', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }] },
    { name: 'adv1', description: 'Dar cargo ADV STAFF 1', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'adv2', description: 'Dar cargo ADV STAFF 2', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'adv3', description: 'Dar cargo ADV STAFF 3', options: [{ name: 'usuario', description: 'Usuário', type: 6, required: true }, { name: 'motivo', description: 'Motivo', type: 3, required: true }] },
    { name: 'avaliar', description: 'Avaliar um staff (1 a 10)' },
    { name: 'media', description: 'Ver nota média de um staff', options: [{ name: 'staff', description: 'Staff', type: 6, required: true }] },
    { name: 'ranking', description: 'Ver ranking dos staffs' },
    { name: 'ajuda', description: 'Mostrar todos os comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('🔄 Registrando comandos de barra...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Comandos de barra registrados!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

// ========== BOT ONLINE E CRIAÇÃO DE CANAIS ==========
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot ${c.user.tag} está online!`);
    
    client.user.setPresence({
        activities: [{ name: 'Atlas RP | &ajuda | /ajuda', type: 0 }],
        status: 'online'
    });
    
    await registerCommands();
    
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.log('❌ Servidor não encontrado!');
        return;
    }
    
    // Criar categoria LOGS
    let logsCategory = guild.channels.cache.find(c => c.name === '📁 LOGS' && c.type === ChannelType.GuildCategory);
    if (!logsCategory) {
        logsCategory = await guild.channels.create({
            name: '📁 LOGS',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
        });
        console.log('✅ Categoria 📁 LOGS criada');
    }
    
    const canais = [
        { nome: '📋・punição-discord', desc: '📌 Logs de banimentos, muttes, warns e atribuições de cargo ADV Staff' },
        { nome: '🤖・logs-automod', desc: '🤖 Logs automáticos de palavrões, links de servidores e spam' },
        { nome: '📥・logs-membros', desc: '📥 Logs de entrada/saída de membros, calls de voz e mudanças de cargo' },
        { nome: '🏷️・logs-cargos', desc: '🏷️ Logs detalhados de atribuição e remoção de cargos' },
        { nome: '⚙️・logs-serve', desc: '⚙️ Logs de alterações no servidor (nome, ícone, boosts, canais)' },
        { nome: '✏️・logs-mensagem', desc: '✏️ Logs de mensagens editadas e deletadas' }
    ];
    
    for (const canal of canais) {
        const existe = guild.channels.cache.find(c => c.name === canal.nome);
        if (!existe) {
            await guild.channels.create({
                name: canal.nome,
                type: ChannelType.GuildText,
                parent: logsCategory.id,
                topic: canal.desc,
                permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
            });
            console.log(`✅ Canal criado: ${canal.nome}`);
        }
    }
    
    console.log('🟢 Bot pronto!');
});

// ========== LOGS DE MEMBROS ==========
client.on(Events.GuildMemberAdd, async (member) => {
    // Log no canal
    const embed = createLogEmbed('📥 MEMBRO ENTROU', `${member.user.tag} entrou no servidor`, 0x00FF00, [
        { name: '👤 Membro', value: `${member}`, inline: true },
        { name: '🆔 ID', value: member.id, inline: true },
        { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
    
    // DM de boas-vindas com regras
    const dmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📥 Bem-vindo ao Atlas RP!')
        .setDescription(`Olá ${member.user}, seja bem-vindo à nossa comunidade!`)
        .addFields(
            { name: '📌 LEIA AS REGRAS ANTES DE COMEÇAR:', value: '🔹 **Regras da Comunidade:**\nhttps://discord.com/channels/1493042257861939372/1497661394936660049\n\n🔹 **Regras In-Game:**\nhttps://discord.com/channels/1493042257861939372/1497661392864411779', inline: false },
            { name: '🚨 O não cumprimento das regras resultará em:', value: '⚠️ Advertências → 🔇 Mute → 🔨 Ban', inline: false },
            { name: '✅ Dicas:', value: '• Use os canais corretos\n• Respeite todos os membros e staff\n• Siga as orientações dos staffs', inline: false }
        )
        .setFooter({ text: 'Atenciosamente, Equipe Atlas RP' })
        .setTimestamp();
    
    await member.send({ embeds: [dmEmbed] }).catch(() => console.log(`❌ Não foi possível enviar DM para ${member.user.tag}`));
});

client.on(Events.GuildMemberRemove, async (member) => {
    const embed = createLogEmbed('📤 MEMBRO SAIU', `${member.user.tag} saiu do servidor`, 0xFF0000, [
        { name: '👤 Membro', value: member.user.tag, inline: true },
        { name: '🆔 ID', value: member.id, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
});

// ========== LOGS DE VOICE ==========
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    
    if (!oldState.channelId && newState.channelId) {
        const embed = createLogEmbed('🎤 ENTROU NA CALL', `${member.user.tag} entrou na call`, 0x00FF00, [
            { name: '👤 Membro', value: `${member}`, inline: true },
            { name: '🎤 Canal', value: `<#${newState.channelId}>`, inline: true }
        ]);
        await sendLog(member.guild, '📥・logs-membros', embed);
    }
    
    if (oldState.channelId && !newState.channelId) {
        const embed = createLogEmbed('🎤 SAIU DA CALL', `${member.user.tag} saiu da call`, 0xFF0000, [
            { name: '👤 Membro', value: member.user.tag, inline: true },
            { name: '🎤 Canal', value: `<#${oldState.channelId}>`, inline: true }
        ]);
        await sendLog(member.guild, '📥・logs-membros', embed);
    }
});

// ========== LOGS DE SERVIDOR (⚙️・logs-serve) ==========
client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
    const embed = new EmbedBuilder().setColor(0xFFA500).setTitle('⚙️ SERVIDOR ATUALIZADO').setTimestamp();
    
    if (oldGuild.name !== newGuild.name) {
        embed.setDescription(`**Nome alterado**\nAntigo: ${oldGuild.name}\nNovo: ${newGuild.name}`);
        await sendLog(newGuild, '⚙️・logs-serve', embed);
    }
    
    if (oldGuild.icon !== newGuild.icon) {
        embed.setDescription(`**Ícone alterado**\nNovo ícone foi adicionado/alterado`);
        await sendLog(newGuild, '⚙️・logs-serve', embed);
    }
});

client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;
    const embed = createLogEmbed('📁 CANAL CRIADO', `Canal criado: ${channel.name}`, 0x00FF00, [
        { name: '📌 Canal', value: `${channel}`, inline: true },
        { name: '📂 Tipo', value: channel.type === ChannelType.GuildText ? 'Texto' : 'Voz', inline: true }
    ]);
    await sendLog(channel.guild, '⚙️・logs-serve', embed);
});

client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;
    const embed = createLogEmbed('🗑️ CANAL DELETADO', `Canal deletado: ${channel.name}`, 0xFF0000, [
        { name: '📌 Nome', value: channel.name, inline: true }
    ]);
    await sendLog(channel.guild, '⚙️・logs-serve', embed);
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!oldChannel.guild) return;
    if (oldChannel.name !== newChannel.name) {
        const embed = createLogEmbed('🔧 CANAL EDITADO', `Canal renomeado`, 0xFFA500, [
            { name: '📌 Antigo', value: oldChannel.name, inline: true },
            { name: '📌 Novo', value: newChannel.name, inline: true }
        ]);
        await sendLog(newChannel.guild, '⚙️・logs-serve', embed);
    }
});

// ========== LOGS DE CARGOS ==========
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    
    addedRoles.forEach(async (role) => {
        if (!role.name.includes('ADV STAFF')) {
            const embed = createLogEmbed('🏷️ CARGO ADICIONADO', `${newMember.user.tag} recebeu um cargo`, 0x00FF00, [
                { name: '👤 Membro', value: `${newMember}`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true }
            ]);
            await sendLog(newMember.guild, '🏷️・logs-cargos', embed);
        }
    });
});

// ========== LOGS DE MENSAGENS ==========
client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    const embed = createLogEmbed('🗑️ MENSAGEM DELETADA', `Mensagem de ${message.author?.tag} foi deletada`, 0xFF0000, [
        { name: '👤 Autor', value: message.author?.tag || 'Desconhecido', inline: true },
        { name: '📝 Conteúdo', value: message.content?.substring(0, 100) || 'Sem conteúdo', inline: false },
        { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true }
    ]);
    await sendLog(message.guild, '✏️・logs-mensagem', embed);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const embed = createLogEmbed('✏️ MENSAGEM EDITADA', `Mensagem editada por ${oldMessage.author?.tag}`, 0xFFA500, [
        { name: '👤 Autor', value: oldMessage.author?.tag || 'Desconhecido', inline: true },
        { name: '📍 Canal', value: `<#${oldMessage.channelId}>`, inline: true },
        { name: '📝 Antes', value: oldMessage.content?.substring(0, 100) || 'Sem conteúdo', inline: false },
        { name: '📝 Depois', value: newMessage.content?.substring(0, 100) || 'Sem conteúdo', inline: false }
    ]);
    await sendLog(oldMessage.guild, '✏️・logs-mensagem', embed);
});

// ========== AUTOMOD ==========
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    let bloqueado = false;
    let motivo = '';
    
    for (const word of badWords) {
        if (content.includes(word)) {
            bloqueado = true;
            motivo = `Palavrão detectado: \`${word}\``;
            break;
        }
    }
    
    if (content.includes('discord.gg/') || content.includes('discord.com/invite/')) {
        bloqueado = true;
        motivo = 'Link de servidor Discord detectado';
    }
    
    if (bloqueado) {
        await message.delete();
        const embed = createLogEmbed('⚠️ AUTOMOD - MENSAGEM BLOQUEADA', `${message.author.tag} teve mensagem bloqueada`, 0xFF0000, [
            { name: '👤 Membro', value: `${message.author}`, inline: true },
            { name: '🚫 Motivo', value: motivo, inline: true },
            { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true },
            { name: '📝 Conteúdo', value: `\`\`\`${message.content.substring(0, 150)}\`\`\``, inline: false }
        ]);
        await sendLog(message.guild, '🤖・logs-automod', embed);
        await message.author.send(`⚠️ Sua mensagem foi bloqueada no servidor ${message.guild.name}\nMotivo: ${motivo}`).catch(() => {});
    }
});

// ========== COMANDOS DE PREFIXO (&) ==========
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member = message.member;
    
    if (!isStaff(member)) return message.reply('❌ Você não tem permissão!');
    
    // BAN
    if (command === 'ban') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.join(' ') || 'Sem motivo';
        try {
            await message.guild.members.ban(user.id, { reason });
            const embed = createLogEmbed('🔨 BANIMENTO', `${user.tag} foi banido`, 0xFF0000, [
                { name: '👤 Usuário', value: `${user}`, inline: true },
                { name: '🛡️ Moderador', value: `${message.author}`, inline: true },
                { name: '📝 Motivo', value: reason, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ ${user.tag} foi banido!`);
        } catch { message.reply('❌ Erro ao banir!'); }
    }
    
    // BANLIST
    else if (command === 'banlist') {
        try {
            const bans = await message.guild.bans.fetch();
            if (bans.size === 0) return message.reply('📋 Não há membros banidos.');
            const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
            const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 LISTA DE BANIDOS').setDescription(lista.substring(0, 4000));
            message.reply({ embeds: [embed] });
        } catch { message.reply('❌ Erro ao buscar lista!'); }
    }
    
    // MUTE
    else if (command === 'mute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const time = parseInt(args[1]);
        if (isNaN(time)) return message.reply('❌ Informe minutos! Ex: &mute @user 10 motivo');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        try {
            const target = await message.guild.members.fetch(user.id);
            await target.timeout(time * 60 * 1000, reason);
            const embed = createLogEmbed('🔇 MUTE', `${user.tag} foi mutado`, 0xFFA500, [
                { name: '👤 Usuário', value: `${user}`, inline: true },
                { name: '🛡️ Moderador', value: `${message.author}`, inline: true },
                { name: '⏱️ Tempo', value: `${time} minutos`, inline: true },
                { name: '📝 Motivo', value: reason, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ ${user.tag} mutado por ${time} minutos!`);
        } catch { message.reply('❌ Erro ao mutar!'); }
    }
    
    // UNMUTE
    else if (command === 'unmute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            const target = await message.guild.members.fetch(user.id);
            await target.timeout(null);
            const embed = createLogEmbed('🔊 DESMUTE', `${user.tag} foi desmutado`, 0x00FF00, [
                { name: '👤 Usuário', value: `${user}`, inline: true },
                { name: '🛡️ Moderador', value: `${message.author}`, inline: true },
                { name: '📝 Motivo', value: motivo, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ ${user.tag} foi desmutado!`);
        } catch { message.reply('❌ Erro ao desmutar!'); }
    }
    
    // WARN
    else if (command === 'warn') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: message.author.tag, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', `${user.tag} recebeu um warn`, 0xFFA500, [
            { name: '👤 Usuário', value: `${user}`, inline: true },
            { name: '🛡️ Moderador', value: `${message.author}`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true },
            { name: '📊 Total', value: `${warns.get(user.id).length}`, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} recebeu warn! Total: ${warns.get(user.id).length}`);
    }
    
    // WARNS
    else if (command === 'warns') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const userWarns = warns.get(user.id);
        if (!userWarns || userWarns.length === 0) return message.reply(`📋 ${user.tag} não possui warns.`);
        const lista = userWarns.map((w, i) => `**${i+1}** - ${w.reason} (por ${w.moderator})`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS DE ${user.tag}`).setDescription(lista);
        message.reply({ embeds: [embed] });
    }
    
    // ADV
    else if (command === 'adv1' || command === 'adv2' || command === 'adv3') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const roleName = ADV_STAFF_ROLES[command];
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return message.reply(`❌ Cargo "${roleName}" não existe!`);
        try {
            const target = await message.guild.members.fetch(user.id);
            await target.roles.add(role);
            const embed = createLogEmbed('🏷️ ADV STAFF', `${user.tag} recebeu ${roleName}`, 0x00FF00, [
                { name: '👤 Usuário', value: `${user}`, inline: true },
                { name: '🏷️ Cargo', value: roleName, inline: true },
                { name: '🛡️ Atribuído por', value: `${message.author}`, inline: true },
                { name: '📝 Comando usado', value: command, inline: true },
                { name: '📌 Motivo', value: motivo, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ ${user.tag} recebeu ${roleName}!`);
        } catch { message.reply('❌ Erro ao dar o cargo!'); }
    }
    
    // AVALIAR (modal)
    else if (command === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        const staffInput = new TextInputBuilder().setCustomId('staff').setLabel('👨‍✈️ Qual staff você quer avaliar?').setStyle(TextInputStyle.Short).setRequired(true);
        const notaInput = new TextInputBuilder().setCustomId('nota').setLabel('⭐ Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true);
        const motivoInput = new TextInputBuilder().setCustomId('motivo').setLabel('📝 Feedback / Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(staffInput), new ActionRowBuilder().addComponents(notaInput), new ActionRowBuilder().addComponents(motivoInput));
        await message.showModal(modal);
    }
    
    // AJUDA
    else if (command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: **${PREFIX}** | Slash: **/**`)
            .addFields(
                { name: '🔨 Moderação', value: '`ban`, `unban`, `banlist`, `mute`, `unmute`, `warn`, `warns`', inline: false },
                { name: '🏷️ ADV Staff', value: '`adv1`, `adv2`, `adv3` (requer motivo)', inline: false },
                { name: '⭐ Avaliações', value: '`avaliar`, `media`, `ranking`', inline: false }
            )
            .setFooter({ text: 'Apenas staff pode usar comandos de moderação' });
        message.reply({ embeds: [embed] });
    }
});

// ========== MODAL DE AVALIAÇÃO ==========
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'avaliarModal') {
        const staffNome = interaction.fields.getTextInputValue('staff');
        const nota = parseInt(interaction.fields.getTextInputValue('nota'));
        const motivo = interaction.fields.getTextInputValue('motivo');
        
        if (isNaN(nota) || nota < 1 || nota > 10) {
            return interaction.reply({ content: '❌ Nota inválida! Use um número de 1 a 10.', ephemeral: true });
        }
        
        const staffMencao = staffNome.replace(/[^0-9]/g, '');
        let staffUser = null;
        if (staffMencao) {
            try { staffUser = await interaction.guild.members.fetch(staffMencao); } catch(e) {}
        }
        
        const canalAvaliacoes = interaction.guild.channels.cache.find(c => c.name === 'avaliações staffs');
        if (!canalAvaliacoes) return interaction.reply({ content: '❌ Canal #avaliações-staffs não encontrado!', ephemeral: true });
        
        // Salvar avaliação
        if (!avaliacoes.has(staffMencao)) avaliacoes.set(staffMencao, []);
        avaliacoes.get(staffMencao).push({ nota, motivo, avaliador: interaction.user.tag, data: new Date() });
        
        // Calcular média
        const avaliacoesStaff = avaliacoes.get(staffMencao);
        const media = avaliacoesStaff.reduce((a,b) => a + b.nota, 0) / avaliacoesStaff.length;
        
        const embed = new EmbedBuilder()
            .setColor(nota >= 7 ? 0x00FF00 : nota >= 4 ? 0xFFA500 : 0xFF0000)
            .setTitle('⭐ NOVA AVALIAÇÃO DE STAFF')
            .setDescription(`${staffUser ? staffUser : staffNome} foi avaliado!`)
            .addFields(
                { name: '👨‍✈️ Staff', value: staffUser ? `${staffUser}` : staffNome, inline: true },
                { name: '👤 Avaliado por', value: interaction.user.tag, inline: true },
                { name: '⭐ Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: '📝 Feedback', value: motivo, inline: false },
                { name: '📊 Média atual', value: `${media.toFixed(1)}/10`, inline: true }
            )
            .setTimestamp();
        
        await canalAvaliacoes.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Avaliação enviada com sucesso!', ephemeral: true });
    }
});

// ========== SLASH COMMANDS ==========
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
    
    const cmd = interaction.commandName;
    
    if (cmd === 'ban') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.ban(user.id, { reason: motivo });
        const embed = createLogEmbed('🔨 BAN', `${user.tag} banido`, 0xFF0000, [
            { name: '👤 Usuário', value: `${user}`, inline: true },
            { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ ${user.tag} banido!`, ephemeral: true });
    }
    
    else if (cmd === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000));
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (cmd === 'mute') {
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60
