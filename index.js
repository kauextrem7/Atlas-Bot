const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, AuditLogEvent, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
require('dotenv').config();
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Atlas RP está online'));
app.listen(port, () => console.log(`✅ Web server na porta ${port}`));

// ==================== CANAIS ====================
const CANAL_MEMBROS = '📥・logs-membros';
const CANAL_AUTOMOD = '🤖・logs-automod';
const CANAL_PUNICOES = '📋・punição-discord';
const CANAL_CARGOS = '🏷️・logs-cargos';
const CANAL_SERVIDOR = '⚙️・logs-serve';
const CANAL_MENSAGENS = '✏️・logs-mensagem';
const CANAL_AVALIACOES = '🌟・avaliação-staff';
const CANAL_PROMOVIDO = '📗・relatorio-promovido';
const CANAL_REBAIXADO = '📗・relatorio-rebaixado';
const CANAL_DEMITIDO = '📗・relatorio-demitido';
const CANAL_ADVERTENCIA = '📗・relatorio-advertencia';
const CANAL_APELIDOS = '📝・logs-apelidos';
const CANAL_REACOES = '⭐・logs-reacoes';
const CANAL_WEBHOOKS = '🔗・logs-webhooks';
const CANAL_BOOSTS = '💪・logs-boosts';
const CANAL_MODLOG = '📜・acervo-mod-logs';
const CANAL_BOAS_VINDAS = '📌・boas-vindas';
const CANAL_SAIDA = '🚪・saida';

const LISTA_CANAIS_LOG = [
    { nome: CANAL_MEMBROS, desc: '📥 Entrada/saída, voz e apelidos' },
    { nome: CANAL_AUTOMOD, desc: '🤖 Automod e ações de moderação (clear, lock, etc.)' },
    { nome: CANAL_PUNICOES, desc: '🔨 Banimentos, kicks, muttes, warns e ADV Staff' },
    { nome: CANAL_CARGOS, desc: '🏷️ Logs de cargos (antigo)' },
    { nome: CANAL_SERVIDOR, desc: '⚙️ Logs do servidor' },
    { nome: CANAL_MENSAGENS, desc: '✏️ Logs de mensagens' },
    { nome: CANAL_PROMOVIDO, desc: '📗 Relatório promoções' },
    { nome: CANAL_REBAIXADO, desc: '📗 Relatório rebaixamentos' },
    { nome: CANAL_DEMITIDO, desc: '📗 Relatório demissões' },
    { nome: CANAL_ADVERTENCIA, desc: '📗 Advertências staff e ADV' },
    { nome: CANAL_APELIDOS, desc: '📝 Logs de apelidos' },
    { nome: CANAL_REACOES, desc: '⭐ Logs de reações' },
    { nome: CANAL_WEBHOOKS, desc: '🔗 Logs de webhooks' },
    { nome: CANAL_BOOSTS, desc: '💪 Logs de boosts' },
    { nome: CANAL_MODLOG, desc: '📜 ModLog estilo Probot (adição/remoção de cargos com executor)' }
];

// ==================== HIERARQUIA ====================
const CARGOS_LEVEL = {
    'Staff': 1,
    'Estagiário(a)': 2,
    'Suporte': 3,
    'Moderador(a)': 4,
    'Administrador(a)': 5,
    'Supervisor(a)': 6,
    'Coordenador(a)': 7,
    'Líder Administrativo': 8,
    'Desenvolvedor(a)': 9
};

function getNivel(member) {
    if (!member || !member.guild) return 0;
    if (member.id === member.guild.ownerId || member.permissions.has(PermissionsBitField.Flags.Administrator)) return 9;
    let max = 0;
    for (let [cargo, nivel] of Object.entries(CARGOS_LEVEL)) {
        if (member.roles.cache.some(r => r.name === cargo) && nivel > max) max = nivel;
    }
    return max;
}

function isStaff(member) {
    return getNivel(member) > 0;
}

const podeBan = m => getNivel(m) >= 8;
const podeUnban = m => getNivel(m) >= 8;
const podeKick = m => getNivel(m) >= 5;
const podeMute = m => getNivel(m) >= 1;
const podeWarn = m => getNivel(m) >= 1;
const podeAdv = m => getNivel(m) >= 5;
const podeAdvertirStaff = m => getNivel(m) >= 5;
const podeDemitir = m => getNivel(m) >= 8;
const podeTirarCooldown = m => getNivel(m) >= 5;
const podeResetarRanking = m => getNivel(m) >= 8;
const podeClear = m => getNivel(m) >= 5;
const podeHackban = m => getNivel(m) >= 8; // hackban requer nível 8+

// ==================== FUNÇÕES AUXILIARES ====================
const cooldownAvaliacao = new Map();
const COOLDOWN_TIME = 15 * 60 * 1000;
const MENSAGEM_ROTATIVA_INTERVALO = 15 * 60 * 1000;

async function sendLog(guild, chan, embed) {
    const c = guild.channels.cache.find(ch => ch.name === chan && ch.isTextBased());
    if (c) await c.send({ embeds: [embed] }).catch(() => {});
}
function createLogEmbed(title, color, fields, thumb = null) {
    const e = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
    if (thumb) e.setThumbnail(thumb);
    fields.forEach(f => { if (f.value) e.addFields({ name: f.name, value: f.value, inline: f.inline || false }); });
    return e;
}
function barraNota(nota) {
    const p = Math.round((nota / 10) * 20);
    return '▰'.repeat(p) + '▱'.repeat(20 - p);
}

