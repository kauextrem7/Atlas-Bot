const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
require('dotenv').config();
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Atlas RP está online'));
app.listen(port, () => console.log(`✅ Web server rodando na porta ${port}`));

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

const canaisLog = [
    { nome: CANAL_MEMBROS, desc: 'Entrada/saída de membros, voz e apelidos' },
    { nome: CANAL_AUTOMOD, desc: 'Bloqueios automáticos (palavrões, links)' },
    { nome: CANAL_PUNICOES, desc: 'Banimentos, muttes, warns manuais' },
    { nome: CANAL_CARGOS, desc: 'Adição/remoção de cargos' },
    { nome: CANAL_SERVIDOR, desc: 'Alterações no servidor (nome, ícone, canais)' },
    { nome: CANAL_MENSAGENS, desc: 'Mensagens editadas/deletadas' },
    { nome: CANAL_AVALIACOES, desc: 'Avaliações de staff (público)' },
    { nome: CANAL_PROMOVIDO, desc: 'Promoções de staff' },
    { nome: CANAL_REBAIXADO, desc: 'Rebaixamentos de staff' },
    { nome: CANAL_DEMITIDO, desc: 'Demissões de staff' },
    { nome: CANAL_ADVERTENCIA, desc: 'Advertências de staff e ADV STAFF' },
    { nome: CANAL_APELIDOS, desc: 'Mudanças de apelido' },
    { nome: CANAL_REACOES, desc: 'Reações adicionadas/removidas' },
    { nome: CANAL_WEBHOOKS, desc: 'Criação/edição/deleção de webhooks' },
    { nome: CANAL_BOOSTS, desc: 'Boosts do servidor' }
];

// ==================== HIERARQUIA ====================
const CARGOS_LEVEL = {
    'Administrador(a)': 1,
    'Supervisor(a)': 2,
    'Coordenador(a)': 3,
    'Líder Administrativo': 4,
    'Desenvolvedor(a)': 4
};
const LEVEL_CARGOS = {
    1: 'Administrador(a)',
    2: 'Supervisor(a)',
    3: 'Coordenador(a)',
    4: 'Líder / Desenvolvedor(a)'
};

function getNivel(member) {
    if (member.id === member.guild.ownerId || member.permissions.has(PermissionsBitField.Flags.Administrator)) return 4;
    for (let [cargo, nivel] of Object.entries(CARGOS_LEVEL)) {
        if (member.roles.cache.some(r => r.name === cargo)) return nivel;
    }
    return 0;
}
const podeBan = m => getNivel(m) >= 4;
const podeUnban = m => getNivel(m) >= 4;
const podeMute = m => getNivel(m) >= 1;
const podeWarn = m => getNivel(m) >= 1;
const podeAdv = m => getNivel(m) >= 2;   // Supervisor+ pode dar qualquer ADV
const podePromover = m => getNivel(m) >= 3;
const podeRebaixar = m => getNivel(m) >= 3;
const podeDemitir = m => getNivel(m) >= 4;
const podeAdvertirStaff = m => getNivel(m) >= 2;
const podeTirarCooldown = m => getNivel(m) >= 2;

// ==================== COOLDOWN ====================
const cooldownAvaliacao = new Map();
const COOLDOWN_TIME = 15 * 60 * 1000;

// ==================== FUNÇÕES GLOBAIS ====================
async function sendLog(guild, channelName, embed) {
    const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
    if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
}
function createLogEmbed(title, color, fields, thumbnail = null) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
    if (thumbnail) embed.setThumbnail(thumbnail);
    fields.forEach(f => { if (f.value) embed.addFields({ name: f.name, value: f.value, inline: f.inline || false }); });
    return embed;
}
function barraNota(nota) {
    const total = 20, preenchidos = Math.round((nota / 10) * total);
    return '▰'.repeat(preenchidos) + '▱'.repeat(total - preenchidos);
}
async function getCargoAtual(member) {
    for (let [cargo, nivel] of Object.entries(CARGOS_LEVEL)) {
        if (member.roles.cache.some(r => r.name === cargo)) return { nome: cargo, nivel };
    }
    return { nome: null, nivel: 0 };
}
function getCargoNome(nivel) {
    return LEVEL_CARGOS[nivel] || 'Nenhum';
}
async function criarCanaisLog(guild) {
    let categoria = guild.channels.cache.find(c => c.name === '📁 LOGS' && c.type === ChannelType.GuildCategory);
    if (!categoria) {
        categoria = await guild.channels.create({
            name: '📁 LOGS',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
        });
        console.log('✅ Categoria 📁 LOGS criada');
    }
    for (const canal of canaisLog) {
        const existe = guild.channels.cache.find(c => c.name === canal.nome);
        if (!existe) {
            await guild.channels.create({
                name: canal.nome,
                type: ChannelType.GuildText,
                parent: categoria.id,
                topic: canal.desc,
                permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
            });
            console.log(`✅ Canal criado: ${canal.nome}`);
        }
    }
}

