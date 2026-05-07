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

const ADV_STAFF_ROLES = {
    'adv1': 'ADV STAFF 1',
    'adv2': 'ADV STAFF 2',
    'adv3': 'ADV STAFF 3'
};

const badWords = ['vadia', 'puta', 'caralho', 'merda', 'bosta', 'desgraça', 'fuder', 'foder', 'filho da puta', 'arrombado', 'viado', 'corno', 'pau no cu', 'cuzão', 'porra', 'cacete', 'krl', 'pkrl', 'fdp'];

const warns = new Map();
const avaliacoes = new Map();

function getCargoLevel(member) {
    if (member.roles.cache.some(r => r.name === 'Líder Administrativo')) return 4;
    if (member.roles.cache.some(r => r.name === 'Coordenador(a)')) return 3;
    if (member.roles.cache.some(r => r.name === 'Supervisor(a)')) return 2;
    if (member.roles.cache.some(r => r.name === 'Administrador(a)')) return 1;
    return 0;
}

function podeBan(member) { return getCargoLevel(member) >= 4; }
function podeUnban(member) { return getCargoLevel(member) >= 4; }
function podeMute(member) { return getCargoLevel(member) >= 1; }
function podeWarn(member) { return getCargoLevel(member) >= 1; }
function podeAdv1(member) { return getCargoLevel(member) >= 2; }
function podeAdv2(member) { return getCargoLevel(member) >= 3; }
function podeAdv3(member) { return getCargoLevel(member) >= 4; }

async function sendLog(guild, channelName, embed) {
    try {
        const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
        if (channel) await channel.send({ embeds: [embed] });
    } catch (error) {}
}

function createLogEmbed(title, color, fields = []) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
    fields.forEach(f => embed.addFields({ name: f.name, value: f.value, inline: f.inline || false }));
    return embed;
}

function barraNota(nota) {
    const total = 20;
    const preenchidos = Math.round((nota / 10) * total);
    return '▰'.repeat(preenchidos) + '▱'.repeat(total - preenchidos);
}

// Comandos slash
const commands = [
    { name: 'ban', description: 'Banir um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'unban', description: 'Desbanir um membro', options: [{ name: 'id', type: 3, required: true, description: 'ID do usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'banlist', description: 'Ver lista de banidos' },
    { name: 'mute', description: 'Mutar um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'tempo', type: 4, required: true, description: 'Minutos' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'unmute', description: 'Desmutar um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'warn', description: 'Advertir um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'warns', description: 'Ver warns de um membro', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }] },
    { name: 'adv1', description: 'ADV STAFF 1', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'adv2', description: 'ADV STAFF 2', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'adv3', description: 'ADV STAFF 3', options: [{ name: 'usuario', type: 6, required: true, description: 'Usuário' }, { name: 'motivo', type: 3, required: true, description: 'Motivo' }] },
    { name: 'avaliar', description: 'Avaliar um staff (1 a 10) - Todos' },
    { name: 'media', description: 'Média de um staff - Todos', options: [{ name: 'staff', type: 6, required: true, description: 'Staff' }] },
    { name: 'ranking', description: 'Ranking dos staffs - Todos' },
    { name: 'ajuda', description: 'Mostrar comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('📌 Registrando comandos slash...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Comandos registrados!');
    } catch (error) { console.error('❌ Erro:', error); }
}

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot ${c.user.tag} online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
    await registerCommands();
    console.log('🟢 Bot pronto!');
});

