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

const ADV_STAFF_ROLES = { adv1: 'ADV STAFF 1', adv2: 'ADV STAFF 2', adv3: 'ADV STAFF 3' };
const badWords = ['vadia', 'puta', 'caralho', 'merda', 'bosta', 'desgraça', 'fuder', 'foder', 'filho da puta', 'arrombado', 'viado', 'corno', 'pau no cu', 'cuzão', 'porra', 'cacete', 'krl', 'pkrl', 'fdp'];

const warns = new Map();
const avaliacoes = new Map();

function getNivel(member) {
    if (member.roles.cache.some(r => r.name === 'Líder Administrativo')) return 4;
    if (member.roles.cache.some(r => r.name === 'Coordenador(a)')) return 3;
    if (member.roles.cache.some(r => r.name === 'Supervisor(a)')) return 2;
    if (member.roles.cache.some(r => r.name === 'Administrador(a)')) return 1;
    return 0;
}
function podeBan(m) { return getNivel(m) >= 4; }
function podeUnban(m) { return getNivel(m) >= 4; }
function podeMute(m) { return getNivel(m) >= 1; }
function podeWarn(m) { return getNivel(m) >= 1; }
function podeAdv1(m) { return getNivel(m) >= 2; }
function podeAdv2(m) { return getNivel(m) >= 3; }
function podeAdv3(m) { return getNivel(m) >= 4; }

async function sendLog(guild, channelName, embed) {
    try {
        const ch = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
        if (ch) await ch.send({ embeds: [embed] });
    } catch (e) {}
}
function logEmbed(title, color, fields) {
    const e = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
    fields.forEach(f => e.addFields({ name: f.name, value: f.value, inline: f.inline || false }));
    return e;
}
function barraNota(nota) {
    const total = 20, preenchidos = Math.round((nota / 10) * total);
    return '▰'.repeat(preenchidos) + '▱'.repeat(total - preenchidos);
}

