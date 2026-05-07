const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
require('dotenv').config();
const express = require('express');

// Servidor HTTP para o Render não reclamar de porta
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Atlas RP está online'));
app.listen(port, () => console.log(`Servidor web rodando na porta ${port}`));

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

// Sistema de permissão por cargo
function getNivel(member) {
    if (member.roles.cache.some(r => r.name === 'Líder Administrativo')) return 4;
    if (member.roles.cache.some(r => r.name === 'Coordenador(a)')) return 3;
    if (member.roles.cache.some(r => r.name === 'Supervisor(a)')) return 2;
    if (member.roles.cache.some(r => r.name === 'Administrador(a)')) return 1;
    return 0;
}
const podeBan = m => getNivel(m) >= 4;
const podeUnban = m => getNivel(m) >= 4;
const podeMute = m => getNivel(m) >= 1;
const podeWarn = m => getNivel(m) >= 1;
const podeAdv1 = m => getNivel(m) >= 2;
const podeAdv2 = m => getNivel(m) >= 3;
const podeAdv3 = m => getNivel(m) >= 4;

async function sendLog(guild, channelName, embed) {
    const ch = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
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
    { name: 'ban', description: 'Banir membro', options: [{ name: 'usuario', type: 6, required: true }, { name: 'motivo', type: 3, required: true }] },
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
    { name: 'ranking', description: 'Ranking dos staffs' },
    { name: 'ajuda', description: 'Comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function regComandos() {
    try {
        console.log('Registrando comandos slash...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: slashCommands });
        console.log('Comandos registrados!');
    } catch (e) { console.error(e); }
}

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} online`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
    await regComandos();
    console.log('Bot pronto!');
});

// Boas-vindas
client.on('guildMemberAdd', async member => {
    await sendLog(member.guild, 'logs-membros', logEmbed('📥 MEMBRO ENTROU', 0x00FF00, [{ name: 'Membro', value: member.user.tag }, { name: 'Total', value: `${member.guild.memberCount}` }]));
    const dm = new EmbedBuilder().setColor(0x00FF00).setTitle('Bem-vindo!').setDescription(`Olá ${member.user}!\n📌 Regras: <https://discord.com/channels/1493042257861939372/1497661394936660049>\n📌 Regras In-Game: <https://discord.com/channels/1493042257861939372/1497661392864411779>`);
    member.send({ embeds: [dm] }).catch(() => {});
});
client.on('guildMemberRemove', async member => {
    await sendLog(member.guild, 'logs-membros', logEmbed('📤 MEMBRO SAIU', 0xFF0000, [{ name: 'Membro', value: member.user.tag }, { name: 'Total', value: `${member.guild.memberCount}` }]));
});

// Automod
client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    const lower = msg.content.toLowerCase();
    let blocked = false, reason = '';
    for (const w of badWords) if (lower.includes(w)) { blocked = true; reason = `Palavrão: ${w}`; break; }
    if (lower.includes('discord.gg/') || lower.includes('discord.com/invite/')) { blocked = true; reason = 'Link de servidor'; }
    if (blocked) {
        await msg.delete().catch(() => {});
        await sendLog(msg.guild, 'logs-automod', logEmbed('⚠️ AUTOMOD', 0xFF0000, [{ name: 'Membro', value: msg.author.tag }, { name: 'Motivo', value: reason }]));
    }
});