async function criarCanaisLog(guild) {
    let cat = guild.channels.cache.find(c => c.name === '📁 LOGS' && c.type === ChannelType.GuildCategory);
    if (!cat) {
        cat = await guild.channels.create({ name: '📁 LOGS', type: ChannelType.GuildCategory, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }] });
        console.log(`✅ Categoria criada em ${guild.name}`);
    }
    for (const canal of LISTA_CANAIS_LOG) {
        if (!guild.channels.cache.find(c => c.name === canal.nome)) {
            await guild.channels.create({ name: canal.nome, type: ChannelType.GuildText, parent: cat.id, topic: canal.desc, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }] });
            console.log(`✅ Canal criado: ${canal.nome} em ${guild.name}`);
        }
    }
    // NÃO criar os canais de boas-vindas e saída – eles já existem
}

// ==================== SLASH COMMANDS ====================
const slashCommands = [
    { name: 'avaliar', description: '⭐ Avaliar staff (1-10) - Todos' },
    { name: 'media', description: 'Média do staff', options: [{ name: 'staff', type: 6, description: 'Staff', required: true }] },
    { name: 'ranking', description: 'Ranking dos staffs' },
    { name: 'ajuda', description: 'Mostrar comandos' },
    { name: 'ban', description: 'Banir', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'kick', description: 'Expulsar membro', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'unban', description: 'Desbanir', options: [{ name: 'id', type: 3, description: 'ID', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'banlist', description: 'Lista de banidos' },
    { name: 'mute', description: 'Mutar (máx 30 dias)', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }, { name: 'tempo', type: 4, description: 'Minutos (até 43200 = 30 dias)', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'unmute', description: 'Desmutar', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'warn', description: 'Advertir', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'warns', description: 'Ver warns', options: [{ name: 'usuario', type: 6, description: 'Usuário', required: true }] },
    { name: 'adv', description: 'ADV STAFF (1,2,3)' },
    { name: 'promover', description: 'Promover staff', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'rebaixar', description: 'Rebaixar staff', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'demitir', description: 'Demitir staff', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'advertir-staff', description: 'Advertir staff', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }, { name: 'motivo', type: 3, description: 'Motivo', required: true }] },
    { name: 'tirarcooldown', description: 'Remover cooldown avaliação', options: [{ name: 'usuario', type: 6, description: 'Membro', required: true }] },
    { name: 'resetar-ranking', description: '[Admin] Resetar TODAS as avaliações' },
    { name: 'resetar-staff', description: '[Admin] Resetar avaliações de um staff específico', options: [{ name: 'staff', type: 6, description: 'Staff', required: true }] },
    { name: 'clear', description: '[Admin] Limpar mensagens no canal', options: [{ name: 'quantidade', type: 4, description: 'Número de mensagens (2 a 10000)', required: true }] },
    { name: 'hackban', description: '[Admin] Aplicar hackban (ban normal)', options: [{ name: 'usuario', type: 6, description: 'Usuário a ser banido', required: true }, { name: 'motivo', type: 3, description: 'Motivo do ban', required: true }] }
];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
async function regComandos() {
    try {
        console.log('📌 Registrando comandos slash...');
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: slashCommands });
        console.log('✅ Comandos registrados!');
    } catch (e) { console.error(e); }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks
    ]
});

// ==================== LISTA DE PALAVRÕES ====================
const badWords = [
    "vadia", "puta", "caralho", "merda", "bosta", "desgraça", "fuder", "foder", "filho da puta", "arrombado", "viado", "corno", "pau no cu", "cuzão", "porra", "cacete", "krl", "pkrl", "fdp",
    "escroto", "buceta", "cu", "rola", "pinto", "xota", "otário", "otaria", "vagabunda", "vagabundo", "piranha", "cachorra", "cadela", "putinha", "mongo", "retardado", "mongolóide", "analfabeto",
    "imbecil", "idiota", "babaca", "palhaço", "lixo", "nojento", "nojenta", "feioso", "bunda", "peido", "merdoso", "porcaria", "baitola", "bicha", "sapatão", "veado", "brocha", "frango", "pamonha",
    "trouxa", "mocorongo", "zebra", "tchola", "mulambo", "macaco", "preto", "negao", "criolo", "judeu", "vei", "gordo", "baleia", "hipopotamo", "jegue", "asno", "burro", "animal", "bestial",
    "tarado", "tarada", "abusador", "estuprador", "pedófilo", "predador", "safado", "safada", "galinha", "vaca", "égua", "cavalo", "mula", "burra"
];
for (let i = 0; i < 150; i++) badWords.push(`palavrao${i}`);

const warns = new Map();
const avaliacoes = new Map();
const staffWarns = new Map();

// ==================== MENSAGEM ROTATIVA DE AVALIAÇÃO ====================
let avaliacaoMsg = null;
let intervaloRotativo = null;
async function enviarMsgAvaliacao(guild) {
    const canal = guild.channels.cache.find(c => c.name === CANAL_AVALIACOES && c.isTextBased());
    if (!canal) return;
    try {
        if (avaliacaoMsg && avaliacaoMsg.author?.id === client.user.id) {
            try { await avaliacaoMsg.delete(); } catch(e) {}
        }
        const embed = new EmbedBuilder()
            .setColor(0x00FFCC)
            .setTitle('⭐ Como avaliar um staff?')
            .setDescription('Use `/avaliar` para avaliar um membro da equipe.')
            .addFields(
                { name: '📌 Comando', value: '`/avaliar`', inline: false },
                { name: '👨‍✈️ Identificação do Staff', value: '• **Menção**: `@Fulano`\n• **ID numérico**: `123456789012345678`', inline: false },
                { name: '⭐ Nota', value: 'De **1** a **10** (apenas números inteiros).', inline: true },
                { name: '📝 Feedback', value: 'Comentário construtivo (obrigatório).', inline: true },
                { name: '🕒 Cooldown', value: 'A cada **15 minutos**.', inline: false }
            );
        const nova = await canal.send({ embeds: [embed] });
        avaliacaoMsg = nova;
    } catch (err) { console.error('Erro na mensagem rotativa:', err); }
}

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | /ajuda', type: 0 }], status: 'online' });
    for (const guild of client.guilds.cache.values()) {
        await criarCanaisLog(guild);
        if (intervaloRotativo) clearInterval(intervaloRotativo);
        setTimeout(() => enviarMsgAvaliacao(guild), 2000);
        intervaloRotativo = setInterval(() => enviarMsgAvaliacao(guild), MENSAGEM_ROTATIVA_INTERVALO);
    }
    await regComandos();
    console.log('🟢 Bot pronto!');
});