const slashCommands = [
    { name: 'ban', description: 'Banir', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'unban', description: 'Desbanir', options: [{ name: 'id', type: 3, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'banlist', description: 'Lista de banidos' },
    { name: 'mute', description: 'Mutar', options: [{ name: 'usuario', type: 6, required: true }, { name: 'tempo', type: 4, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'unmute', description: 'Desmutar', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'warn', description: 'Advertir', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'warns', description: 'Ver warns', options: [{ name: 'usuario', type: 6, required: true }] },
    { name: 'adv1', description: 'ADV STAFF 1', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'adv2', description: 'ADV STAFF 2', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'adv3', description: 'ADV STAFF 3', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
    { name: 'avaliar', description: 'Avaliar staff (1-10) - Todos' },
    { name: 'media', description: 'Média do staff', options: [{ name: 'staff', type: 6, required: true }] },
    { name: 'ranking', description: 'Ranking staffs' },
    { name: 'ajuda', description: 'Comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function regComandos() {
    try {
        console.log('Registrando comandos...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: slashCommands });
        console.log('Comandos registrados!');
    } catch (e) { console.error(e); }
}

client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
    await regComandos();
    console.log('Bot pronto!');
});

client.on('guildMemberAdd', async member => {
    await sendLog(member.guild, 'logs-membros', logEmbed('MEMBRO ENTROU', 0x00FF00, [{ name: 'Membro', value: member.user.tag }, { name: 'Total', value: `${member.guild.memberCount}` }]));
    const dm = new EmbedBuilder().setColor(0x00FF00).setTitle('Bem-vindo').setDescription(`Olá ${member.user}!\nRegras: https://discord.com/channels/1493042257861939372/1497661394936660049\nRegras In-Game: https://discord.com/channels/1493042257861939372/1497661392864411779`);
    member.send({ embeds: [dm] }).catch(() => {});
});
client.on('guildMemberRemove', async member => {
    await sendLog(member.guild, 'logs-membros', logEmbed('MEMBRO SAIU', 0xFF0000, [{ name: 'Membro', value: member.user.tag }, { name: 'Total', value: `${member.guild.memberCount}` }]));
});

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    const lower = msg.content.toLowerCase();
    let blocked = false, reason = '';
    for (const w of badWords) if (lower.includes(w)) { blocked = true; reason = `Palavrao: ${w}`; break; }
    if (lower.includes('discord.gg/') || lower.includes('discord.com/invite/')) { blocked = true; reason = 'Link de servidor'; }
    if (blocked) {
        await msg.delete();
        await sendLog(msg.guild, 'logs-automod', logEmbed('AUTOMOD', 0xFF0000, [{ name: 'Membro', value: msg.author.tag }, { name: 'Motivo', value: reason }]));
    }
    if (!msg.content.startsWith(PREFIX)) return;
    const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const m = msg.member;
    const exec = msg.author.tag;

    if (cmd === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('Avaliar Staff');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)));
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)));
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        await msg.showModal(modal);
        return;
    }
    if (cmd === 'media') {
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione um staff');
        const avs = avaliacoes.get(user.id);
        if (!avs || !avs.length) return msg.reply(`${user.tag} sem avaliacoes`);
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle(`Media de ${user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length}`)] });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id,media:list.reduce((a,b)=>a+b.nota,0)/list.length,total:list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return msg.reply('Nenhuma avaliacao');
        let desc = '';
        for (let i=0;i<rank.length;i++) {
            const memb = await msg.guild.members.fetch(rank[i].id).catch(()=>null);
            desc += `${i+1}. ${memb ? memb.user.tag : rank[i].id} - ${rank[i].media.toFixed(1)}/10 (${rank[i].total})\n`;
        }
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('RANKING').setDescription(desc)] });
    }
    if (!getNivel(m)) return msg.reply('Sem permissao');
    if (cmd === 'ban') {
        if (!podeBan(m)) return msg.reply('Apenas Lider');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const reason = args.join(' ') || 'Sem motivo';
        await msg.guild.members.ban(user.id, { reason });
        await sendLog(msg.guild, 'punicao-discord', logEmbed('BAN', 0xFF0000, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: reason }]));
        return msg.reply(`${user.tag} banido por ${exec}`);
    }
    if (cmd === 'unban') {
        if (!podeUnban(m)) return msg.reply('Apenas Lider');
        const id = args[0];
        if (!id) return msg.reply('ID');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await msg.guild.members.unban(id);
            await sendLog(msg.guild, 'punicao-discord', logEmbed('DESBAN', 0x00FF00, [{ name: 'ID', value: id }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
            msg.reply(`${id} desbanido por ${exec}`);
        } catch { msg.reply('ID invalido'); }
        return;
    }
    if (cmd === 'banlist') {
        if (!podeBan(m)) return msg.reply('Sem permissao');
        const bans = await msg.guild.bans.fetch();
        if (!bans.size) return msg.reply('Nenhum banido');
        const lista = bans.map(ban => `${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('BANIDOS').setDescription(lista.substring(0,4000))] });
    }
    if (cmd === 'mute') {
        if (!podeMute(m)) return msg.reply('Sem permissao');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const tempo = parseInt(args[1]);
        if (isNaN(tempo)) return msg.reply('Minutos?');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await msg.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, reason);
        await sendLog(msg.guild, 'punicao-discord', logEmbed('MUTE', 0xFFA500, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Tempo', value: `${tempo} min` }, { name: 'Motivo', value: reason }]));
        return msg.reply(`${user.tag} mutado ${tempo}min por ${exec}`);
    }
    if (cmd === 'unmute') {
        if (!podeMute(m)) return msg.reply('Sem permissao');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await msg.guild.members.fetch(user.id);
        await target.timeout(null);
        await sendLog(msg.guild, 'punicao-discord', logEmbed('DESMUTE', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return msg.reply(`${user.tag} desmutado por ${exec}`);
    }
    if (cmd === 'warn') {
        if (!podeWarn(m)) return msg.reply('Sem permissao');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: exec, date: new Date() });
        await sendLog(msg.guild, 'punicao-discord', logEmbed('WARN', 0xFFA500, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: reason }, { name: 'Total', value: `${warns.get(user.id).length}` }]));
        return msg.reply(`Warn em ${user.tag} por ${exec} | Total: ${warns.get(user.id).length}`);
    }
    if (cmd === 'warns') {
        if (!podeWarn(m)) return msg.reply('Sem permissao');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const list = warns.get(user.id);
        if (!list || !list.length) return msg.reply(`${user.tag} sem warns`);
        const desc = list.map((w,i)=>`${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        return msg.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`WARNS de ${user.tag}`).setDescription(desc)] });
    }
    if (cmd === 'adv1') {
        if (!podeAdv1(m)) return msg.reply('Apenas Supervisor+');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = msg.guild.roles.cache.find(r => r.name === 'ADV STAFF 1');
        if (!role) return msg.reply('Cargo ADV STAFF 1 nao existe');
        const target = await msg.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(msg.guild, 'punicao-discord', logEmbed('ADV STAFF 1', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return msg.reply(`ADV1 dado a ${user.tag} por ${exec}`);
    }
    if (cmd === 'adv2') {
        if (!podeAdv2(m)) return msg.reply('Apenas Coordenador+');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = msg.guild.roles.cache.find(r => r.name === 'ADV STAFF 2');
        if (!role) return msg.reply('Cargo ADV STAFF 2 nao existe');
        const target = await msg.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(msg.guild, 'punicao-discord', logEmbed('ADV STAFF 2', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return msg.reply(`ADV2 dado a ${user.tag} por ${exec}`);
    }
    if (cmd === 'adv3') {
        if (!podeAdv3(m)) return msg.reply('Apenas Lider');
        const user = msg.mentions.users.first();
        if (!user) return msg.reply('Mencione');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = msg.guild.roles.cache.find(r => r.name === 'ADV STAFF 3');
        if (!role) return msg.reply('Cargo ADV STAFF 3 nao existe');
        const target = await msg.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(msg.guild, 'punicao-discord', logEmbed('ADV STAFF 3', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return msg.reply(`ADV3 dado a ${user.tag} por ${exec}`);
    }
    if (cmd === 'ajuda') {
        const e = new EmbedBuilder().setColor(0x0099FF).setTitle('Comandos').addFields(
            { name: 'Lider', value: 'ban, unban, adv3', inline: true },
            { name: 'Coordenador', value: 'adv2, mute, unmute, warn', inline: true },
            { name: 'Supervisor', value: 'adv1, mute, unmute, warn', inline: true },
            { name: 'Admin', value: 'mute, unmute, warn', inline: true },
            { name: 'Todos', value: 'avaliar, media, ranking', inline: true }
        );
        return msg.reply({ embeds: [e] });
    }
});

client.on('interactionCreate', async i => {
    if (i.isModalSubmit() && i.customId === 'avaliarModal') {
        const staffNome = i.fields.getTextInputValue('staff');
        const nota = parseInt(i.fields.getTextInputValue('nota'));
        const motivo = i.fields.getTextInputValue('motivo');
        if (isNaN(nota) || nota < 1 || nota > 10) return i.reply({ content: 'Nota 1-10', ephemeral: true });
        const canal = i.guild.channels.cache.find(c => c.name === 'avaliacoes-staffs');
        if (!canal) return i.reply({ content: 'Canal avaliacoes-staffs nao encontrado', ephemeral: true });
        const idMatch = staffNome.match(/\d+/g);
        let membro = null;
        if (idMatch) try { membro = await i.guild.members.fetch(idMatch[0]); } catch(e) {}
        const key = idMatch ? idMatch[0] : staffNome;
        if (!avaliacoes.has(key)) avaliacoes.set(key, []);
        avaliacoes.get(key).push({ nota, motivo, avaliador: i.user.tag, data: new Date() });
        const media = avaliacoes.get(key).reduce((a,b)=>a+b.nota,0)/avaliacoes.get(key).length;
        const embed = new EmbedBuilder().setColor(nota>=7?0x00FF00:nota>=4?0xFFA500:0xFF0000).setTitle('NOVA AVALIACAO')
            .addFields(
                { name: 'Staff', value: membro ? `${membro}` : staffNome, inline: true },
                { name: 'Avaliador', value: i.user.tag, inline: true },
                { name: 'Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: 'Feedback', value: motivo, inline: false },
                { name: 'Media', value: `${media.toFixed(1)}/10`, inline: true }
            ).setTimestamp();
        await canal.send({ embeds: [embed] });
        return i.reply({ content: 'Avaliacao enviada!', ephemeral: true });
    }
    if (!i.isChatInputCommand()) return;
    const cmd = i.commandName;
    const exec = i.user.tag;
    const member = i.member;
    if (cmd === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('Avaliar Staff');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)));
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)));
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return i.showModal(modal);
    }
    if (cmd === 'media') {
        const staff = i.options.getMember('staff');
        const avs = avaliacoes.get(staff.id);
        if (!avs || !avs.length) return i.reply({ content: `${staff} sem avaliacoes`, ephemeral: true });
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        return i.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle(`Media de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length}`)], ephemeral: true });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id,media:list.reduce((a,b)=>a+b.nota,0)/list.length,total:list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return i.reply({ content: 'Nenhuma avaliacao', ephemeral: true });
        let desc = '';
        for (let r of rank) {
            const memb = await i.guild.members.fetch(r.id).catch(()=>null);
            desc += `${rank.indexOf(r)+1}. ${memb ? memb.user.tag : r.id} - ${r.media.toFixed(1)}/10 (${r.total})\n`;
        }
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('RANKING').setDescription(desc)], ephemeral: true });
    }
    if (!getNivel(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
    if (cmd === 'ban') {
        if (!podeBan(member)) return i.reply({ content: 'Apenas Lider', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        await i.guild.members.ban(user.id, { reason: motivo });
        await sendLog(i.guild, 'punicao-discord', logEmbed('BAN', 0xFF0000, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} banido por ${exec}`, ephemeral: true });
    }
    if (cmd === 'unban') {
        if (!podeUnban(member)) return i.reply({ content: 'Apenas Lider', ephemeral: true });
        const id = i.options.getString('id');
        const motivo = i.options.getString('motivo');
        try {
            await i.guild.members.unban(id);
            await sendLog(i.guild, 'punicao-discord', logEmbed('DESBAN', 0x00FF00, [{ name: 'ID', value: id }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
            i.reply({ content: `${id} desbanido por ${exec}`, ephemeral: true });
        } catch { i.reply({ content: 'ID invalido', ephemeral: true }); }
        return;
    }
    if (cmd === 'banlist') {
        if (!podeBan(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
        const bans = await i.guild.bans.fetch();
        if (!bans.size) return i.reply({ content: 'Nenhum banido', ephemeral: true });
        const lista = bans.map(ban => `${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('BANIDOS').setDescription(lista.substring(0,4000))], ephemeral: true });
    }
    if (cmd === 'mute') {
        if (!podeMute(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
        const user = i.options.getUser('usuario');
        const tempo = i.options.getInteger('tempo');
        const motivo = i.options.getString('motivo');
        const target = await i.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        await sendLog(i.guild, 'punicao-discord', logEmbed('MUTE', 0xFFA500, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Tempo', value: `${tempo} min` }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} mutado ${tempo}min por ${exec}`, ephemeral: true });
    }
    if (cmd === 'unmute') {
        if (!podeMute(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const target = await i.guild.members.fetch(user.id);
        await target.timeout(null);
        await sendLog(i.guild, 'punicao-discord', logEmbed('DESMUTE', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} desmutado por ${exec}`, ephemeral: true });
    }
    if (cmd === 'warn') {
        if (!podeWarn(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason: motivo, moderator: exec, date: new Date() });
        await sendLog(i.guild, 'punicao-discord', logEmbed('WARN', 0xFFA500, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }, { name: 'Total', value: `${warns.get(user.id).length}` }]));
        return i.reply({ content: `Warn em ${user.tag} por ${exec} | Total: ${warns.get(user.id).length}`, ephemeral: true });
    }
    if (cmd === 'warns') {
        if (!podeWarn(member)) return i.reply({ content: 'Sem permissao', ephemeral: true });
        const user = i.options.getUser('usuario');
        const list = warns.get(user.id);
        if (!list || !list.length) return i.reply({ content: `${user.tag} sem warns`, ephemeral: true });
        const desc = list.map((w,idx)=>`${idx+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`WARNS de ${user.tag}`).setDescription(desc)], ephemeral: true });
    }
    if (cmd === 'adv1') {
        if (!podeAdv1(member)) return i.reply({ content: 'Apenas Supervisor+', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 1');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 1 nao existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('ADV STAFF 1', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV1 dado a ${user.tag} por ${exec}`, ephemeral: true });
    }
    if (cmd === 'adv2') {
        if (!podeAdv2(member)) return i.reply({ content: 'Apenas Coordenador+', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 2');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 2 nao existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('ADV STAFF 2', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV2 dado a ${user.tag} por ${exec}`, ephemeral: true });
    }
    if (cmd === 'adv3') {
        if (!podeAdv3(member)) return i.reply({ content: 'Apenas Lider', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 3');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 3 nao existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('ADV STAFF 3', 0x00FF00, [{ name: 'Usuario', value: `${user.tag} (${user.id})` }, { name: 'Responsavel', value: exec }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV3 dado a ${user.tag} por ${exec}`, ephemeral: true });
    }
    if (cmd === 'ajuda') {
        const e = new EmbedBuilder().setColor(0x0099FF).setTitle('Comandos').addFields(
            { name: 'Lider', value: '/ban, /unban, /adv3', inline: true },
            { name: 'Coordenador', value: '/adv2, /mute, /unmute, /warn', inline: true },
            { name: 'Supervisor', value: '/adv1, /mute, /unmute, /warn', inline: true },
            { name: 'Admin', value: '/mute, /unmute, /warn', inline: true },
            { name: 'Todos', value: '/avaliar, /media, /ranking', inline: true }
        );
        return i.reply({ embeds: [e], ephemeral: true });
    }
});

client.login(TOKEN);