// DM de boas-vindas
client.on(Events.GuildMemberAdd, async (member) => {
    const embed = createLogEmbed('📥 MEMBRO ENTROU', 0x00FF00, [
        { name: '👤 Membro', value: `${member.user.tag}`, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
    
    const dmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📥 Bem-vindo ao Atlas RP!')
        .setDescription(`Olá ${member.user}, seja bem-vindo!\n\n📌 **Regras:**\nhttps://discord.com/channels/1493042257861939372/1497661394936660049\nhttps://discord.com/channels/1493042257861939372/1497661392864411779`);
    await member.send({ embeds: [dmEmbed] }).catch(() => {});
});

client.on(Events.GuildMemberRemove, async (member) => {
    const embed = createLogEmbed('📤 MEMBRO SAIU', 0xFF0000, [
        { name: '👤 Membro', value: member.user.tag, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
});

// AUTOMOD
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    let bloqueado = false;
    let motivo = '';
    
    for (const word of badWords) {
        if (content.includes(word)) { bloqueado = true; motivo = `Palavrão: ${word}`; break; }
    }
    if (content.includes('discord.gg/') || content.includes('discord.com/invite/')) {
        bloqueado = true;
        motivo = 'Link de servidor Discord';
    }
    
    if (bloqueado) {
        await message.delete();
        const embed = createLogEmbed('⚠️ AUTOMOD', 0xFF0000, [
            { name: '👤 Membro', value: message.author.tag, inline: true },
            { name: '🚫 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '🤖・logs-automod', embed);
    }
});

// ========== COMANDOS DE PREFIXO (&) ==========
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member = message.member;
    const executor = message.author.tag;
    
    // Comandos para TODOS
    if (command === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await message.showModal(modal);
        return;
    }
    
    if (command === 'media') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um staff!');
        const avs = avaliacoes.get(user.id);
        if (!avs || avs.length === 0) return message.reply(`📋 ${user.tag} não tem avaliações.`);
        const media = avs.reduce((a, b) => a + b.nota, 0) / avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length} avaliações`);
        message.reply({ embeds: [embed] });
        return;
    }
    
    if (command === 'ranking') {
        const ranking = Array.from(avaliacoes.entries()).map(([id, avs]) => ({ id, media: avs.reduce((a, b) => a + b.nota, 0) / avs.length, total: avs.length })).sort((a, b) => b.media - a.media).slice(0, 10);
        if (ranking.length === 0) return message.reply('📋 Nenhuma avaliação.');
        let desc = '';
        for (let i = 0; i < ranking.length; i++) {
            let m = await message.guild.members.fetch(ranking[i].id).catch(() => null);
            desc += `**${i+1}.** ${m ? m.user.tag : ranking[i].id} - ${ranking[i].media.toFixed(1)}/10 (${ranking[i].total} avs)\n`;
        }
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc)] });
        return;
    }
    
    // ========== COMANDOS RESTRITOS (verificação de permissão) ==========
    
    // BAN (Líder Administrativo apenas)
    if (command === 'ban') {
        if (!podeBan(member)) return message.reply('❌ Apenas Líder Administrativo pode banir!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        const embed = createLogEmbed('🔨 BANIMENTO', 0xFF0000, [
            { name: '👤 Usuário banido', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: reason, inline: true },
            { name: '🕐 Data', value: new Date().toLocaleString('pt-BR'), inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} foi banido por ${executor}!`);
        return;
    }
    
    // UNBAN (Líder Administrativo apenas)
    if (command === 'unban') {
        if (!podeUnban(member)) return message.reply('❌ Apenas Líder Administrativo pode desbanir!');
        const id = args[0];
        if (!id) return message.reply('❌ Informe o ID!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await message.guild.members.unban(id);
            const embed = createLogEmbed('✅ DESBANIMENTO', 0x00FF00, [
                { name: '🆔 Usuário desbanido', value: id, inline: false },
                { name: '🛡️ Responsável', value: executor, inline: true },
                { name: '📝 Motivo', value: motivo, inline: true }
            ]);
            await sendLog(message.guild, '📋・punição-discord', embed);
            message.reply(`✅ Usuário ${id} desbanido por ${executor}!`);
        } catch { message.reply('❌ ID inválido!'); }
        return;
    }
    
    // BANLIST
    if (command === 'banlist') {
        if (!podeBan(member)) return message.reply('❌ Sem permissão!');
        const bans = await message.guild.bans.fetch();
        if (bans.size === 0) return message.reply('📋 Nenhum banido.');
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000))] });
        return;
    }
    
    // MUTE (Administrador+)
    if (command === 'mute') {
        if (!podeMute(member)) return message.reply('❌ Você não tem permissão para mutar!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const time = parseInt(args[1]);
        if (isNaN(time)) return message.reply('❌ Informe minutos!');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(time * 60 * 1000, reason);
        const embed = createLogEmbed('🔇 MUTE', 0xFFA500, [
            { name: '👤 Usuário mutado', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '⏱️ Tempo', value: `${time} minutos`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} mutado por ${time} min por ${executor}!`);
        return;
    }
    
    // UNMUTE (Administrador+)
    if (command === 'unmute') {
        if (!podeMute(member)) return message.reply('❌ Sem permissão!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 DESMUTE', 0x00FF00, [
            { name: '👤 Usuário desmutado', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} desmutado por ${executor}!`);
        return;
    }
    
    // WARN (Administrador+)
    if (command === 'warn') {
        if (!podeWarn(member)) return message.reply('❌ Sem permissão!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: executor, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', 0xFFA500, [
            { name: '👤 Usuário advertido', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: reason, inline: true },
            { name: '📊 Total warns', value: `${warns.get(user.id).length}`, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ Warn aplicado em ${user.tag} por ${executor}! Total: ${warns.get(user.id).length}`);
        return;
    }
    
    // WARNS
    if (command === 'warns') {
        if (!podeWarn(member)) return message.reply('❌ Sem permissão!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const userWarns = warns.get(user.id);
        if (!userWarns || userWarns.length === 0) return message.reply(`📋 ${user.tag} não tem warns.`);
        const lista = userWarns.map((w, i) => `${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        message.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(lista)] });
        return;
    }
    
    // ADV1 (Supervisor+)
    if (command === 'adv1') {
        if (!podeAdv1(member)) return message.reply('❌ Apenas Supervisor+ pode dar ADV1!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 1');
        if (!role) return message.reply('❌ Cargo ADV STAFF 1 não existe!');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        const embed = createLogEmbed('🏷️ ADV STAFF 1', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ADV STAFF 1 dado a ${user.tag} por ${executor}!`);
        return;
    }
    
    // ADV2 (Coordenador+)
    if (command === 'adv2') {
        if (!podeAdv2(member)) return message.reply('❌ Apenas Coordenador+ pode dar ADV2!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 2');
        if (!role) return message.reply('❌ Cargo ADV STAFF 2 não existe!');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        const embed = createLogEmbed('🏷️ ADV STAFF 2', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ADV STAFF 2 dado a ${user.tag} por ${executor}!`);
        return;
    }
    
    // ADV3 (Líder Administrativo apenas)
    if (command === 'adv3') {
        if (!podeAdv3(member)) return message.reply('❌ Apenas Líder Administrativo pode dar ADV3!');
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 3');
        if (!role) return message.reply('❌ Cargo ADV STAFF 3 não existe!');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        const embed = createLogEmbed('🏷️ ADV STAFF 3', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ADV STAFF 3 dado a ${user.tag} por ${executor}!`);
        return;
    }
    
    // AJUDA
    if (command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: ${PREFIX} | Slash: /`)
            .addFields(
                { name: '👑 Líder Administrativo', value: '`ban`, `unban`, `adv3`', inline: false },
                { name: '⭐ Coordenador(a)', value: '`adv2`, `mute`, `unmute`, `warn`', inline: false },
                { name: '🛡️ Supervisor(a)', value: '`adv1`, `mute`, `unmute`, `warn`', inline: false },
                { name: '🔧 Administrador(a)', value: '`mute`, `unmute`, `warn`', inline: false },
                { name: '⭐ Todos', value: '`avaliar`, `media`, `ranking`', inline: false }
            );
        message.reply({ embeds: [embed] });
        return;
    }
});

// MODAL DE AVALIAÇÃO
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'avaliarModal') {
        const staffNome = interaction.fields.getTextInputValue('staff');
        const nota = parseInt(interaction.fields.getTextInputValue('nota'));
        const motivo = interaction.fields.getTextInputValue('motivo');
        
        if (isNaN(nota) || nota < 1 || nota > 10) return interaction.reply({ content: '❌ Nota inválida! Use 1 a 10.', ephemeral: true });
        
        const canal = interaction.guild.channels.cache.find(c => c.name === 'avaliações-staffs');
        if (!canal) return interaction.reply({ content: '❌ Canal #avaliações-staffs não encontrado!', ephemeral: true });
        
        const staffId = staffNome.match(/\d+/g);
        let staffUser = null;
        if (staffId) try { staffUser = await interaction.guild.members.fetch(staffId[0]); } catch(e) {}
        
        const key = staffId ? staffId[0] : staffNome;
        if (!avaliacoes.has(key)) avaliacoes.set(key, []);
        avaliacoes.get(key).push({ nota, motivo, avaliador: interaction.user.tag, data: new Date() });
        
        const media = avaliacoes.get(key).reduce((a, b) => a + b.nota, 0) / avaliacoes.get(key).length;
        
        const embed = new EmbedBuilder()
            .setColor(nota >= 7 ? 0x00FF00 : nota >= 4 ? 0xFFA500 : 0xFF0000)
            .setTitle('⭐ NOVA AVALIAÇÃO')
            .addFields(
                { name: '👨‍✈️ Staff', value: staffUser ? `${staffUser}` : staffNome, inline: true },
                { name: '👤 Avaliador', value: interaction.user.tag, inline: true },
                { name: '⭐ Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: '📝 Feedback', value: motivo, inline: false },
                { name: '📊 Média', value: `${media.toFixed(1)}/10`, inline: true }
            ).setTimestamp();
        
        await canal.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Avaliação enviada!', ephemeral: true });
    }
});