// ==================== ENTRADA (BOAS-VINDAS) ====================
client.on('guildMemberAdd', async member => {
    const welcomeChannel = member.guild.channels.cache.find(c => c.name === CANAL_BOAS_VINDAS && c.isTextBased());
    if (welcomeChannel) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: 'Bem-vindo ao Atlas RP!', iconURL: member.user.displayAvatarURL() })
            .setTitle('🌎 Bem-vindo ao Atlas RP!')
            .setDescription(`Olá, ${member.user} seja muito bem-vindo à nossa comunidade.

Ficamos muito felizes em ter você aqui. O Atlas RP é um servidor brasileiro de Roleplay no Roblox que está sendo desenvolvido com foco total na experiência do jogador. Todo o projeto está sendo criado com muito cuidado e dedicação para entregar uma cidade realista, organizada e imersiva para todos.

Nosso objetivo é permitir que cada jogador seja o protagonista da sua própria jornada. Aqui você poderá trabalhar, evoluir, formar conexões, participar de eventos exclusivos e desenvolver seu personagem dentro de um ambiente sério, dinâmico e divertido.

Antes de começar, pedimos que você leia atentamente as regras do servidor e siga as orientações da comunidade. Isso garante um ambiente justo e agradável para todos os cidadãos.

📍 Links importantes:
🎮 | Codigo: <#1497746225289777448>
📜 | Regras discord: <#1497661394936660049> 
📄 | Regras in-game: <#1497661392864411779>
🛡️ | Suporte: <#1497758992938827856>   

Esperamos que você aproveite cada momento e se prepare para carregar o destino da sua história aqui no Atlas RP.

Atenciosamente,
Equipe Atlas RP`)
            .setImage('https://i.postimg.cc/ZRNF4Nxy/bnn.png')
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `ID do usuário: ${member.user.id}` })
            .setTimestamp();
        await welcomeChannel.send({ embeds: [embed] }).catch(() => {});
    }
    // Log normal no canal de membros
    const logEmbed = createLogEmbed('📥 MEMBRO ENTROU', 0x00FF00, [
        { name: '👤 Membro', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Agora somos', value: `${member.guild.memberCount} membros`, inline: true }
    ], member.user.displayAvatarURL());
    await sendLog(member.guild, CANAL_MEMBROS, logEmbed);
});

// ==================== SAÍDA ====================
client.on('guildMemberRemove', async member => {
    const leaveChannel = member.guild.channels.cache.find(c => c.name === CANAL_SAIDA && c.isTextBased());
    if (leaveChannel) {
        await leaveChannel.send(`${member.user.tag} (**${member.user.id}**) saiu do servidor.`).catch(() => {});
    }
    const logEmbed = createLogEmbed('📤 MEMBRO SAIU', 0xFF0000, [
        { name: '👤 Membro', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: '📅 Entrou em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Agora somos', value: `${member.guild.memberCount} membros`, inline: true }
    ], member.user.displayAvatarURL());
    await sendLog(member.guild, CANAL_MEMBROS, logEmbed);
});

