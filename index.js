const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Events, ChannelType, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
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
const PORT = process.env.PORT || 3000;

// Servidor web para o Render não reclamar de porta
const app = express();
app.get('/', (req, res) => res.send('Atlas RP Bot está online!'));
app.listen(PORT, () => console.log(`✅ Web server rodando na porta ${PORT}`));

const ADV_STAFF_ROLES = {
    'adv1': 'ADV STAFF 1',
    'adv2': 'ADV STAFF 2',
    'adv3': 'ADV STAFF 3'
};

const badWords = ['vadia', 'puta', 'caralho', 'merda', 'bosta', 'desgraça', 'fuder', 'foder', 'filho da puta', 'arrombado', 'viado', 'corno', 'pau no cu', 'cuzão', 'porra', 'cacete', 'krl', 'pkrl', 'fdp'];

const warns = new Map();
const avaliacoes = new Map();

function isStaff(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
           member.permissions.has(PermissionsBitField.Flags.KickMembers);
}

async function sendLog(guild, channelName, embed) {
    try {
        const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
        if (channel) await channel.send({ embeds: [embed] });
    } catch (error) {}
}

function createLogEmbed(title, description, color, fields = []) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
    fields.forEach(f => embed.addFields({ name: f.name, value: f.value, inline: f.inline || false }));
    return embed;
}

function barraNota(nota) {
    const total = 20;
    const preenchidos = Math.round((nota / 10) * total);
    return '▰'.repeat(preenchidos) + '▱'.repeat(total - preenchidos);
}

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
    { name: 'avaliar', description: 'Avaliar um staff (1 a 10)' },
    { name: 'media', description: 'Média de um staff', options: [{ name: 'staff', type: 6, required: true, description: 'Staff' }] },
    { name: 'ranking', description: 'Ranking dos staffs' },
    { name: 'ajuda', description: 'Mostrar comandos' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('📌 Registrando comandos slash...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Comandos slash registrados!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot ${c.user.tag} está online!`);
    client.user.setPresence({ activities: [{ name: 'Atlas RP | &ajuda', type: 0 }], status: 'online' });
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
        console.log('✅ Categoria LOGS criada');
    }
    
    const channels = [
        '📋・punição-discord', '🤖・logs-automod', '📥・logs-membros', 
        '🏷️・logs-cargos', '⚙️・logs-serve', '✏️・logs-mensagem'
    ];
    
    for (const name of channels) {
        if (!guild.channels.cache.find(c => c.name === name)) {
            await guild.channels.create({ name, type: ChannelType.GuildText, parent: logsCategory.id, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }] });
            console.log(`✅ Canal criado: ${name}`);
        }
    }
    
    console.log('🟢 Bot pronto para uso!');
});

client.on(Events.GuildMemberAdd, async (member) => {
    const embed = createLogEmbed('📥 MEMBRO ENTROU', `${member.user.tag} entrou no servidor`, 0x00FF00, [
        { name: '👤 Membro', value: `${member}`, inline: true },
        { name: '👥 Total', value: `${member.guild.memberCount}`, inline: true }
    ]);
    await sendLog(member.guild, '📥・logs-membros', embed);
    
    const dmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📥 Bem-vindo ao Atlas RP!')
        .setDescription(`Olá ${member.user}, seja bem-vindo!`)
        .addFields({
            name: '📌 LEIA AS REGRAS:',
            value: '🔹 Regras da Comunidade: https://discord.com/channels/1493042257861939372/1497661394936660049\n🔹 Regras In-Game: https://discord.com/channels/1493042257861939372/1497661392864411779',
            inline: false
        });
    await member.send({ embeds: [dmEmbed] }).catch(() => {});
});