// ==================== SLASH COMMANDS ====================
const slashCommands = [
    // Públicos (todos veem)
    { name: 'avaliar', description: '⭐ Avaliar staff (1-10) - Todos' },
    { name: 'media', description: 'Média do staff', options: [{ name: 'staff', type: 6, required: true }] },
    { name: 'ranking', description: 'Ranking dos staffs' },
    { name: 'ajuda', description: 'Comandos' },

    // Restritos (invisíveis para membros comuns)
    { name: 'ban', description: 'Banir membro', default_member_permissions: "0", options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'unban', description: 'Desbanir', default_member_permissions: "0", options: [{ name: 'id', type: 3, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'banlist', description: 'Lista de banidos', default_member_permissions: "0" },
    { name: 'mute', description: 'Mutar', default_member_permissions: "0", options: [{ name: 'usuario', type: 6, required: true }, { name: 'tempo', type: 4, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'unmute', description: 'Desmutar', default_member_permissions: "0", options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'warn', description: 'Advertir', default_member_permissions: "0", options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'warns', description: 'Ver warns', default_member_permissions: "0", options: [{ name: 'usuario', type: 6, required: true }] },
    { name: 'adv', description: 'Atribuir cargo ADV STAFF (1, 2 ou 3)', default_member_permissions: "0" },
    { name: 'promover', description: 'Promover membro da staff', default_member_permissions: "0" },
    { name: 'rebaixar', description: 'Rebaixar membro da staff', default_member_permissions: "0" },
    { name: 'demitir', description: 'Demitir membro da staff', default_member_permissions: "0" },
    { name: 'advertir-staff', description: 'Advertir um membro da staff', default_member_permissions: "0" },
    { name: 'tirarcooldown', description: 'Remover cooldown de avaliação', default_member_permissions: "0" }
];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
async function regComandos() {
    try {
        console.log('📌 Registrando comandos slash...');
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: slashCommands });
        console.log('✅ Comandos registrados!');
    } catch (e) { console.error(e); }
}

// ==================== CLIENT ====================
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
const badWords = ['vadia', 'puta', 'caralho', 'merda', 'bosta', 'desgraça', 'fuder', 'foder', 'filho da puta', 'arrombado', 'viado', 'corno', 'pau no cu', 'cuzão', 'porra', 'cacete', 'krl', 'pkrl', 'fdp'];
const warns = new Map();
const avaliacoes = new Map();
const staffWarns = new Map();

let avaliacaoMensagemAtual = null;
let intervaloAvaliacao = null;

// Mensagem rotativa no canal de avaliações (a cada 2 minutos, apaga a anterior)
async function enviarMensagemAvaliacao(guild) {
    const channel = guild.channels.cache.find(c => c.name === CANAL_AVALIACOES && c.isTextBased());
    if (!channel) return;
    try {
        // Apaga mensagem anterior se existir
        if (avaliacaoMensagemAtual) {
            try {
                const msgAntiga = await channel.messages.fetch(avaliacaoMensagemAtual.id).catch(() => null);
                if (msgAntiga) await msgAntiga.delete();
            } catch (e) {}
        }
        const embed = new EmbedBuilder()
            .setColor(0x00FFCC)
            .setTitle('⭐ Como avaliar um staff?')
            .setDescription('Sua opinião é muito importante! Use `/avaliar` para avaliar um membro da equipe.')
            .addFields(
                { name: '📌 Comando', value: '`/avaliar`', inline: false },
                { name: '👨‍✈️ Exemplo', value: 'No campo **Staff**, digite o **ID** entre `<@>`.\nEx: `<@123456789012345678>` ou mencione `@Fulano`', inline: false },
                { name: '⭐ Nota', value: 'De **1** a **10** (apenas números inteiros).', inline: true },
                { name: '📝 Feedback', value: 'Comentário construtivo sobre o staff.', inline: true },
                { name: '🕒 Cooldown', value: 'Você pode avaliar a cada **15 minutos**.', inline: false }
            );
        const novaMsg = await channel.send({ embeds: [embed] });
        avaliacaoMensagemAtual = novaMsg;
    } catch (err) {
        console.error('Erro ao enviar mensagem de avaliação:', err);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await criarCanaisLog(guild);
        if (intervaloAvaliacao) clearInterval(intervaloAvaliacao);
        // Primeira mensagem após 2 segundos, depois a cada 2 minutos (120000 ms)
        setTimeout(() => enviarMensagemAvaliacao(guild), 2000);
        intervaloAvaliacao = setInterval(() => enviarMensagemAvaliacao(guild), 120000);
    }
    await regComandos();
    console.log('🟢 Bot pronto!');
});

// ==================== LOGS COMPLETOS ====================
// (mesmo conteúdo da versão anterior – mantido por completo)
client.on('guildMemberAdd', async member => {
    const embed = createLogEmbed('📥 MEMBRO ENTROU', 0x00FF00, [
        { name: '👤 Membro', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Agora somos', value: `${member.guild.memberCount} membros`, inline: true }
    ], member.user.displayAvatarURL());
    await sendLog(member.guild, CANAL_MEMBROS, embed);
    const dm = new EmbedBuilder().setColor(0x00FF00).setTitle('📥 Bem-vindo ao Atlas RP!')
        .setDescription(`Olá ${member.user}!\n📌 **Regras**\n<https://discord.com/channels/1493042257861939372/1497661394936660049>\n<https://discord.com/channels/1493042257861939372/1497661392864411779>`);
    member.send({ embeds: [dm] }).catch(() => {});
});
client.on('guildMemberRemove', async member => {
    const embed = createLogEmbed('📤 MEMBRO SAIU', 0xFF0000, [
        { name: '👤 Membro', value: `${member.user.tag} (${member.id})`, inline: true },
        { name: '📅 Entrou em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Agora somos', value: `${member.guild.memberCount} membros`, inline: true }
    ], member.user.displayAvatarURL());
    await sendLog(member.guild, CANAL_MEMBROS, embed);
});
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    if (!oldState.channelId && newState.channelId) {
        const embed = createLogEmbed('🎤 ENTROU NA CALL', 0x00FF00, [
            { name: '👤 Membro', value: `${member.user.tag}`, inline: true },
            { name: '🎧 Canal', value: `<#${newState.channelId}>`, inline: true }
        ], member.user.displayAvatarURL());
        await sendLog(member.guild, CANAL_MEMBROS, embed);
    }
    if (oldState.channelId && !newState.channelId) {
        const embed = createLogEmbed('🎤 SAIU DA CALL', 0xFF0000, [
            { name: '👤 Membro', value: `${member.user.tag}`, inline: true },
            { name: '🎧 Canal', value: `<#${oldState.channelId}>`, inline: true }
        ], member.user.displayAvatarURL());
        await sendLog(member.guild, CANAL_MEMBROS, embed);
    }
});
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const embed = createLogEmbed('✏️ APELIDO ALTERADO', 0xFFA500, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📛 Antigo', value: oldMember.nickname || 'Nenhum', inline: true },
            { name: '📛 Novo', value: newMember.nickname || 'Nenhum', inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_APELIDOS, embed);
    }
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    for (const [, role] of added) {
        const embed = createLogEmbed('🏷️ CARGO ADICIONADO', 0x00FF00, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📌 Cargo', value: role.name, inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_CARGOS, embed);
        if (role.name.includes('ADV STAFF')) {
            const pEmbed = createLogEmbed('🏷️ ADV STAFF ATRIBUÍDO', 0x00FF00, [
                { name: '👤 Membro', value: `${newMember.user.tag}`, inline: true },
                { name: '🏷️ Cargo', value: role.name, inline: true }
            ], newMember.user.displayAvatarURL());
            await sendLog(newMember.guild, CANAL_ADVERTENCIA, pEmbed);
        }
    }
    for (const [, role] of removed) {
        const embed = createLogEmbed('🏷️ CARGO REMOVIDO', 0xFF0000, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '📌 Cargo', value: role.name, inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_CARGOS, embed);
    }
});
client.on('channelCreate', async channel => {
    if (!channel.guild) return;
    const embed = createLogEmbed('📁 CANAL CRIADO', 0x00FF00, [{ name: '📌 Nome', value: channel.name, inline: true }]);
    await sendLog(channel.guild, CANAL_SERVIDOR, embed);
});
client.on('channelDelete', async channel => {
    if (!channel.guild) return;
    const embed = createLogEmbed('🗑️ CANAL DELETADO', 0xFF0000, [{ name: '📌 Nome', value: channel.name, inline: true }]);
    await sendLog(channel.guild, CANAL_SERVIDOR, embed);
});
client.on('channelUpdate', async (oldChan, newChan) => {
    if (!oldChan.guild) return;
    if (oldChan.name !== newChan.name) {
        const embed = createLogEmbed('✏️ CANAL RENOMEADO', 0xFFA500, [
            { name: '📌 Antigo', value: oldChan.name, inline: true },
            { name: '📌 Novo', value: newChan.name, inline: true }
        ]);
        await sendLog(newChan.guild, CANAL_SERVIDOR, embed);
    }
});
client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;
    const embed = createLogEmbed('🗑️ MENSAGEM DELETADA', 0xFF0000, [
        { name: '👤 Autor', value: message.author?.tag || 'Desconhecido', inline: true },
        { name: '📝 Conteúdo', value: message.content?.slice(0, 1000) || 'Sem conteúdo', inline: false },
        { name: '📍 Canal', value: `<#${message.channelId}>`, inline: true }
    ], message.author?.displayAvatarURL());
    await sendLog(message.guild, CANAL_MENSAGENS, embed);
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const embed = createLogEmbed('✏️ MENSAGEM EDITADA', 0xFFA500, [
        { name: '👤 Autor', value: oldMsg.author?.tag || 'Desconhecido', inline: true },
        { name: '📍 Canal', value: `<#${oldMsg.channelId}>`, inline: true },
        { name: '📝 Antes', value: oldMsg.content?.slice(0, 500) || 'Sem conteúdo', inline: false },
        { name: '📝 Depois', value: newMsg.content?.slice(0, 500) || 'Sem conteúdo', inline: false }
    ], oldMsg.author?.displayAvatarURL());
    await sendLog(oldMsg.guild, CANAL_MENSAGENS, embed);
});
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    const embed = createLogEmbed('⭐ REAÇÃO ADICIONADA', 0x00FF00, [
        { name: '👤 Usuário', value: user.tag, inline: true },
        { name: '📝 Mensagem', value: `[Clique aqui](${reaction.message.url})`, inline: true },
        { name: '😀 Emoji', value: reaction.emoji.name || reaction.emoji.id, inline: true }
    ], user.displayAvatarURL());
    await sendLog(reaction.message.guild, CANAL_REACOES, embed);
});
client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    const embed = createLogEmbed('⭐ REAÇÃO REMOVIDA', 0xFF0000, [
        { name: '👤 Usuário', value: user.tag, inline: true },
        { name: '📝 Mensagem', value: `[Clique aqui](${reaction.message.url})`, inline: true },
        { name: '😀 Emoji', value: reaction.emoji.name || reaction.emoji.id, inline: true }
    ], user.displayAvatarURL());
    await sendLog(reaction.message.guild, CANAL_REACOES, embed);
});
client.on('webhookUpdate', async channel => {
    if (!channel.guild) return;
    const embed = createLogEmbed('🔗 WEBHOOK ATUALIZADO', 0xFFA500, [{ name: '📍 Canal', value: `<#${channel.id}>`, inline: true }]);
    await sendLog(channel.guild, CANAL_WEBHOOKS, embed);
});
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = createLogEmbed('💪 BOOST DO SERVIDOR', 0xFF69B4, [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: '✨ Desde', value: `<t:${Math.floor(newMember.premiumSinceTimestamp / 1000)}:R>`, inline: true }
        ], newMember.user.displayAvatarURL());
        await sendLog(newMember.guild, CANAL_BOOSTS, embed);
    }
});
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
        const embed = createLogEmbed('📝 NOME DO SERVIDOR ALTERADO', 0xFFA500, [
            { name: '📛 Antigo', value: oldGuild.name, inline: true },
            { name: '📛 Novo', value: newGuild.name, inline: true }
        ]);
        await sendLog(newGuild, CANAL_SERVIDOR, embed);
    }
    if (oldGuild.icon !== newGuild.icon) {
        const embed = createLogEmbed('🖼️ ÍCONE ALTERADO', 0xFFA500, [], null, newGuild.iconURL());
        await sendLog(newGuild, CANAL_SERVIDOR, embed);
    }
});
client.on('guildBanAdd', async ban => {
    const embed = createLogEmbed('🔨 USUÁRIO BANIDO', 0xFF0000, [
        { name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
        { name: '📝 Motivo', value: ban.reason || 'Não informado', inline: true }
    ], ban.user.displayAvatarURL());
    await sendLog(ban.guild, CANAL_PUNICOES, embed);
});
client.on('guildBanRemove', async ban => {
    const embed = createLogEmbed('✅ USUÁRIO DESBANIDO', 0x00FF00, [{ name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true }], ban.user.displayAvatarURL());
    await sendLog(ban.guild, CANAL_PUNICOES, embed);
});
client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    const lower = msg.content.toLowerCase();
    let blocked = false, reason = '';
    for (const w of badWords) if (lower.includes(w)) { blocked = true; reason = `Palavrão: ${w}`; break; }
    if (lower.includes('discord.gg/') || lower.includes('discord.com/invite/')) { blocked = true; reason = 'Link de servidor Discord'; }
    if (blocked) {
        await msg.delete().catch(() => {});
        const embed = createLogEmbed('⚠️ AUTOMOD', 0xFF0000, [
            { name: '👤 Membro', value: msg.author.tag, inline: true },
            { name: '🚫 Motivo', value: reason, inline: true },
            { name: '📝 Conteúdo', value: msg.content.slice(0, 500), inline: false }
        ], msg.author.displayAvatarURL());
        await sendLog(msg.guild, CANAL_AUTOMOD, embed);
    }
});

