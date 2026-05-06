const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, ChannelType, REST, Routes } = require('discord.js');
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

// Sistema de warns
const warns = new Map();

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
        } else {
            console.log(`⚠️ Canal ${channelName} não encontrado!`);
        }
    } catch (error) {
        console.log(`❌ Erro ao enviar log para ${channelName}: ${error.message}`);
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

// REGISTRAR COMANDOS DE BARRA
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
    
    console.log(`📌 Prefixo: ${PREFIX}`);
    
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
        { nome: '⚙️・logs-serve', desc: '⚙️ Logs de alterações no servidor (nome, ícone, boosts)' },
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
            console.log(`✅ Canal criado: ${canal.nome} - ${canal.desc}`);
        }
    }
    
    console.log('🟢 Bot pronto!');
});

// ========== LOGS DE MEMBROS ==========
client.on(Events.GuildMemberAdd, async (member) => {
    const embed = createLogEmbed('📥 MEMBRO ENTROU', `${member.user.tag} entrou no servidor`, 0x00FF00, [
        { name: '👤 Membro', value: `${member}`, inline: true },
        { name: '🆔 ID', value: member.id, inline: true },
        { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
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

// ========== LOGS DE CARGOS (com comando usado) ==========
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    
    addedRoles.forEach(async (role) => {
        const embed = createLogEmbed('🏷️ CARGO ADICIONADO', `${newMember.user.tag} recebeu um cargo`, 0x00FF00, [
            { name: '👤 Membro', value: `${newMember}`, inline: true },
            { name: '🏷️ Cargo', value: role.name, inline: true },
            { name: '📌 Comando usado', value: 'Desconhecido (atribuído manualmente)', inline: false }
        ]);
        await sendLog(newMember.guild, '🏷️・logs-cargos', embed);
        
        if (role.name.includes('ADV STAFF')) {
            const embedAdv = createLogEmbed('🏷️ ADV STAFF', `${newMember.user.tag} recebeu ${role.name}`, 0x00FF00, [
                { name: '👤 Membro', value: `${newMember}`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true }
            ]);
            await sendLog(newMember.guild, '📋・punição-discord', embedAdv);
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

// ========== AUTOMOD (com canal mencionado) ==========
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
        
        const embed = createLogEmbed('⚠️ AUTOMOD - MENSAGEM BLOQUEADA', `${message.author.tag} teve uma mensagem bloqueada`, 0xFF0000, [
            { name: '👤 Membro', value: `${message.author}`, inline: true },
            { name: '🚫 Motivo', value: motivo, inline: true },
            { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true },
            { name: '📝 Conteúdo bloqueado', value: `\`\`\`${message.content.substring(0, 150)}\`\`\``, inline: false }
        ]);
        await sendLog(message.guild, '🤖・logs-automod', embed);
        
        const warnEmbed = createLogEmbed('⚠️ MENSAGEM BLOQUEADA', `Sua mensagem foi bloqueada no servidor ${message.guild.name}`, 0xFF0000, [
            { name: '🚫 Motivo', value: motivo, inline: true },
            { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true }
        ]);
        await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
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
            if (bans.size === 0) return message.reply('📋 Não há membros banidos neste servidor.');
            
            const lista = bans.map(ban => `🔨 ${ban.user.tag} (ID: ${ban.user.id}) - Motivo: ${ban.reason || 'Não informado'}`).join('\n');
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('📋 LISTA DE BANIDOS')
                .setDescription(lista.substring(0, 4000))
                .setTimestamp();
            message.reply({ embeds: [embed] });
        } catch { message.reply('❌ Erro ao buscar lista de banidos!'); }
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
            { name: '📊 Total de warns', value: `${warns.get(user.id).length}`, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} recebeu warn! Total: ${warns.get(user.id).length}`);
    }
    
    // WARNS (ver lista de warns)
    else if (command === 'warns') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        
        const userWarns = warns.get(user.id);
        if (!userWarns || userWarns.length === 0) return message.reply(`📋 ${user.tag} não possui warns.`);
        
        const lista = userWarns.map((w, i) => `**${i + 1}** - ${w.reason} (por ${w.moderator} em ${new Date(w.date).toLocaleString('pt-BR')})`).join('\n');
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle(`📋 WARNS DE ${user.tag}`)
            .setDescription(lista)
            .setFooter({ text: `Total: ${userWarns.length} warns` })
            .setTimestamp();
        message.reply({ embeds: [embed] });
    }
    
    // ADV (com motivo)
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
                { name: '📝 Motivo', value: motivo, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ ${user.tag} recebeu ${roleName}! Motivo: ${motivo}`);
        } catch { message.reply('❌ Erro ao dar o cargo!'); }
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
                { name: '📁 Comandos Slash', value: 'Digite `/` no chat para ver todos os comandos', inline: false }
            )
            .setFooter({ text: 'Apenas staff pode usar comandos de moderação' });
        message.reply({ embeds: [embed] });
    }
});

// ========== SLASH COMMANDS ==========
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
    
    const cmd = interaction.commandName;
    
    // BAN
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
    
    // UNBAN
    else if (cmd === 'unban') {
        const id = interaction.options.getString('id');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.unban(id);
        const embed = createLogEmbed('✅ DESBAN', `Usuário ${id} desbanido`, 0x00FF00, [
            { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ Usuário desbanido!`, ephemeral: true });
    }
    
    // BANLIST
    else if (cmd === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000));
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // MUTE
    else if (cmd === 'mute') {
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        const embed = createLogEmbed('🔇 MUTE', `${user.tag} mutado`, 0xFFA500, [
            { name: '⏱️ Tempo', value: `${tempo} min`, inline: true },
            { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ Mutado por ${tempo} min!`, ephemeral: true });
    }
    
    // UNMUTE
    else if (cmd === 'unmute') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 DESMUTE', `${user.tag} desmutado`, 0x00FF00, [
            { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ Desmutado!`, ephemeral: true });
    }
    
    // WARN
    else if (cmd === 'warn') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason: motivo, moderator: interaction.user.tag, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', `${user.tag} advertido`, 0xFFA500, [
            { name: '📝 Motivo', value: motivo, inline: true },
            { name: '📊 Total', value: `${warns.get(user.id).length}`, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ Warn aplicado! Total: ${warns.get(user.id).length}`, ephemeral: true });
    }
    
    // WARNS
    else if (cmd === 'warns') {
        const user = interaction.options.getUser('usuario');
        const userWarns = warns.get(user.id);
        if (!userWarns || userWarns.length === 0) return interaction.reply({ content: `📋 ${user.tag} não tem warns.`, ephemeral: true });
        const lista = userWarns.map((w, i) => `${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(lista);
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // ADV (com motivo)
    else if (cmd === 'adv1' || cmd === 'adv2' || cmd === 'adv3') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        const roleName = ADV_STAFF_ROLES[cmd];
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.reply({ content: `❌ Cargo ${roleName} não existe!`, ephemeral: true });
        const target = await interaction.guild.members.fetch(user.id);
        await target.roles.add(role);
        const embed = createLogEmbed('🏷️ ADV', `${user.tag} recebeu ${roleName}`, 0x00FF00, [
            { name: '🛡️ Staff', value: `${interaction.user}`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ ${roleName} dado!`, ephemeral: true });
    }
    
    // AJUDA
    else if (cmd === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Comandos Atlas RP')
            .setDescription('**Moderação:** `/ban`, `/unban`, `/banlist`, `/mute`, `/unmute`, `/warn`, `/warns`\n**ADV Staff:** `/adv1`, `/adv2`, `/adv3`\n**Prefixo `&`:** Mesmos comandos');
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);