client.on(Events.GuildMemberRemove, async (member) => {
    const embed = createLogEmbed('📤 MEMBRO SAIU', `${member.user.tag} saiu do servidor`, 0xFF0000, [
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
        if (content.includes(word)) {
            bloqueado = true;
            motivo = `Palavrão: ${word}`;
            break;
        }
    }
    
    if (content.includes('discord.gg/') || content.includes('discord.com/invite/')) {
        bloqueado = true;
        motivo = 'Link de servidor Discord';
    }
    
    if (bloqueado) {
        await message.delete();
        const embed = createLogEmbed('⚠️ AUTOMOD', `${message.author.tag} teve mensagem bloqueada`, 0xFF0000, [
            { name: '🚫 Motivo', value: motivo, inline: true },
            { name: '📝 Conteúdo', value: message.content.substring(0, 100), inline: false }
        ]);
        await sendLog(message.guild, '🤖・logs-automod', embed);
    }
});

// COMANDOS DE PREFIXO
client.on(Events.MessageCreate, async (message) => {
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
        const embed = createLogEmbed('🔨 BAN', `${user.tag} banido`, 0xFF0000, [{ name: '📝 Motivo', value: reason, inline: true }]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} banido!`);
    }
    
    else if (command === 'banlist') {
        const bans = await message.guild.bans.fetch();
        if (bans.size === 0) return message.reply('📋 Nenhum banido.');
        const lista = bans.map(ban => `🔨 ${ban.user.tag} - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000));
        message.reply({ embeds: [embed] });
    }
    
    else if (command === 'mute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const time = parseInt(args[1]);
        if (isNaN(time)) return message.reply('❌ Informe minutos!');
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(time * 60 * 1000, reason);
        const embed = createLogEmbed('🔇 MUTE', `${user.tag} mutado`, 0xFFA500, [
            { name: '⏱️ Tempo', value: `${time} min`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} mutado por ${time} min!`);
    }
    
    else if (command === 'unmute') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const target = await message.guild.members.fetch(user.id);
        await target.timeout(null);
        const embed = createLogEmbed('🔊 DESMUTE', `${user.tag} desmutado`, 0x00FF00, [{ name: '📝 Motivo', value: motivo, inline: true }]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${user.tag} desmutado!`);
    }
    
    else if (command === 'warn') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!warns.has(user.id)) warns.set(user.id, []);
        warns.get(user.id).push({ reason, moderator: message.author.tag, date: new Date() });
        const embed = createLogEmbed('⚠️ WARN', `${user.tag} advertido`, 0xFFA500, [
            { name: '📝 Motivo', value: reason, inline: true },
            { name: '📊 Total', value: `${warns.get(user.id).length}`, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ Warn aplicado! Total: ${warns.get(user.id).length}`);
    }
    
    else if (command === 'warns') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const userWarns = warns.get(user.id);
        if (!userWarns || userWarns.length === 0) return message.reply(`📋 ${user.tag} não tem warns.`);
        const lista = userWarns.map((w, i) => `${i+1} - ${w.reason} (por ${w.moderator})`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle(`📋 WARNS de ${user.tag}`).setDescription(lista);
        message.reply({ embeds: [embed] });
    }
    
    else if (command === 'adv1' || command === 'adv2' || command === 'adv3') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ Mencione um usuário!');
        const motivo = args.slice(1).join(' ') || 'Sem motivo';
        const roleName = ADV_STAFF_ROLES[command];
        const role = message.guild.roles.cache.find(r => r.name === roleName);
        if (!role) return message.reply(`❌ Cargo ${roleName} não existe!`);
        const target = await message.guild.members.fetch(user.id);
        await target.roles.add(role);
        const embed = createLogEmbed('🏷️ ADV STAFF', `${user.tag} recebeu ${roleName}`, 0x00FF00, [
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(message.guild, '📋・punição-discord', embed);
        message.reply(`✅ ${roleName} dado!`);
    }
    
    else if (command === 'avaliar') {
        const modal = new ModalBuilder()
            .setCustomId('avaliarModal')
            .setTitle('⭐ Avaliar Staff');
        
        const staffInput = new TextInputBuilder()
            .setCustomId('staff')
            .setLabel('👨‍✈️ Qual staff? (@ ou nome)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const notaInput = new TextInputBuilder()
            .setCustomId('nota')
            .setLabel('⭐ Nota (1 a 10)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const motivoInput = new TextInputBuilder()
            .setCustomId('motivo')
            .setLabel('📝 Feedback')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(staffInput),
            new ActionRowBuilder().addComponents(notaInput),
            new ActionRowBuilder().addComponents(motivoInput)
        );
        
        await message.showModal(modal);
    }
    
    else if (command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription(`Prefixo: ${PREFIX}`)
            .addFields(
                { name: '🔨 Moderação', value: '`ban`, `unban`, `banlist`, `mute`, `unmute`, `warn`, `warns`', inline: false },
                { name: '🏷️ ADV Staff', value: '`adv1`, `adv2`, `adv3`', inline: false },
                { name: '⭐ Avaliações', value: '`avaliar`, `media`, `ranking`', inline: false }
            );
        message.reply({ embeds: [embed] });
    }
});

// MODAL DE AVALIAÇÃO
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'avaliarModal') {
        const staffNome = interaction.fields.getTextInputValue('staff');
        const nota = parseInt(interaction.fields.getTextInputValue('nota'));
        const motivo = interaction.fields.getTextInputValue('motivo');
        
        if (isNaN(nota) || nota < 1 || nota > 10) {
            return interaction.reply({ content: '❌ Nota inválida! Use 1 a 10.', ephemeral: true });
        }
        
        const canalAvaliacoes = interaction.guild.channels.cache.find(c => c.name === 'avaliações-staffs');
        if (!canalAvaliacoes) {
            return interaction.reply({ content: '❌ Canal #avaliações-staffs não encontrado! Crie um canal com esse nome.', ephemeral: true });
        }
        
        const staffId = staffNome.match(/\d+/g);
        let staffUser = null;
        if (staffId) {
            try { staffUser = await interaction.guild.members.fetch(staffId[0]); } catch(e) {}
        }
        
        const key = staffId ? staffId[0] : staffNome;
        if (!avaliacoes.has(key)) avaliacoes.set(key, []);
        avaliacoes.get(key).push({ nota, motivo, avaliador: interaction.user.tag, data: new Date() });
        
        const media = avaliacoes.get(key).reduce((a, b) => a + b.nota, 0) / avaliacoes.get(key).length;
        
        const embed = new EmbedBuilder()
            .setColor(nota >= 7 ? 0x00FF00 : nota >= 4 ? 0xFFA500 : 0xFF0000)
            .setTitle('⭐ NOVA AVALIAÇÃO DE STAFF')
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

// SLASH COMMANDS
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!isStaff(interaction.member)) return interaction.reply({ content: '❌ Sem permissão!', ephemeral: true });
    
    const cmd = interaction.commandName;
    
    if (cmd === 'ban') {
        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');
        await interaction.guild.members.ban(user.id, { reason: motivo });
        const embed = createLogEmbed('🔨 BAN', `${user.tag} banido`, 0xFF0000, [{ name: '📝 Motivo', value: motivo, inline: true }]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ ${user.tag} banido!`, ephemeral: true });
    }
    
    else if (cmd === 'banlist') {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) return interaction.reply({ content: '📋 Nenhum banido.', ephemeral: true });
        const lista = bans.map(ban => `🔨 ${ban.user.tag} - ${ban.reason || 'Sem motivo'}`).join('\n');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📋 BANIDOS').setDescription(lista.substring(0, 4000));
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (cmd === 'mute') {
        const user = interaction.options.getUser('usuario');
        const tempo = interaction.options.getInteger('tempo');
        const motivo = interaction.options.getString('motivo');
        const target = await interaction.guild.members.fetch(user.id);
        await target.timeout(tempo * 60 * 1000, motivo);
        const embed = createLogEmbed('🔇 MUTE', `${user.tag} mutado`, 0xFFA500, [
            { name: '⏱️ Tempo', value: `${tempo} min`, inline: true },
            { name: '📝 Motivo', value: motivo, inline: true }
        ]);
        await sendLog(interaction.guild, '📋・punição-discord', embed);
        interaction.reply({ content: `✅ Mutado por ${tempo} min!`, ephemeral: true });
    }
    
    else if (cmd === 'media') {
        const staff = interaction.options.getMember('staff');
        const key = staff.id;
        const avs = avaliacoes.get(key);
        if (!avs || avs.length === 0) return interaction.reply({ content: `📋 ${staff} não tem avaliações.`, ephemeral: true });
        const media = avs.reduce((a, b) => a + b.nota, 0) / avs.length;
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`⭐ Média de ${staff.user.tag}`).setDescription(`${media.toFixed(1)}/10\n${barraNota(media)}\nTotal: ${avs.length} avaliações`);
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (cmd === 'ranking') {
        const ranking = Array.from(avaliacoes.entries()).map(([id, avs]) => ({ 
            id, 
            media: avs.reduce((a, b) => a + b.nota, 0) / avs.length, 
            total: avs.length 
        })).sort((a, b) => b.media - a.media).slice(0, 10);
        
        if (ranking.length === 0) return interaction.reply({ content: '📋 Nenhuma avaliação ainda.', ephemeral: true });
        
        let desc = '';
        for (let i = 0; i < ranking.length; i++) {
            let member = await interaction.guild.members.fetch(ranking[i].id).catch(() => null);
            desc += `**${i+1}.** ${member ? member.user.tag : ranking[i].id} - ${ranking[i].media.toFixed(1)}/10 (${ranking[i].total} avs)\n`;
        }
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 RANKING DE STAFFS').setDescription(desc);
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (cmd === 'ajuda') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Atlas RP - Comandos')
            .setDescription('`/ban`, `/unban`, `/banlist`, `/mute`, `/unmute`, `/warn`, `/warns`\n`/adv1`, `/adv2`, `/adv3`\n`/avaliar`, `/media`, `/ranking`');
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);