// ==================== COMANDOS DE PREFIXO (&) ====================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('&')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const member = message.member;
    const executor = message.author.tag;

    // Comandos públicos (todos podem usar)
    if (cmd === 'avaliar') {
        return message.reply('⭐ Para avaliar um staff, use o comando `/avaliar`. (Comando de prefixo `&avaliar` não suporta o painel interativo.)');
    }
    if (cmd === 'media') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um staff');
        const avs = avaliacoes.get(user.id);
        if (!avs || !avs.length) return message.reply(`📋 ${user.tag} sem avaliações`);
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length} avaliações`);
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id, media: list.reduce((a,b)=>a+b.nota,0)/list.length, total: list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return message.reply('📋 Nenhuma avaliação');
        let desc = '';
        for (let i=0;i<rank.length;i++) {
            const m = await message.guild.members.fetch(rank[i].id).catch(()=>null);
            desc += `**${i+1}.** ${m ? m.user.tag : rank[i].id} - ${rank[i].media.toFixed(1)}/10 (${rank[i].total} avs)\n`;
        }
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING DE STAFFS').setDescription(desc);
        return message.reply({ embeds: [embed] });
    }

    // Verifica permissão mínima (nível 1+)
    if (getNivel(member) === 0) return message.reply('❌ Você não tem permissão.');

    // Comandos de moderação diretos
    if (cmd === 'ban' && podeBan(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const reason = args.join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        const embed = createLogEmbed('🔨 BANIMENTO', 0xFF0000, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} banido por ${executor}.`);
    }
    if (cmd === 'unban' && podeUnban(member)) {
        const id = args[0];
        if (!id) return message.reply('❌ ID do usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await message.guild.members.unban(id);
            const embed = createLogEmbed('✅ DESBANIMENTO', 0x00FF00, [{ name: '🆔 ID', value: id }, { name: '🛡️ Staff', value: executor }, { name: '📝 Motivo', value: motivo }]);
            await sendLog(message.guild, CANAL_PUNICOES, embed);
            return message.reply(`✅ Usuário ${id} desbanido por ${executor}.`);
        } catch { return message.reply('❌ ID inválido.'); }
    }
    if (cmd === 'banlist' && podeBan(member)) {
        const bans = await message.guild.bans.fetch();
        if (!bans.size) return message.reply('📋 Nenhum banido.');
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 LISTA DE BANIDOS').setDescription(lista.slice(0, 4000));
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'mute' && podeMute(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const tempo = parseInt(args[1]);
        if (isNaN(tempo)) return message.reply('❌ Informe minutos.');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, reason);
        const embed = createLogEmbed('🔇 MUTE', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '⏱️ Duração', value: `${tempo} minutos`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} mutado por ${tempo} min por ${executor}.`);
    }
    if (cmd === 'unmute' && podeMute(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 DESMUTE', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ ${user.tag} desmutado por ${executor}.`);
    }
    if (cmd === 'warn' && podeWarn(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: executor, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: reason, inline: true },
            { name: '📌 Total', value: `${warns.get(user.id).length}`, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PUNICOES, embed);
        return message.reply(`✅ Warn em ${user.tag} por ${executor}. Total: ${warns.get(user.id).length}`);
    }
    if (cmd === 'warns' && podeWarn(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const list = warns.get(user.id);
        if (!list || !list.length) return message.reply(`📋 ${user.tag} não tem warns.`);
        const desc = list.map((w,i)=>`**${i+1}** - ${w.reason} (por ${w.moderator} em <t:${Math.floor(new Date(w.date).getTime()/1000)}:R>)`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(desc);
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'adv' && podeAdv(member)) {
        return message.reply('❌ Para atribuir cargo ADV, use o comando `/adv`. Ele abre um painel com opções.');
    }
    if (cmd === 'promover' && podePromover(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        const cargoAtual = await getCargoAtual(target);
        if (cargoAtual.nivel === 0) return message.reply(`❌ ${user.tag} não possui cargo de staff.`);
        if (cargoAtual.nivel >= 4) return message.reply(`❌ ${user.tag} já está no nível máximo.`);
        const novoNivel = cargoAtual.nivel + 1;
        const novoCargoNome = getCargoNome(novoNivel);
        const cargoRole = message.guild.roles.cache.find(r => r.name === novoCargoNome);
        const cargoAntigoRole = message.guild.roles.cache.find(r => r.name === cargoAtual.nome);
        if (!cargoRole) return message.reply(`❌ Cargo ${novoCargoNome} não encontrado.`);
        await target.roles.remove(cargoAntigoRole);
        await target.roles.add(cargoRole);
        const embed = createLogEmbed('⭐ PROMOÇÃO DE STAFF', 0x00FF00, [
            { name: '👤 Staff', value: `${user.tag} (${user.id})`, inline: true },
            { name: '📈 De', value: cargoAtual.nome, inline: true },
            { name: '📈 Para', value: novoCargoNome, inline: true },
            { name: '🛡️ Promovido por', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_PROMOVIDO, embed);
        return message.reply(`✅ ${user.tag} promovido de ${cargoAtual.nome} para ${novoCargoNome}.`);
    }
    if (cmd === 'rebaixar' && podeRebaixar(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        const cargoAtual = await getCargoAtual(target);
        if (cargoAtual.nivel <= 1) return message.reply(`❌ ${user.tag} não pode ser rebaixado.`);
        const novoNivel = cargoAtual.nivel - 1;
        const novoCargoNome = getCargoNome(novoNivel);
        const cargoRole = message.guild.roles.cache.find(r => r.name === novoCargoNome);
        const cargoAntigoRole = message.guild.roles.cache.find(r => r.name === cargoAtual.nome);
        if (!cargoRole) return message.reply(`❌ Cargo ${novoCargoNome} não encontrado.`);
        await target.roles.remove(cargoAntigoRole);
        await target.roles.add(cargoRole);
        const embed = createLogEmbed('👇 REBAIXAMENTO DE STAFF', 0xFFA500, [
            { name: '👤 Staff', value: `${user.tag} (${user.id})`, inline: true },
            { name: '📉 De', value: cargoAtual.nome, inline: true },
            { name: '📉 Para', value: novoCargoNome, inline: true },
            { name: '🛡️ Rebaixado por', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_REBAIXADO, embed);
        return message.reply(`✅ ${user.tag} rebaixado de ${cargoAtual.nome} para ${novoCargoNome}.`);
    }
    if (cmd === 'demitir' && podeDemitir(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        const cargoAtual = await getCargoAtual(target);
        if (cargoAtual.nivel === 0) return message.reply(`❌ ${user.tag} não possui cargo.`);
        const cargoRole = message.guild.roles.cache.find(r => r.name === cargoAtual.nome);
        await target.roles.remove(cargoRole);
        const embed = createLogEmbed('❌ DEMISSÃO DE STAFF', 0xFF0000, [
            { name: '👤 Staff', value: `${user.tag} (${user.id})`, inline: true },
            { name: '📛 Cargo anterior', value: cargoAtual.nome, inline: true },
            { name: '🛡️ Demitido por', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_DEMITIDO, embed);
        return message.reply(`✅ ${user.tag} demitido.`);
    }
    if (cmd === 'advertir-staff' && podeAdvertirStaff(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        if (!staffWarns.has(user.id)) staffWarns.set(user.id, []);
        staffWarns.get(user.id).push({ motivo, staff: executor, data: new Date() });
        const embed = createLogEmbed('⚠️ ADVERTÊNCIA DE STAFF', 0xFFA500, [
            { name: '👤 Staff', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Advertido por', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true },
            { name: '📌 Total', value: `${staffWarns.get(user.id).length}`, inline: true }
        ], user.displayAvatarURL());
        await sendLog(message.guild, CANAL_ADVERTENCIA, embed);
        return message.reply(`✅ ${user.tag} recebeu advertência. Total: ${staffWarns.get(user.id).length}`);
    }
    if (cmd === 'tirarcooldown' && podeTirarCooldown(member)) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário.');
        if (cooldownAvaliacao.has(user.id)) {
            cooldownAvaliacao.delete(user.id);
            return message.reply(`✅ Cooldown removido para ${user.tag}.`);
        } else {
            return message.reply(`ℹ️ ${user.tag} não estava em cooldown.`);
        }
    }
    if (cmd === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: **&** | Slash: **/**`)
            .addFields(
                { name: '👑 Líder/Desenvolvedor', value: '`ban`, `unban`, `demitir`', inline: true },
                { name: '⭐ Coordenador', value: '`mute`, `unmute`, `warn`, `promover`, `rebaixar`', inline: true },
                { name: '🛡️ Supervisor', value: '`mute`, `unmute`, `warn`, `advertir-staff`', inline: true },
                { name: '🔧 Admin', value: '`mute`, `unmute`, `warn`', inline: true },
                { name: '⭐ Todos', value: '`avaliar`, `media`, `ranking`', inline: true },
                { name: '🔧 Outros', value: '`banlist`, `warns`, `tirarcooldown`, `adv` (via slash)', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
});

// ==================== INTERAÇÕES (MODAIS, DROPDOWN, SLASH) ====================
client.on('interactionCreate', async interaction => {
    // Modal de avaliação (público)
    if (interaction.isModalSubmit() && interaction.customId === 'avaliarModal') {
        const staffNome = interaction.fields.getTextInputValue('staff');
        const nota = parseInt(interaction.fields.getTextInputValue('nota'));
        const motivo = interaction.fields.getTextInputValue('motivo');
        if (isNaN(nota) || nota < 1 || nota > 10) return interaction.reply({ content: '❌ Nota inválida (1 a 10).', ephemeral: true });
        const canal = interaction.guild.channels.cache.find(c => c.name === CANAL_AVALIACOES);
        if (!canal) return interaction.reply({ content: `❌ Canal ${CANAL_AVALIACOES} não encontrado.`, ephemeral: true });
        const userId = staffNome.match(/\d+/g)?.[0];
        let membro = null;
        if (userId) try { membro = await interaction.guild.members.fetch(userId); } catch(e) {}
        const key = userId || staffNome;
        if (!avaliacoes.has(key)) avaliacoes.set(key, []);
        avaliacoes.get(key).push({ nota, motivo, avaliador: interaction.user.tag, data: new Date() });
        const media = avaliacoes.get(key).reduce((a,b)=>a+b.nota,0)/avaliacoes.get(key).length;
        const embed = new EmbedBuilder().setColor(nota>=7?0x00FF00:nota>=4?0xFFA500:0xFF0000).setTitle('⭐ NOVA AVALIAÇÃO')
            .addFields(
                { name: '👨‍✈️ Staff', value: membro ? `${membro}` : staffNome, inline: true },
                { name: '👤 Avaliador', value: interaction.user.tag, inline: true },
                { name: '⭐ Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: '📝 Feedback', value: motivo, inline: false },
                { name: '📊 Média', value: `${media.toFixed(1)}/10`, inline: true }
            ).setTimestamp();
        await canal.send({ embeds: [embed] });
        return interaction.reply({ content: '✅ Avaliação enviada!', ephemeral: true });
    }

    // Slash commands
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;
    const member = interaction.member;
    const executor = interaction.user.tag;

    // Comandos públicos (sem verificação de staff)
    if (cmd === 'avaliar') {
        const now = Date.now();
        const last = cooldownAvaliacao.get(interaction.user.id);
        if (last && (now - last) < COOLDOWN_TIME) {
            const remaining = Math.ceil((COOLDOWN_TIME - (now - last)) / 60000);
            return interaction.reply({ content: `⏳ Você pode avaliar novamente em ${remaining} minuto(s).`, ephemeral: true });
        }
        cooldownAvaliacao.set(interaction.user.id, now);
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return interaction.showModal(modal);
    }
    if (cmd === 'media') {
        const staff = interaction.options.getMember('staff');
        const avs = avaliacoes.get(staff.id);
        if (!avs || !avs.length) return interaction.reply({ content: `📋 ${staff.user.tag} sem avaliações.`, ephemeral: true });
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length} avaliações`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id, media: list.reduce((a,b)=>a+b.nota,0)/list.length, total: list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return interaction.reply({ content: '📋 Nenhuma avaliação.', ephemeral: true });
        let desc = '';
        for (let r of rank) {
            const m = await interaction.guild.members.fetch(r.id).catch(()=>null);
            desc += `**${rank.indexOf(r)+1}.** ${m ? m.user.tag : r.id} - ${r.media.toFixed(1)}/10 (${r.total} avaliações)\n`;
        }
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING DE STAFFS').setDescription(desc);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // A partir daqui, apenas comandos restritos (staff)
    if (getNivel(member) === 0) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });

    // Comando `/adv` com dropdown
    if (cmd === 'adv') {
        if (!podeAdv(member)) return interaction.reply({ content: '❌ Apenas Supervisor+ pode atribuir ADV STAFF.', ephemeral: true });
        const select = new StringSelectMenuBuilder()
            .setCustomId('adv_select')
            .setPlaceholder('Selecione o cargo ADV STAFF')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('ADV STAFF 1').setValue('adv1'),
                new StringSelectMenuOptionBuilder().setLabel('ADV STAFF 2').setValue('adv2'),
                new StringSelectMenuOptionBuilder().setLabel('ADV STAFF 3').setValue('adv3')
            );
        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({ content: 'Selecione o cargo que deseja atribuir:', components: [row], ephemeral: true });
        return;
    }

    // Comandos de modal (promover, rebaixar, demitir, advertir-staff, tirarcooldown)
    if (cmd === 'promover' || cmd === 'rebaixar' || cmd === 'demitir' || cmd === 'advertir-staff' || cmd === 'tirarcooldown') {
        const modalId = `${cmd}Modal`;
        const modalTitle = `📋 ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`;
        const modal = new ModalBuilder().setCustomId(modalId).setTitle(modalTitle);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('usuario').setLabel('Usuário (ID ou @)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        if (cmd !== 'tirarcooldown') {
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        }
        return interaction.showModal(modal);
    }

    // Comandos diretos restantes (ban, unban, mute, unmute, warn, warns) – já implementados
    if (cmd === 'ban' && podeBan(member)) {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.ban(user.id, { reason: motivo });
        const embed = createLogEmbed('🔨 BAN (SLASH)', 0xFF0000, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_PUNICOES, embed);
        return interaction.reply({ content: `✅ ${user.tag} banido.`, ephemeral: true });
    }
    if (cmd === 'unban' && podeUnban(member)) {
        const id = interaction.options.getString('id');
        const motivo = interaction.options.getString('motivo');
        try {
            await interaction.guild.members.unban(id);
            const embed = createLogEmbed('✅ DESBAN (SLASH)', 0x00FF00, [{ name: '🆔 ID', value: id }, { name: '🛡️ Staff', value: executor }, { name: '📝 Motivo', value: motivo }]);
            await sendLog(interaction.guild, CANAL_PUNICOES, embed);
            return interaction.reply({ content: `✅ Usuário ${id} desbanido.`, ephemeral: true });
        } catch { return interaction.reply({ content: '❌ ID inválido.', ephemeral: true }); }
    }
    if (cmd === 'banlist' && podeBan(member)) {
        const bans = await interaction.guild.bans.fetch();
        if (!bans.size) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 LISTA DE BANIDOS').setDescription(lista.slice(0, 4000));
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (cmd === 'mute' && podeMute(member)) {
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        const embed = createLogEmbed('🔇 MUTE (SLASH)', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '⏱️ Duração', value: `${tempo} min`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_PUNICOES, embed);
        return interaction.reply({ content: `✅ ${user.tag} mutado por ${tempo} min.`, ephemeral: true });
    }
    if (cmd === 'unmute' && podeMute(member)) {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 DESMUTE (SLASH)', 0x00FF00, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_PUNICOES, embed);
        return interaction.reply({ content: `✅ ${user.tag} desmutado.`, ephemeral: true });
    }
    if (cmd === 'warn' && podeWarn(member)) {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason: motivo, moderator: executor, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN (SLASH)', 0xFFA500, [
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true },
            { name: '📌 Total', value: `${warns.get(user.id).length}`, inline: true }
        ], user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_PUNICOES, embed);
        return interaction.reply({ content: `✅ Warn em ${user.tag}. Total: ${warns.get(user.id).length}`, ephemeral: true });
    }
    if (cmd === 'warns' && podeWarn(member)) {
        const user = interaction.options.getUser('usuario');
        const list = warns.get(user.id);
        if (!list || !list.length) return interaction.reply({ content: `📋 ${user.tag} não tem warns.`, ephemeral: true });
        const desc = list.map((w,i)=>`**${i+1}** - ${w.reason} (por ${w.moderator} em <t:${Math.floor(new Date(w.date).getTime()/1000)}:R>)`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(desc);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (cmd === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Atlas RP - Slash Commands')
            .addFields(
                { name: '👑 Líder/Desenvolvedor', value: '/ban, /unban, /demitir', inline: true },
                { name: '⭐ Coordenador', value: '/mute, /unmute, /warn, /promover, /rebaixar', inline: true },
                { name: '🛡️ Supervisor', value: '/mute, /unmute, /warn, /advertir-staff, /adv', inline: true },
                { name: '🔧 Admin', value: '/mute, /unmute, /warn', inline: true },
                { name: '⭐ Todos', value: '/avaliar, /media, /ranking', inline: true }
            );
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// Tratamento do dropdown do `/adv`
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'adv_select') {
        const selected = interaction.values[0]; // 'adv1', 'adv2' ou 'adv3'
        const roleName = selected === 'adv1' ? 'ADV STAFF 1' : selected === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        // Guarda temporariamente a escolha – pedir usuário e motivo em um modal
        const modal = new ModalBuilder().setCustomId(`advModal_${selected}`).setTitle(`Atribuir ${roleName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('usuario').setLabel('Usuário (ID ou @)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
    }
});

// Modal do `/adv` (após escolha do dropdown)
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId.startsWith('advModal_')) {
        const selected = interaction.customId.split('_')[1];
        const roleName = selected === 'adv1' ? 'ADV STAFF 1' : selected === 'adv2' ? 'ADV STAFF 2' : 'ADV STAFF 3';
        const usuarioInput = interaction.fields.getTextInputValue('usuario');
        const motivo = interaction.fields.getTextInputValue('motivo');
        const userId = usuarioInput.match(/\d+/g)?.[0] || usuarioInput;
        const target = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!target) return interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true });
        const executor = interaction.user.tag;
        const member = interaction.member;
        if (!podeAdv(member)) return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return interaction.reply({ content: `❌ Cargo ${roleName} não existe.`, ephemeral: true });
        await target.roles.add(role);
        const embed = createLogEmbed(`🏷️ ${roleName} ATRIBUÍDO`, 0x00FF00, [
            { name: '👤 Usuário', value: `${target.user.tag} (${target.id})`, inline: true },
            { name: '🛡️ Staff', value: executor, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ], target.user.displayAvatarURL());
        await sendLog(interaction.guild, CANAL_ADVERTENCIA, embed);
        return interaction.reply({ content: `✅ ${roleName} concedido a ${target.user.tag}.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