// SLASH COMMANDS
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const cmd = interaction.commandName;
    const executor = interaction.user.tag;
    
    // Comandos para TODOS
    if (cmd === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
    }
    
    if (cmd === 'media') {
        const staff = interaction.options.getMember('staff');
        const avs = avaliacoes.get(staff.id);
        if (!avs || avs.length === 0) return interaction.reply({ content: `📋 ${staff} não tem avaliações.`, ephemeral: true });
        const media = avs.reduce((a, b) => a + b.nota, 0) / avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length} avaliações`);
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }
    
    if (cmd === 'ranking') {
        const ranking = Array.from(avaliacoes.entries()).map(([id, avs]) => ({ id, media: avs.reduce((a, b) => a + b.nota, 0) / avs.length, total: avs.length })).sort((a, b) => b.media - a.media).slice(0, 10);
        if (ranking.length === 0) return interaction.reply({ content: '📋 Nenhuma avaliação.', ephemeral: true });
        let desc = '';
        for (let i = 0; i < ranking.length; i++) {
            let m = await interaction.guild.members.fetch(ranking[i].id).catch(() => null);
            desc += `**${i+1}.** ${m ? m.user.tag : ranking[i].id} - ${ranking[i].media.toFixed(1)}/10 (${ranking[i].total} avs)\n`;
        }
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc)], ephemeral: true });
        return;
    }
    
    // Comandos restritos - verificação de permissão por cargo
    const member = interaction.member;
    
    if (cmd === 'ban') {
        if (!podeBan(member)) return interaction.reply({ content: '❌ Apenas Líder Administrativo pode banir!', ephemeral: true });
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.ban(user.id, { reason: motivo });
        const embed = createLogEmbed('🔨 BANIMENTO', 0xFF0000, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ ${user.tag} banido por ${executor}!`, ephemeral: true });
        return;
    }
    
    if (cmd === 'unban') {
        if (!podeUnban(member)) return interaction.reply({ content: '❌ Apenas Líder Administrativo pode desbanir!', ephemeral: true });
        const id = interaction.options.getString('id');
        const motivo = interaction.options.getString('motivo');
        try {
            await interaction.guild.members.unban(id);
            const embed = createLogEmbed('✅ DESBANIMENTO', 0x00FF00, [
                { name: '🆔 Usuário', value: id, inline: false },
                { name: '🛡️ Responsável', value: executor, inline: true },
                { name: '📝 Motivo', value: motivo, inline: true }
            ]);
            await sendLog(interaction.guild, '📋・punição-discord', embed);
            interaction.reply({ content: `✅ Usuário ${id} desbanido por ${executor}!`, ephemeral: true });
        } catch { interaction.reply({ content: '❌ ID inválido!', ephemeral: true }); }
        return;
    }
    
    if (cmd === 'banlist') {
        if (!podeBan(member)) return interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000))], ephemeral: true });
        return;
    }
    
    if (cmd === 'mute') {
        if (!podeMute(member)) return interaction.reply({ content: '❌ Você não tem permissão!', ephemeral: true });
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        const embed = createLogEmbed('🔇 MUTE', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: false },
            { name: '🛡️ Responsável', value: executor, inline