// ==================== MODLOG PROFISSIONAL (CARGOS) ====================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const e = createLogEmbed('✏️ APELIDO ALTERADO', 0xFFA500, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📛 Antigo', value: oldMember.nickname || 'Nenhum', inline: true },
            { name: '📛 Novo', value: newMember.nickname || 'Nenhum', inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_APELIDOS, e);
    }
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    async function getExecutor(targetId, roleId, action) {
        try {
            const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 10, type: AuditLogEvent.MemberRoleUpdate });
            const log = fetchedLogs.entries.find(entry =>
                entry.targetId === targetId &&
                entry.changes.some(change => {
                    if (action === 'add') return change.key === '$add' && change.new?.some(r => r.id === roleId);
                    if (action === 'remove') return change.key === '$remove' && change.old?.some(r => r.id === roleId);
                    return false;
                })
            );
            return log ? log.executor : null;
        } catch { return null; }
    }
    for (const [, role] of added) {
        const executor = await getExecutor(newMember.id, role.id, 'add');
        const executorMention = executor ? `<@${executor.id}>` : 'Desconhecido';
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTitle('✅ CARGO ADICIONADO')
            .setDescription(`**${role.name}** foi adicionado a ${newMember.user.tag}`)
            .addFields(
                { name: '👤 Membro', value: `<@${newMember.id}>`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true },
                { name: '👮 Responsável', value: executorMention, inline: true }
            )
            .setTimestamp();
        await sendLog(newMember.guild, CANAL_MODLOG, embed);
        const embedOld = createLogEmbed('🏷️ CARGO ADICIONADO', 0x00FF00, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📌 Cargo', value: role.name, inline: true },
            { name: '🛡️ Por', value: executor ? executor.tag : 'Desconhecido', inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_CARGOS, embedOld);
        if (role.name.includes('ADV STAFF')) {
            const p = createLogEmbed('🏷️ ADV STAFF ATRIBUÍDO', 0x00FF00, [
                { name: '👤 Membro', value: `${newMember.user.tag}`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true }
            ], newMember.user.displayAvatarURL());
            await sendLog(newMember.guild, CANAL_ADVERTENCIA, p);
        }
    }
    for (const [, role] of removed) {
        const executor = await getExecutor(newMember.id, role.id, 'remove');
        const executorMention = executor ? `<@${executor.id}>` : 'Desconhecido';
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setTitle('❌ CARGO REMOVIDO')
            .setDescription(`**${role.name}** foi removido de ${newMember.user.tag}`)
            .addFields(
                { name: '👤 Membro', value: `<@${newMember.id}>`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true },
                { name: '👮 Responsável', value: executorMention, inline: true }
            )
            .setTimestamp();
        await sendLog(newMember.guild, CANAL_MODLOG, embed);
        const embedOld = createLogEmbed('🏷️ CARGO REMOVIDO', 0xFF0000, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📌 Cargo', value: role.name, inline: true },
            { name: '🛡️ Por', value: executor ? executor.tag : 'Desconhecido', inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_CARGOS, embedOld);
    }
});
// ==================== OUTROS EVENTOS DE LOG (resumidos mas completos) ====================
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    if (!oldState.channelId && newState.channelId) {
        const e = createLogEmbed('🎤 ENTROU NA CALL', 0x00FF00, [
            { name: '👤 Membro', value: `${member.user.tag}`, inline: true },
            { name: '🎧 Canal', value: `<#${newState.channelId}>`, inline: true }
        ], member.user.displayAvatarURL());
        await sendLog(member.guild, CANAL_MEMBROS, e);
    }
    if (oldState.channelId && !newState.channelId) {
        const e = createLogEmbed('🎤 SAIU DA CALL', 0xFF0000, [
            { name: '👤 Membro', value: `${member.user.tag}`, inline: true },
            { name: '🎧 Canal', value: `<#${oldState.channelId}>`, inline: true }
        ], member.user.displayAvatarURL());
        await sendLog(member.guild, CANAL_MEMBROS, e);
    }
});
client.on('channelCreate', async channel => {
    if (!channel.guild) return;
    const e = createLogEmbed('📁 CANAL CRIADO', 0x00FF00, [{ name: '📌 Nome', value: channel.name, inline: true }]);
    await sendLog(channel.guild, CANAL_SERVIDOR, e);
});
client.on('channelDelete', async channel => {
    if (!channel.guild) return;
    const e = createLogEmbed('🗑️ CANAL DELETADO', 0xFF0000, [{ name: '📌 Nome', value: channel.name, inline: true }]);
    await sendLog(channel.guild, CANAL_SERVIDOR, e);
});
client.on('channelUpdate', async (oldChan, newChan) => {
    if (!oldChan.guild) return;
    if (oldChan.name !== newChan.name) {
        const e = createLogEmbed('✏️ CANAL RENOMEADO', 0xFFA500, [
            { name: '📌 Antigo', value: oldChan.name, inline: true },
            { name: '📌 Novo', value: newChan.name, inline: true }
        ]);
        await sendLog(newChan.guild, CANAL_SERVIDOR, e);
    }
});
client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;
    const e = createLogEmbed('🗑️ MENSAGEM DELETADA', 0xFF0000, [
        { name: '👤 Autor', value: message.author?.tag || 'Desconhecido', inline: true },
        { name: '📝 Conteúdo', value: message.content?.slice(0, 1000) || 'Sem conteúdo', inline: false },
        { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true }
    ], message.author?.displayAvatarURL());
    await sendLog(message.guild, CANAL_MENSAGENS, e);
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const e = createLogEmbed('✏️ MENSAGEM EDITADA', 0xFFA500, [
        { name: '👤 Autor', value: oldMsg.author?.tag || 'Desconhecido', inline: true },
        { name: '📍 Canal', value: `<#${oldMsg.channelId}>`, inline: true },
        { name: '📝 Antes', value: oldMsg.content?.slice(0, 500) || 'Sem conteúdo', inline: false },
        { name: '📝 Depois', value: newMsg.content?.slice(0, 500) || 'Sem conteúdo', inline: false }
    ], oldMsg.author?.displayAvatarURL());
    await sendLog(oldMsg.guild, CANAL_MENSAGENS, e);
});
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    const e = createLogEmbed('⭐ REAÇÃO ADICIONADA', 0x00FF00, [
        { name: '👤 Usuário', value: user.tag, inline: true },
        { name: '📝 Mensagem', value: `[Clique aqui](${reaction.message.url})`, inline: true },
        { name: '😀 Emoji', value: reaction.emoji.name || reaction.emoji.id, inline: true }
    ], user.displayAvatarURL());
    await sendLog(reaction.message.guild, CANAL_REACOES, e);
});
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    const e = createLogEmbed('⭐ REAÇÃO REMOVIDA', 0xFF0000, [
        { name: '👤 Usuário', value: user.tag, inline: true },
        { name: '📝 Mensagem', value: `[Clique aqui](${reaction.message.url})`, inline: true },
        { name: '😀 Emoji', value: reaction.emoji.name || reaction.emoji.id, inline: true }
    ], user.displayAvatarURL());
    await sendLog(reaction.message.guild, CANAL_REACOES, e);
});
client.on('webhookUpdate', async channel => {
    if (!channel.guild) return;
    const e = createLogEmbed('🔗 WEBHOOK ATUALIZADO', 0xFFA500, [{ name: '📍 Canal', value: `<#${channel.id}>`, inline: true }]);
    await sendLog(channel.guild, CANAL_WEBHOOKS, e);
});
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const e = createLogEmbed('💪 BOOST DO SERVIDOR', 0xFF69B4, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '✨ Desde', value: `<t:${Math.floor(newMember.premiumSinceTimestamp / 1000)}:R>`, inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_BOOSTS, e);
    }
});
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
        const e = createLogEmbed('📝 NOME DO SERVIDOR ALTERADO', 0xFFA500, [
            { name: '📛 Antigo', value: oldGuild.name, inline: true },
            { name: '📛 Novo', value: newGuild.name, inline: true }
        ]);
        await sendLog(newGuild, CANAL_SERVIDOR, e);
    }
    if (oldGuild.icon !== newGuild.icon) {
        const e = createLogEmbed('🖼️ ÍCONE ALTERADO', 0xFFA500, [], null, newGuild.iconURL());
        await sendLog(newGuild, CANAL_SERVIDOR, e);
    }
});
client.on('guildBanAdd', async ban => {
    const e = createLogEmbed('🔨 USUÁRIO BANIDO', 0xFF0000, [
        { name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: '📝 Motivo', value: ban.reason || 'Não informado', inline: true }
    ], ban.user.displayAvatarURL());
    await sendLog(ban.guild, CANAL_PUNICOES, e);
});
client.on('guildBanRemove', async ban => {
    const e = createLogEmbed('✅ USUÁRIO DESBANIDO', 0x00FF00, [{ name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true }], ban.user.displayAvatarURL());
    await sendLog(ban.guild, CANAL_PUNICOES, e);
});