// Comandos de prefixo
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const member = message.member;
    const executor = message.author.tag;

    // Comandos públicos
    if (cmd === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await message.showModal(modal);
        return;
    }
    if (cmd === 'media') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um staff');
        const avs = avaliacoes.get(user.id);
        if (!avs || !avs.length) return message.reply(`${user.tag} sem avaliações`);
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle(`Média de ${user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length}`)] });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id,media:list.reduce((a,b)=>a+b.nota,0)/list.length,total:list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return message.reply('Nenhuma avaliação');
        let desc = '';
        for (let i=0;i<rank.length;i++) {
            const m = await message.guild.members.fetch(rank[i].id).catch(()=>null);
            desc += `${i+1}. ${m ? m.user.tag : rank[i].id} - ${rank[i].media.toFixed(1)}/10 (${rank[i].total})\n`;
        }
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc)] });
    }

    // Verificação de staff
    if (getNivel(member) === 0) return message.reply('❌ Sem permissão');

    if (cmd === 'ban') {
        if (!podeBan(member)) return message.reply('Apenas Líder');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const reason = args.join(' ') || 'Sem motivo';
        await message.guild.members.ban(user.id, { reason });
        await sendLog(message.guild, 'punicao-discord', logEmbed('🔨 BAN', 0xFF0000, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: reason }]));
        return message.reply(`${user.tag} banido por ${executor}`);
    }
    if (cmd === 'unban') {
        if (!podeUnban(member)) return message.reply('Apenas Líder');
        const id = args[0];
        if (!id) return message.reply('ID do usuário');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        try {
            await message.guild.members.unban(id);
            await sendLog(message.guild, 'punicao-discord', logEmbed('✅ DESBAN', 0x00FF00, [{ name: 'ID', value: id }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
            message.reply(`Usuário ${id} desbanido por ${executor}`);
        } catch { message.reply('ID inválido'); }
        return;
    }
    if (cmd === 'banlist') {
        if (!podeBan(member)) return message.reply('Sem permissão');
        const bans = await message.guild.bans.fetch();
        if (!bans.size) return message.reply('Nenhum banido');
        const lista = bans.map(ban => `${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0,4000))] });
    }
    if (cmd === 'mute') {
        if (!podeMute(member)) return message.reply('Sem permissão');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const tempo = parseInt(args[1]);
        if (isNaN(tempo)) return message.reply('Informe minutos');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, reason);
        await sendLog(message.guild, 'punicao-discord', logEmbed('🔇 MUTE', 0xFFA500, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Tempo', value: `${tempo} min` }, { name: 'Motivo', value: reason }]));
        return message.reply(`${user.tag} mutado ${tempo} min por ${executor}`);
    }
    if (cmd === 'unmute') {
        if (!podeMute(member)) return message.reply('Sem permissão');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        await sendLog(message.guild, 'punicao-discord', logEmbed('🔊 DESMUTE', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return message.reply(`${user.tag} desmutado por ${executor}`);
    }
    if (cmd === 'warn') {
        if (!podeWarn(member)) return message.reply('Sem permissão');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: executor, date: new Date() });
        await sendLog(message.guild, 'punicao-discord', logEmbed('⚠️ WARN', 0xFFA500, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: reason }, { name: 'Total', value: `${warns.get(user.id).length}` }]));
        return message.reply(`Warn em ${user.tag} por ${executor} | Total: ${warns.get(user.id).length}`);
    }
    if (cmd === 'warns') {
        if (!podeWarn(member)) return message.reply('Sem permissão');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const list = warns.get(user.id);
        if (!list || !list.length) return message.reply(`${user.tag} não tem warns`);
        const desc = list.map((w,i)=>`${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`WARNS de ${user.tag}`).setDescription(desc)] });
    }
    if (cmd === 'adv1') {
        if (!podeAdv1(member)) return message.reply('Apenas Supervisor+');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 1');
        if (!role) return message.reply('Cargo ADV STAFF 1 não existe');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(message.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 1', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return message.reply(`ADV1 dado a ${user.tag} por ${executor}`);
    }
    if (cmd === 'adv2') {
        if (!podeAdv2(member)) return message.reply('Apenas Coordenador+');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 2');
        if (!role) return message.reply('Cargo ADV STAFF 2 não existe');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(message.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 2', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return message.reply(`ADV2 dado a ${user.tag} por ${executor}`);
    }
    if (cmd === 'adv3') {
        if (!podeAdv3(member)) return message.reply('Apenas Líder');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const role = message.guild.roles.cache.find(r => r.name === 'ADV STAFF 3');
        if (!role) return message.reply('Cargo ADV STAFF 3 não existe');
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(message.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 3', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return message.reply(`ADV3 dado a ${user.tag} por ${executor}`);
    }
    if (cmd === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: ${PREFIX} | Slash: /`)
            .addFields(
                { name: '👑 Líder', value: '`ban`, `unban`, `adv3`', inline: true },
                { name: '⭐ Coordenador', value: '`adv2`, `mute`, `unmute`, `warn`', inline: true },
                { name: '🛡️ Supervisor', value: '`adv1`, `mute`, `unmute`, `warn`', inline: true },
                { name: '🔧 Admin', value: '`mute`, `unmute`, `warn`', inline: true },
                { name: '⭐ Todos', value: '`avaliar`, `media`, `ranking`', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
});

// Modal de avaliação
client.on('interactionCreate', async i => {
    if (i.isModalSubmit() && i.customId === 'avaliarModal') {
        const staffNome = i.fields.getTextInputValue('staff');
        const nota = parseInt(i.fields.getTextInputValue('nota'));
        const motivo = i.fields.getTextInputValue('motivo');
        if (isNaN(nota) || nota < 1 || nota > 10) return i.reply({ content: '❌ Nota 1-10', ephemeral: true });
        const canal = i.guild.channels.cache.find(c => c.name === 'avaliacoes-staffs');
        if (!canal) return i.reply({ content: '❌ Canal #avaliacoes-staffs não encontrado', ephemeral: true });
        const idMatch = staffNome.match(/\d+/g);
        let membro = null;
        if (idMatch) try { membro = await i.guild.members.fetch(idMatch[0]); } catch(e) {}
        const key = idMatch ? idMatch[0] : staffNome;
        if (!avaliacoes.has(key)) avaliacoes.set(key, []);
        avaliacoes.get(key).push({ nota, motivo, avaliador: i.user.tag, data: new Date() });
        const media = avaliacoes.get(key).reduce((a,b)=>a+b.nota,0)/avaliacoes.get(key).length;
        const embed = new EmbedBuilder().setColor(nota>=7?0x00FF00:nota>=4?0xFFA500:0xFF0000).setTitle('⭐ NOVA AVALIAÇÃO')
            .addFields(
                { name: 'Staff', value: membro ? `${membro}` : staffNome, inline: true },
                { name: 'Avaliador', value: i.user.tag, inline: true },
                { name: 'Nota', value: `${nota}/10\n${barraNota(nota)}`, inline: false },
                { name: 'Feedback', value: motivo, inline: false },
                { name: 'Média', value: `${media.toFixed(1)}/10`, inline: true }
            ).setTimestamp();
        await canal.send({ embeds: [embed] });
        return i.reply({ content: '✅ Avaliação enviada!', ephemeral: true });
    }
    if (!i.isChatInputCommand()) return;
    const cmd = i.commandName;
    const executor = i.user.tag;
    const member = i.member;

    if (cmd === 'avaliar') {
        const modal = new ModalBuilder().setCustomId('avaliarModal').setTitle('⭐ Avaliar Staff');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('staff').setLabel('Staff (@ ou nome)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota').setLabel('Nota (1 a 10)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return i.showModal(modal);
    }
    if (cmd === 'media') {
        const staff = i.options.getMember('staff');
        const avs = avaliacoes.get(staff.id);
        if (!avs || !avs.length) return i.reply({ content: `${staff} sem avaliações`, ephemeral: true });
        const media = avs.reduce((a,b)=>a+b.nota,0)/avs.length;
        return i.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle(`Média de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length}`)], ephemeral: true });
    }
    if (cmd === 'ranking') {
        const rank = Array.from(avaliacoes.entries()).map(([id,list])=>({id,media:list.reduce((a,b)=>a+b.nota,0)/list.length,total:list.length})).sort((a,b)=>b.media-a.media).slice(0,10);
        if (!rank.length) return i.reply({ content: 'Nenhuma avaliação', ephemeral: true });
        let desc = '';
        for (let r of rank) {
            const m = await i.guild.members.fetch(r.id).catch(()=>null);
            desc += `${rank.indexOf(r)+1}. ${m ? m.user.tag : r.id} - ${r.media.toFixed(1)}/10 (${r.total})\n`;
        }
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING').setDescription(desc)], ephemeral: true });
    }

    if (getNivel(member) === 0) return i.reply({ content: '❌ Sem permissão', ephemeral: true });

    if (cmd === 'ban') {
        if (!podeBan(member)) return i.reply({ content: 'Apenas Líder', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        await i.guild.members.ban(user.id, { reason: motivo });
        await sendLog(i.guild, 'punicao-discord', logEmbed('🔨 BAN', 0xFF0000, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} banido por ${executor}`, ephemeral: true });
    }
    if (cmd === 'unban') {
        if (!podeUnban(member)) return i.reply({ content: 'Apenas Líder', ephemeral: true });
        const id = i.options.getString('id');
        const motivo = i.options.getString('motivo');
        try {
            await i.guild.members.unban(id);
            await sendLog(i.guild, 'punicao-discord', logEmbed('✅ DESBAN', 0x00FF00, [{ name: 'ID', value: id }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
            i.reply({ content: `Usuário ${id} desbanido por ${executor}`, ephemeral: true });
        } catch { i.reply({ content: 'ID inválido', ephemeral: true }); }
        return;
    }
    if (cmd === 'banlist') {
        if (!podeBan(member)) return i.reply({ content: 'Sem permissão', ephemeral: true });
        const bans = await i.guild.bans.fetch();
        if (!bans.size) return i.reply({ content: 'Nenhum banido', ephemeral: true });
        const lista = bans.map(ban => `${ban.user.tag} (${ban.user.id}) - ${ban.reason || 'Sem motivo'}`).join('\n');
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0,4000))], ephemeral: true });
    }
    if (cmd === 'mute') {
        if (!podeMute(member)) return i.reply({ content: 'Sem permissão', ephemeral: true });
        const user = i.options.getUser('usuario');
        const tempo = i.options.getInteger('tempo');
        const motivo = i.options.getString('motivo');
        const target = await i.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        await sendLog(i.guild, 'punicao-discord', logEmbed('🔇 MUTE', 0xFFA500, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Tempo', value: `${tempo} min` }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} mutado ${tempo} min por ${executor}`, ephemeral: true });
    }
    if (cmd === 'unmute') {
        if (!podeMute(member)) return i.reply({ content: 'Sem permissão', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const target = await i.guild.members.fetch(user.id);
        await target.timeout(null);
        await sendLog(i.guild, 'punicao-discord', logEmbed('🔊 DESMUTE', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `${user.tag} desmutado por ${executor}`, ephemeral: true });
    }
    if (cmd === 'warn') {
        if (!podeWarn(member)) return i.reply({ content: 'Sem permissão', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason: motivo, moderator: executor, date: new Date() });
        await sendLog(i.guild, 'punicao-discord', logEmbed('⚠️ WARN', 0xFFA500, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }, { name: 'Total', value: `${warns.get(user.id).length}` }]));
        return i.reply({ content: `Warn em ${user.tag} por ${executor} | Total: ${warns.get(user.id).length}`, ephemeral: true });
    }
    if (cmd === 'warns') {
        if (!podeWarn(member)) return i.reply({ content: 'Sem permissão', ephemeral: true });
        const user = i.options.getUser('usuario');
        const list = warns.get(user.id);
        if (!list || !list.length) return i.reply({ content: `${user.tag} não tem warns`, ephemeral: true });
        const desc = list.map((w,idx)=>`${idx+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        return i.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle(`WARNS de ${user.tag}`).setDescription(desc)], ephemeral: true });
    }
    if (cmd === 'adv1') {
        if (!podeAdv1(member)) return i.reply({ content: 'Apenas Supervisor+', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 1');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 1 não existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 1', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV1 dado a ${user.tag} por ${executor}`, ephemeral: true });
    }
    if (cmd === 'adv2') {
        if (!podeAdv2(member)) return i.reply({ content: 'Apenas Coordenador+', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 2');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 2 não existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 2', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV2 dado a ${user.tag} por ${executor}`, ephemeral: true });
    }
    if (cmd === 'adv3') {
        if (!podeAdv3(member)) return i.reply({ content: 'Apenas Líder', ephemeral: true });
        const user = i.options.getUser('usuario');
        const motivo = i.options.getString('motivo');
        const role = i.guild.roles.cache.find(r => r.name === 'ADV STAFF 3');
        if (!role) return i.reply({ content: 'Cargo ADV STAFF 3 não existe', ephemeral: true });
        const target = await i.guild.members.fetch(user.id);
        await target.roles.add(role);
        await sendLog(i.guild, 'punicao-discord', logEmbed('🏷️ ADV STAFF 3', 0x00FF00, [{ name: 'Usuário', value: `${user.tag} (${user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: motivo }]));
        return i.reply({ content: `ADV3 dado a ${user.tag} por ${executor}`, ephemeral: true });
    }
    if (cmd === 'ajuda') {
        const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📚 Atlas RP - Slash')
            .addFields(
                { name: '👑 Líder', value: '/ban, /unban, /adv3', inline: true },
                { name: '⭐ Coordenador', value: '/adv2, /mute, /unmute, /warn', inline: true },
                { name: '🛡️ Supervisor', value: '/adv1, /mute, /unmute, /warn', inline: true },
                { name: '🔧 Admin', value: '/mute, /unmute, /warn', inline: true },
                { name: '⭐ Todos', value: '/avaliar, /media, /ranking', inline: true }
            );
        return i.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);