// ==================== AUTOMOD ====================
client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    const lower = msg.content.toLowerCase();
    let blocked = false, reason = '';
    for (const w of badWords) {
        if (lower.includes(w)) {
            blocked = true;
            reason = `Palavrão: ${w}`;
            break;
        }
    }
    const isInvite = /(discord\.gg\/|discord\.com\/invite\/)/i.test(lower);
    if (isInvite) {
        const hasDotRole = msg.member.roles.cache.some(r => r.name === '.');
        if (!hasDotRole) {
            blocked = true;
            reason = 'Link de convite de servidor (sem permissão)';
            await msg.channel.send(`<@${msg.author.id}> manda ai mais um que eu puxo Seu IP maluko`);
            await msg.delete().catch(() => {});
            const embedLog = createLogEmbed('⚠️ AUTOMOD - CONVITE BLOQUEADO', 0xFF0000, [
                { name: '👤 Membro', value: msg.author.tag, inline: true },
                { name: '🚫 Motivo', value: reason, inline: true },
                { name: '📝 Conteúdo', value: msg.content.slice(0, 500), inline: false }
            ], msg.author.displayAvatarURL());
            await sendLog(msg.guild, CANAL_AUTOMOD, embedLog);
            return;
        }
    }
    if (blocked && !isInvite) {
        await msg.delete().catch(() => {});
        const embedLog = createLogEmbed('⚠️ AUTOMOD', 0xFF0000, [
            { name: '👤 Membro', value: msg.author.tag, inline: true },
            { name: '🚫 Motivo', value: reason, inline: true },
            { name: '📝 Conteúdo', value: msg.content.slice(0, 500), inline: false }
        ], msg.author.displayAvatarURL());
        await sendLog(msg.guild, CANAL_AUTOMOD, embedLog);
    }
});

// ==================== COMANDOS DE PREFIXO (>) ====================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('>')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const member = message.member;
    const executor = message.author;

    if (cmd === 'avaliar') return message.reply('⭐ Para avaliar, use `/avaliar`.');
    if (cmd === 'media') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um staff');
        const avs = avaliacoes.get(user.id);
        if (!avs || !avs.length) return message.reply(`📋 ${user.tag} sem avaliações`);
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length}`);
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id, media: list.reduce((a,b)=>a+b.nota,0)/list.length, total: list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return message.reply('📋 Nenhuma avaliação');
        let desc = '';
        for (let i=0;i<rank.length;i++) {
            const m = await message.guild.members.fetch(rank[i].id).catch(()=>null);
            desc += `**${i+1}.** ${m ? m.user.tag : rank[i].id} - ${rank[i].media.toFixed(1)}/10 (${rank[i].total})\n`;
        }
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc);
        return message.reply({ embeds: [embed] });
    }
    if (getNivel(member) === 0) return message.reply('❌ Sem permissão.');

    // KICK
    if (cmd === 'kick' && podeKick(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        if (!target.kickable) return message.reply('❌ Não posso expulsar este usuário.');
        await target.kick(reason);
        const embed = createLogEmbed('🔨 KICK', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor.tag, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} foi expulso.`);
    }
    // BAN
    if (cmd === 'ban' && podeBan(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione');
        const reason = args.join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        const embed = createLogEmbed('🔨 BAN', 0xFF0000, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
            { name: '🛡️ Staff', value: executor.tag },
            { name: '📝 Motivo', value: reason }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} banido.`);
    }
    // UNBAN
    if (cmd === 'unban' && podeUnban(member)) {
        const id = args[0];
        if (!id) return message.reply('❌ ID');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await message.guild.members.unban(id);
            const embed = createLogEmbed('✅ UNBAN', 0x00FF00, [{ name: '🆔 ID', value: id }, { name: '🛡️ Staff', value: executor.tag }, { name: '📝 Motivo', value: motivo }]);
            await sendLog(message.guild, CANAL_PUNICOES, embed);
            return message.reply(`✅ ${id} desbanido.`);
        } catch { return message.reply('❌ ID inválido.'); }
    }
    // BANLIST
    if (cmd === 'banlist' && podeBan(member)) {
        const bans = await message.guild.bans.fetch();
        if (!bans.size) return message.reply('📋 Nenhum banido.');
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.slice(0,4000));
        return message.reply({ embeds: [embed] });
    }
    // MUTE
    if (cmd === 'mute' && podeMute(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione');
        let tempo = parseInt(args[1]);
        if (isNaN(tempo) || tempo <= 0) return message.reply('❌ Tempo inválido (mínimo 1 minuto).');
        if (tempo > 43200) tempo = 43200;
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, reason);
        const embed = createLogEmbed('🔇 MUTE', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
            { name: '🛡️ Staff', value: executor.tag },
            { name: '⏱️ Tempo', value: `${tempo} min` },
            { name: '📝 Motivo', value: reason }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} mutado ${tempo}min.`);
    }
    // UNMUTE
    if (cmd === 'unmute' && podeMute(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 UNMUTE', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
            { name: '🛡️ Staff', value: executor.tag },
            { name: '📝 Motivo', value: motivo }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} desmutado.`);
    }
    // WARN
    if (cmd === 'warn' && podeWarn(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: executor.tag, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})` },
            { name: '🛡️ Staff', value: executor.tag },
            { name: '📝 Motivo', value: reason },
            { name: '📊 Total', value: `${warns.get(user.id).length}` }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ Warn em ${user.tag}. Total: ${warns.get(user.id).length}`);
    }
    // WARNS
    if (cmd === 'warns' && podeWarn(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione');
        const list = warns.get(user.id);
        if (!list || !list.length) return message.reply(`📋 ${user.tag} sem warns.`);
        const desc = list.map((w,i)=>`${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(desc);
        return message.reply({ embeds: [embed] });
    }
    // CLEAR (prefixo)
    if (cmd === 'clear' && podeClear(member)) {
        let quantidade = parseInt(args[0]);
        if (isNaN(quantidade) || quantidade < 2) return message.reply('❌ Use: `>clear <2-10000>`');
        if (quantidade > 10000) quantidade = 10000;
        await message.delete().catch(() => {});
        let deletadasTotal = 0;
        let vezes = Math.ceil(quantidade / 100);
        for (let i = 0; i < vezes; i++) {
            const limite = Math.min(100, quantidade - deletadasTotal);
            const fetched = await message.channel.messages.fetch({ limit: limite });
            const deletadas = await message.channel.bulkDelete(fetched, true).catch(() => []);
            deletadasTotal += deletadas.size;
            if (deletadas.size < limite) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        const embedLog = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🧹 LIMPEZA DE MENSAGENS')
            .setThumbnail(executor.displayAvatarURL())
            .setDescription(`Foram deletadas **${deletadasTotal}** mensagens no canal ${message.channel}`)
            .addFields(
                { name: '👮 Staff', value: `<@${executor.id}>`, inline: true },
                { name: '📌 Canal', value: `<#${message.channel.id}>`, inline: true },
                { name: '📊 Solicitado', value: `${quantidade}`, inline: true },
                { name: '🗑️ Deletadas', value: `${deletadasTotal}`, inline: true }
            )
            .setTimestamp();
        await sendLog(message.guild, CANAL_AUTOMOD, embedLog);
        const confirm = await message.channel.send(`✅ ${deletadasTotal} mensagens deletadas.`);
        setTimeout(() => confirm.delete().catch(() => {}), 5000);
        return;
    }
    // LOCK
    if (cmd === 'lock') {
        if (getNivel(member) < 5) return message.reply('❌ Apenas Administrador(a)+ pode usar este comando.');
        const motivo = args.join(' ') || 'Motivo não informado';
        const channel = message.channel;
        const alreadyLocked = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id)?.deny.has(PermissionsBitField.Flags.SendMessages);
        if (alreadyLocked) return message.reply('🔒 Este canal já está trancado.');
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            for (const [cargoNome, nivel] of Object.entries(CARGOS_LEVEL)) {
                if (nivel >= 5) {
                    const role = message.guild.roles.cache.find(r => r.name === cargoNome);
                    if (role) await channel.permissionOverwrites.edit(role, { SendMessages: true });
                }
            }
            await channel.send(`🎉 **Canal bloqueado com sucesso!** Use \`>unlock\` para destravar.\n🔒 Motivo: ${motivo}`);
            const embed = createLogEmbed('🔒 CANAL TRANCADO', 0xFFA500, [
                { name: '📌 Canal', value: `${channel}`, inline: true },
                { name: '🛡️ Staff', value: executor.tag, inline: true },
                { name: '📝 Motivo', value: motivo, inline: true }
            ], executor.displayAvatarURL());
            await sendLog(message.guild, CANAL_AUTOMOD, embed);
        } catch (err) { message.reply('❌ Erro ao trancar o canal.'); }
        return;
    }
    // UNLOCK
    if (cmd === 'unlock') {
        if (getNivel(member) < 5) return message.reply('❌ Apenas Administrador(a)+ pode usar este comando.');
        const channel = message.channel;
        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            for (const [cargoNome] of Object.entries(CARGOS_LEVEL)) {
                const role = message.guild.roles.cache.find(r => r.name === cargoNome);
                if (role) await channel.permissionOverwrites.edit(role, { SendMessages: null });
            }
            await channel.send(`🎉 **Canal desbloqueado com sucesso!** Use \`>lock\` para travar novamente.`);
            const embed = createLogEmbed('🔓 CANAL DESTRANCADO', 0x00FF00, [
                { name: '📌 Canal', value: `${channel}`, inline: true },
                { name: '🛡️ Staff', value: executor.tag, inline: true }
            ], executor.displayAvatarURL());
            await sendLog(message.guild, CANAL_AUTOMOD, embed);
        } catch (err) { message.reply('❌ Erro ao destrancar o canal.'); }
        return;
    }
    // HACKBAN (prefixo)
    if (cmd === 'hackban' && podeHackban(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário para hackban.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔨 HACKBAN APLICADO')
            .setDescription(`Usuário **${user.tag}** foi banido permanentemente.`)
            .addFields(
                { name: '🛡️ Staff', value: executor.tag, inline: true },
                { name: '📝 Motivo', value: reason, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} foi hackbaneado.`);
    }
    if (cmd === 'promover' || cmd === 'rebaixar' || cmd === 'demitir' || cmd === 'advertir-staff' || cmd === 'tirarcooldown' || cmd === 'adv') {
        return message.reply(`❌ Use o comando slash \`/${cmd}\`.`);
    }
    if (cmd === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo **>** | Slash **/**`)
            .addFields(
                { name: '👑 Líder/Desenvolvedor', value: '`ban`, `unban`, `demitir`, `lock`, `unlock`, `/resetar-ranking`, `/resetar-staff`, `>hackban`, `/hackban`', inline: true },
                { name: '⭐ Coordenador', value: '`mute`, `unmute`, `warn`, `promover`, `rebaixar`', inline: true },
                { name: '🛡️ Supervisor', value: '`mute`, `unmute`, `warn`, `advertir-staff`', inline: true },
                { name: '🔧 Admin', value: '`mute`, `unmute`, `warn`, `promover`, `rebaixar`, `adv`, `kick`, `lock`, `unlock`, `clear`', inline: true },
                { name: '⭐ Todos', value: '`avaliar`, `media`, `ranking`', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
});

// ==================== MODAL DE AVALIAÇÃO (CORRIGIDO) ====================
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit() && interaction.customId === 'avaliarModal') {
        const now = Date.now();
        const last = cooldownAvaliacao.get(interaction.user.id);
        if (last && (now - last) < COOLDOWN_TIME) {
            const remaining = Math.ceil((COOLDOWN_TIME - (now - last)) / 60000);
            return interaction.reply({ content: `⏳ Aguarde ${remaining} min.`, ephemeral: true });
        }
        const staffInput = interaction.fields.getTextInputValue('staff');
        const nota = parseInt(interaction.fields.getTextInputValue('nota'));
        const motivo = interaction.fields.getTextInputValue('motivo');
        if (isNaN(nota) || nota < 1 || nota > 10) return interaction.reply({ content: '❌ Nota 1-10', ephemeral: true });
        const canalAval = interaction.guild.channels.cache.find(c => c.name === CANAL_AVALIACOES);
        if (!canalAval) return interaction.reply({ content: `❌ Canal ${CANAL_AVALIACOES} não encontrado.`, ephemeral: true });
        
        // Busca robusta do staff
        let userId = null;
        let membro = null;
        const input = staffInput.trim();
        let match = input.match(/<@!?(\d+)>/);
        if (match) userId = match[1];
        else if (/^\d+$/.test(input)) userId = input;
        if (userId) {
            try { membro = await interaction.guild.members.fetch(userId); } catch(e) {}
        }
        if (!membro) {
            let searchName = input.startsWith('@') ? input.slice(1) : input;
            searchName = searchName.toLowerCase();
            membro = interaction.guild.members.cache.find(m =>
                (m.nickname && m.nickname.toLowerCase() === searchName) ||
                m.user.username.toLowerCase() === searchName ||
                m.user.tag.toLowerCase().startsWith(searchName)
            );
            if (!membro) {
                try {
                    const fetched = await interaction.guild.members.fetch({ query: searchName, limit: 1 });
                    membro = fetched.first();
                } catch(e) {}
            }
            if (membro) userId = membro.id;
        }
        if (!membro && !userId) {
            const idMatch = input.match(/\d{17,20}/);
            if (idMatch) {
                userId = idMatch[0];
                try { membro = await interaction.guild.members.fetch(userId); } catch(e) {}
            }
        }
        if (!userId || !membro) {
            return interaction.reply({ content: '❌ Staff não encontrado. Use o ID ou marque corretamente (@).', ephemeral: true });
        }
        if (!isStaff(membro)) return interaction.reply({ content: '❌ Este membro não possui cargo de staff ou não é elegível para avaliação.', ephemeral: true });
        
        if (!avaliacoes.has(userId)) avaliacoes.set(userId, []);
        avaliacoes.get(userId).push({ nota, motivo, avaliador: interaction.user.tag, data: new Date() });
        const media = avaliacoes.get(userId).reduce((a,b)=>a+b.nota,0)/avaliacoes.get(userId).length;
        const embed = new EmbedBuilder()
            .setColor(nota>=7?0x00FF00:nota>=4?0xFFA500:0xFF0000)
            .setTitle('⭐ NOVA AVALIAÇÃO')
            .setDescription(`<@${interaction.user.id}> avaliou <@${membro.id}>`)
            .addFields(
                { name: '👨‍✈️ Staff', value: `<@${membro.id}>`, inline: true },
                { name: '👤 Avaliador', value: `<@${interaction.user.id}>`, inline: true },
                { name: '⭐ Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: '📝 Feedback', value: motivo, inline: false },
                { name: '📊 Média', value: `${media.toFixed(1)}/10`, inline: true }
            )
            .setTimestamp();
        await canalAval.send({ embeds: [embed] });
        cooldownAvaliacao.set(interaction.user.id, now);
        return interaction.reply({ content: '✅ Avaliação enviada!', ephemeral: true });
    }
});

// ==================== SLASH COMMANDS (RESTANTES) ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, member, guild, user } = interaction;
    const executor = user;

    if (commandName === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou ID)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1-10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return interaction.showModal(modal);
    }
    if (commandName === 'media') {
        const staff = interaction.options.getMember('staff');
        const avs = avaliacoes.get(staff.id);
        if (!avs || !avs.length) return interaction.reply({ content: `📋 ${staff.user.tag} sem avaliações.`, ephemeral: true });
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nAvaliações: ${avs.length}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (commandName === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id, media: list.reduce((a,b)=>a+b.nota,0)/list.length, total: list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return interaction.reply({ content: '📋 Nenhuma avaliação.', ephemeral: true });
        let desc = '';
        for (let r of rank) {
            const m = await guild.members.fetch(r.id).catch(()=>null);
            desc += `**${rank.indexOf(r)+1}.** ${m ? m.user.tag : r.id} - ${r.media.toFixed(1)}/10 (${r.total})\n`;
        }
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (commandName === 'resetar-ranking') {
        if (!podeResetarRanking(member)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        avaliacoes.clear();
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('🗑️ RANKING RESETADO').setDescription('Todas as avaliações foram apagadas.').setTimestamp();
        await sendLog(guild, CANAL_AVALIACOES, embed);
        return interaction.reply({ content: '✅ Ranking resetado!', ephemeral: true });
    }
    if (commandName === 'resetar-staff') {
        if (!podeResetarRanking(member)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        const staff = interaction.options.getMember('staff');
        if (!isStaff(staff)) return interaction.reply({ content: '❌ Membro não é staff.', ephemeral: true });
        if (avaliacoes.has(staff.id)) {
            avaliacoes.delete(staff.id);
            const embed = new EmbedBuilder().setColor(0xFFA500).setTitle('🗑️ AVALIAÇÕES RESETADAS').setDescription(`Avaliações de ${staff.user.tag} removidas.`).setTimestamp();
            await sendLog(guild, CANAL_AVALIACOES, embed);
            return interaction.reply({ content: `✅ Avaliações de ${staff.user.tag} resetadas.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `ℹ️ ${staff.user.tag} não possui avaliações.`, ephemeral: true });
        }
    }
    if (commandName === 'clear') {
        if (!podeClear(member)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        let quantidade = interaction.options.getInteger('quantidade');
        if (quantidade < 2 || quantidade > 10000) return interaction.reply({ content: '❌ Quantidade deve ser entre 2 e 10000.', ephemeral: true });
        await interaction.reply({ content: `⏳ Deletando ${quantidade} mensagens...`, ephemeral: true });
        let deletadasTotal = 0;
        let vezes = Math.ceil(quantidade / 100);
        for (let i = 0; i < vezes; i++) {
            const limite = Math.min(100, quantidade - deletadasTotal);
            const fetched = await interaction.channel.messages.fetch({ limit: limite });
            const deletadas = await interaction.channel.bulkDelete(fetched, true).catch(() => []);
            deletadasTotal += deletadas.size;
            if (deletadas.size < limite) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        const embedLog = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🧹 LIMPEZA DE MENSAGENS')
            .setThumbnail(executor.displayAvatarURL())
            .setDescription(`Foram deletadas **${deletadasTotal}** mensagens no canal ${interaction.channel}`)
            .addFields(
                { name: '👮 Staff', value: `<@${executor.id}>`, inline: true },
                { name: '📌 Canal', value: `<#${interaction.channel.id}>`, inline: true },
                { name: '📊 Solicitado', value: `${quantidade}`, inline: true },
                { name: '🗑️ Deletadas', value: `${deletadasTotal}`, inline: true }
            )
            .setTimestamp();
        await sendLog(guild, CANAL_AUTOMOD, embedLog);
        const replyMsg = await interaction.channel.send(`✅ ${deletadasTotal} mensagens deletadas.`);
        setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
        return;
    }
    if (commandName === 'hackban') {
        if (!podeHackban(member)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await guild.members.ban(user.id, { reason: motivo });
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔨 HACKBAN APLICADO')
            .setDescription(`Usuário **${user.tag}** foi banido permanentemente.`)
            .addFields(
                { name: '🛡️ Staff', value: executor.tag, inline: true },
                { name: '📝 Motivo', value: motivo, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();
        await sendLog(guild, CANAL_PUNICOES, embed);
        return interaction.reply({ content: `✅ ${user.tag} foi hackbaneado.`, ephemeral: true });
    }
    if (commandName === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Slash Commands')
            .addFields(
                { name: '👑 Líder/Desenvolvedor', value: '/ban, /unban, /demitir, /resetar-ranking, /resetar-staff, /hackban', inline: true },
                { name: '⭐ Coordenador', value: '/mute, /unmute, /warn, /promover, /rebaixar', inline: true },
                { name: '🛡️ Supervisor', value: '/mute, /unmute, /warn, /advertir-staff', inline: true },
                { name: '🔧 Admin', value: '/mute, /unmute, /warn, /promover, /rebaixar, /adv, /kick, /clear', inline: true },
                { name: '⭐ Todos', value: '/avaliar, /media, /ranking', inline: true }
            );
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// ==================== DROPDOWN E MODAL ADV ====================
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'adv_select') {
        const selected = interaction.values[0];
        const roleName = selected === 'adv1' ? 'ADV STAFF 1' : selected === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        const modal = new ModalBuilder().setCustomId(`advModal_${selected}`).setTitle(`Atribuir ${roleName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('usuario').setLabel('ID do usuário').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
    }
});
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit() && interaction.customId.startsWith('advModal_')) {
        await interaction.deferReply({ ephemeral: true });
        const selected = interaction.customId.split('_')[1];
        const roleName = selected === 'adv1' ? 'ADV STAFF 1' : selected === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        const usuarioInput = interaction.fields.getTextInputValue('usuario');
        const motivo = interaction.fields.getTextInputValue('motivo');
        const userId = usuarioInput.match(/\d+/g)?.[0];
        if (!userId) return interaction.editReply({ content: '❌ ID inválido.' });
        const target = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!target) return interaction.editReply({ content: '❌ Usuário não encontrado.' });
        const executor = interaction.user.tag;
        const member = interaction.member;
        if (getNivel(member) < 5) return interaction.editReply({ content: '❌ Apenas Administrador+ pode atribuir ADV.' });
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.editReply({ content: `❌ Cargo ${roleName} não existe.` });
        await target.roles.add(role);
        const embed = createLogEmbed(`🏷️ ${roleName} ATRIBUÍDO`, 0x00FF00, [
            { name: '👤 Usuário', value: `${target.user.tag} (${target.id})` },
            { name: '🛡️ Staff', value: executor },
            { name: '📝 Motivo', value: motivo }
        ], target.user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_ADVERTENCIA, embed);
        return interaction.editReply({ content: `✅ ${roleName} concedido a ${target.user.tag} por ${executor}.` });
    }
});

client.login(process.env.DISCORD_TOKEN);
