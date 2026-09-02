require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    PermissionFlagsBits,
    ApplicationCommandOptionType
} = require('discord.js');

const express = require('express');

const app = express();

app.get('/', (req, res) => {
    res.send('🤖 Bot Middleman & Soporte - Activo 24/7');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Servidor Express iniciado.');
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.User
    ]
});

// ============================================================
// IDS DE CANALES
// ============================================================

const CANAL_PANEL_MIDDLEMAN = '1498096496992845834';
const CANAL_LOGS_ID = '1542284565714968586';
const CANAL_RESENAS_ID = '1535036437865566348';

// ============================================================
// ROLES
// ============================================================

const ROLE_MIDDLEMAN_ID = '1499596482322501802';

// Este rol será el único rol de Staff que podrá
// continuar viendo los tickets reclamados.
const ROLE_STAFF_TICKETS_ID = '1517988091653259364';

const ROLES_STAFF_IDS = [
    '1499596482322501802', // Middleman
    '1517988091653259364', // Staff
    '1499595987411406998', // Moderador
    '1499606642898112612', // Administrador
    '1499597074642243686', // Co-Owner
    '1498106196589154334'  // Dueño
];

const ROLES_SOPORTE_IDS = [
    '1517988091653259364', // Staff
    '1499595987411406998', // Moderador
    '1499606642898112612', // Administrador
    '1499597074642243686', // Co-Owner
    '1498106196589154334'  // Dueño
];

// ============================================================
// BASES DE DATOS
// ============================================================

const ticketsBD = new Map();
const resenasBD = new Map();

let contadorMiddleman = 1;
let contadorSoporte = 1;

// ============================================================
// ESTILOS
// ============================================================

const BTN_STYLE = {
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4
};

// ============================================================
// FECHA
// ============================================================

function formatearFecha(fecha) {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();

    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

// ============================================================
// COMPROBAR STAFF
// ============================================================

function esStaff(member) {
    if (!member) return false;

    return (
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        ROLES_STAFF_IDS.some(
            rolId => member.roles.cache.has(rolId)
        )
    );
}

// ============================================================
// COMPROBAR STAFF SUPERIOR A MIDDLEMAN
// ============================================================

function esStaffSuperior(member) {
    if (!member) return false;

    return (
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        ROLES_SOPORTE_IDS.some(
            rolId => member.roles.cache.has(rolId)
        )
    );
}

// ============================================================
// READY
// ============================================================

client.once('ready', async () => {

    console.log(`✅ Bot conectado como: ${client.user.tag}`);

    try {

        await client.application.commands.set([

            {
                name: 'panel_middleman',
                description: 'Enviar el panel de Middleman (Solo Admin)'
            },

            {
                name: 'panel_soporte',
                description: 'Enviar el panel de Soporte General (Solo Admin)'
            },

            {
                name: 'añadir',
                description: 'Añadir un usuario al ticket',
                default_member_permissions:
                    PermissionFlagsBits.ManageChannels.toString(),

                options: [
                    {
                        name: 'usuario',
                        description: 'Usuario a añadir al ticket',
                        type: ApplicationCommandOptionType.User,
                        required: true
                    }
                ]
            },

            {
                name: 'force_ticket',
                description: 'Forzar el cierre del ticket sin necesidad de reseña'
            },

            {
                name: 'reseñar',
                description: 'Calificar al Middleman asignado al ticket',

                options: [
                    {
                        name: 'usuario',
                        description: 'Selecciona al Middleman asignado',
                        type: ApplicationCommandOptionType.User,
                        required: true
                    },

                    {
                        name: 'estrellas',
                        description: 'Calificación de 1 a 5',
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                        min_value: 1,
                        max_value: 5
                    },

                    {
                        name: 'comentario',
                        description: 'Comentario u opinión',
                        type: ApplicationCommandOptionType.String,
                        required: false
                    }
                ]
            },

            {
                name: 'reseñas',
                description: 'Ver todas las reseñas de un usuario',

                options: [
                    {
                        name: 'usuario',
                        description: 'Usuario a consultar',
                        type: ApplicationCommandOptionType.User,
                        required: true
                    }
                ]
            },

            {
                name: 'repuntuaciones',
                description: 'Muestra el Top 10 de mejores calificaciones'
            },

            {
                name: 'spin',
                description: 'Ruleta del perdón 50/50'
            }

        ]);

        console.log('🤖 Comandos Slash registrados correctamente.');

    } catch (err) {

        console.error(
            '❌ Error al registrar comandos:',
            err
        );

    }
});

// ============================================================
// INTERACTIONS
// ============================================================

client.on('interactionCreate', async interaction => {

    // ========================================================
    // COMANDOS SLASH
    // ========================================================

    if (interaction.isChatInputCommand()) {

        const {
            commandName,
            options,
            channel,
            user,
            member,
            guild
        } = interaction;

        // ====================================================
        // PANEL MIDDLEMAN
        // ====================================================

        if (commandName === 'panel_middleman') {

            if (
                !member.permissions.has(
                    PermissionFlagsBits.Administrator
                )
            ) {

                return interaction.reply({
                    content: '❌ Solo administradores.',
                    ephemeral: true
                });

            }

            const embedPanel = new EmbedBuilder()
                .setTitle('🤝 Servicio Oficial de Middleman')
                .setColor(0x2ECC71)
                .setDescription(
                    '¿Quieres hacer tus trades, ventas, pvps, confiables pero no sabes como?, pues nosotros tenemos un equipo de intermediarios que te ayudará en todo lo necesario para que tus trades, ventas y pvps sean 100% legales. Están 100% recomendados por la comunidad. Los intermediarios, más conocidos como middleman, estarán siempre disponibles cuando necesites ayuda.\n\n' +
                    'Haz clic en el botón para solicitar un **Middleman** oficial para tu transacción.'
                )
                .setFooter({
                    text: 'Sistema de Tickets'
                })
                .setTimestamp();

            const filaBoton =
                new ActionRowBuilder().addComponents(

                    new ButtonBuilder()
                        .setCustomId('ticket_middleman')
                        .setLabel('middleman')
                        .setEmoji('🎟️')
                        .setStyle(BTN_STYLE.SUCCESS)

                );

            await interaction.channel.send({
                embeds: [embedPanel],
                components: [filaBoton]
            });

            return interaction.reply({
                content: '✅ Panel enviado correctamente.',
                ephemeral: true
            });
        }

        // ====================================================
        // PANEL SOPORTE
        // ====================================================

        if (commandName === 'panel_soporte') {

            if (
                !member.permissions.has(
                    PermissionFlagsBits.Administrator
                )
            ) {

                return interaction.reply({
                    content: '❌ Solo administradores.',
                    ephemeral: true
                });

            }

            const embedSoporte = new EmbedBuilder()
                .setTitle('🛠️ Centro de Soporte y Atención')
                .setColor(0x3498DB)
                .setDescription(
                    '¡Hola! ¿Te gustaría solucionar algún problema, resolver alguna pregunta o reportar algo? Te invito a abrir un ticket de soporte para que nuestro equipo de staff te ayude.\n\n' +
                    'Recuerda que el staff siempre intentará estar a disposición para ayudar a todos los miembros que lo necesiten. También pedimos no abrir un ticket sin razón o para molestar. Los miembros del staff darán lo mejor para mantener un excelente ambiente entre todos.\n\n' +
                    'Esperamos que le hayas prestado atención a esto. Si deseas abrir un ticket, ¡te invitamos a seleccionarlo abajo!'
                )
                .setFooter({
                    text: 'Sistema de Soporte'
                })
                .setTimestamp();

            const filaBotonesSoporte =
                new ActionRowBuilder().addComponents(

                    new ButtonBuilder()
                        .setCustomId('ticket_soporte')
                        .setLabel('soporte')
                        .setEmoji('🎟️')
                        .setStyle(BTN_STYLE.DANGER),

                    new ButtonBuilder()
                        .setCustomId('ticket_pregunta')
                        .setLabel('pregunta')
                        .setEmoji('👀')
                        .setStyle(BTN_STYLE.PRIMARY),

                    new ButtonBuilder()
                        .setCustomId('ticket_ayuda')
                        .setLabel('ayuda')
                        .setEmoji('⚠️')
                        .setStyle(BTN_STYLE.SUCCESS),

                    new ButtonBuilder()
                        .setCustomId('ticket_reportar')
                        .setLabel('reportar')
                        .setEmoji('❌')
                        .setStyle(BTN_STYLE.DANGER)

                );

            await interaction.channel.send({
                embeds: [embedSoporte],
                components: [filaBotonesSoporte]
            });

            return interaction.reply({
                content: '✅ Panel de soporte enviado correctamente.',
                ephemeral: true
            });
        }

        // ====================================================
        // AÑADIR
        // ====================================================

        if (commandName === 'añadir') {

            const esTicket =
                channel.name.startsWith('ticket-') ||
                ticketsBD.has(channel.id);

            if (!esTicket) {

                return interaction.reply({
                    content:
                        '❌ Este comando solo funciona dentro de un ticket activo.',
                    ephemeral: true
                });

            }

            if (!esStaff(member)) {

                return interaction.reply({
                    content:
                        '❌ Solo un **Middleman o superior** puede añadir usuarios al ticket.',
                    ephemeral: true
                });

            }

            const usuarioAAñadir =
                options.getUser('usuario');

            try {

                await channel.permissionOverwrites.edit(
                    usuarioAAñadir.id,
                    {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true
                    }
                );

                return interaction.reply({
                    content:
                        `✅ ${usuarioAAñadir} ha sido añadido al ticket.`
                });

            } catch (err) {

                console.error(err);

                return interaction.reply({
                    content:
                        '❌ Error al intentar dar permisos al usuario.',
                    ephemeral: true
                });

            }
        }

        // ====================================================
        // FORCE TICKET
        // ====================================================

        if (commandName === 'force_ticket') {

            const datos =
                ticketsBD.get(channel.id);

            const esCanalTicket =
                channel.name.startsWith('ticket-') ||
                !!datos;

            if (!esCanalTicket) {

                return interaction.reply({
                    content:
                        '❌ Este comando solo se puede usar dentro de un canal de ticket.',
                    ephemeral: true
                });

            }

            const tienePermisoStaff =
                esStaff(member);

            if (!tienePermisoStaff) {

                return interaction.reply({
                    content:
                        '❌ Solo el Staff o Administradores pueden forzar el cierre de un ticket.',
                    ephemeral: true
                });

            }

            await interaction.reply({
                content:
                    '⚠️ **Cierre forzado iniciado.** Guardando log y borrando canal en 5 segundos...'
            });

            const creadorMencion =
                datos?.creador
                    ? `<@${datos.creador.id}>`
                    : 'Desconocido';

            const atendidoMencion =
                datos?.reclamadoPor
                    ? `<@${datos.reclamadoPor.id}>`
                    : 'Sin reclamar';

            const fechaApertura =
                datos?.fechaApertura
                    ? formatearFecha(datos.fechaApertura)
                    : 'Desconocida';

            const embedLog =
                new EmbedBuilder()
                    .setTitle(
                        `📋 Log - ${channel.name} (Cierre Forzado)`
                    )
                    .setColor(0xE74C3C)
                    .addFields(

                        {
                            name: '👤 Creador',
                            value: creadorMencion,
                            inline: true
                        },

                        {
                            name: '📌 Atendido por',
                            value: atendidoMencion,
                            inline: true
                        },

                        {
                            name: '🔒 Cerrado por',
                            value:
                                `<@${user.id}> (Forzado)`,
                            inline: true
                        },

                        {
                            name: '🕒 Creado',
                            value: fechaApertura,
                            inline: false
                        },

                        {
                            name: '⏰ Cerrado',
                            value:
                                formatearFecha(new Date()),
                            inline: false
                        }

                    )
                    .setFooter({
                        text:
                            'Ticket cerrado mediante /force_ticket'
                    })
                    .setTimestamp();

            const canalLogs =
                guild.channels.cache.get(CANAL_LOGS_ID);

            if (canalLogs) {

                await canalLogs.send({
                    embeds: [embedLog]
                });

            }

            setTimeout(
                async () => {

                    ticketsBD.delete(channel.id);

                    await channel
                        .delete()
                        .catch(() => {});

                },
                5000
            );

            return;
        }

        // ====================================================
        // SPIN
        // ====================================================

        if (commandName === 'spin') {

            const esPerdonado =
                Math.random() < 0.5;

            const embedRuleta =
                new EmbedBuilder()
                    .setTitle('🎰 Ruleta del Perdón')
                    .setColor(
                        esPerdonado
                            ? 0x2ECC71
                            : 0xE74C3C
                    )
                    .setDescription(
                        `**Juzgando a:** ${user}\n\n` +
                        `**Resultado:** ${
                            esPerdonado
                                ? 'PERDONADO 🟢'
                                : 'NO PERDONADO 🔴'
                        }`
                    );

            return interaction.reply({
                embeds: [embedRuleta]
            });
        }

        // ====================================================
        // RESEÑAR
        // ====================================================

        if (commandName === 'reseñar') {

            const datos =
                ticketsBD.get(channel.id);

            const esCanalTicket =
                channel.name.startsWith(
                    'ticket-middleman-'
                ) ||
                !!datos;

            if (!esCanalTicket) {

                return interaction.reply({
                    content:
                        '❌ Este comando solo se puede utilizar dentro de un ticket activo de Middleman.',
                    ephemeral: true
                });

            }

            if (datos && datos.tipo !== 'middleman') {

                return interaction.reply({
                    content:
                        '❌ Las reseñas solo pueden hacerse en tickets de Middleman.',
                    ephemeral: true
                });

            }

            const objetivo =
                options.getUser('usuario');

            const origen =
                '🎟️ Ticket';

            if (
                datos &&
                datos.reclamadoPor &&
                objetivo.id !==
                    datos.reclamadoPor.id
            ) {

                return interaction.reply({
                    content:
                        `❌ Solo puedes reseñar al Middleman asignado: <@${datos.reclamadoPor.id}>.`,
                    ephemeral: true
                });

            }

            if (
                datos &&
                user.id !==
                    datos.creador.id
            ) {

                return interaction.reply({
                    content:
                        '❌ Solo el creador del ticket puede hacer la reseña.',
                    ephemeral: true
                });

            }

            if (
                datos &&
                datos.resenaHecha
            ) {

                return interaction.reply({
                    content:
                        '❌ Ya has registrado tu reseña para este ticket.',
                    ephemeral: true
                });

            }

            const estrellas =
                options.getInteger('estrellas');

            const comentario =
                options.getString('comentario') ||
                'Sin comentario.';

            if (!resenasBD.has(objetivo.id)) {

                resenasBD.set(
                    objetivo.id,
                    []
                );

            }

            resenasBD
                .get(objetivo.id)
                .push({

                    autorId: user.id,
                    estrellas,
                    comentario,
                    tipoOrigen: origen

                });

            if (datos) {

                datos.resenaHecha = true;

            }

            const estrellasStr =
                '⭐'.repeat(estrellas);

            const embedResena =
                new EmbedBuilder()
                    .setTitle(
                        `⭐ Reseña Guardada (${origen})`
                    )
                    .setColor(0xF1C40F)
                    .setDescription(
                        `**Cliente:** ${user}\n` +
                        `**Middleman Reseñado:** ${objetivo}\n` +
                        `**Calificación:** ${estrellasStr} (${estrellas}/5)\n` +
                        `**Comentario:** ${comentario}`
                    )
                    .setTimestamp();

            return interaction.reply({
                embeds: [embedResena]
            });
        }

        // ====================================================
        // RESEÑAS
        // ====================================================

        if (commandName === 'reseñas') {

            if (
                channel.id !==
                CANAL_RESENAS_ID
            ) {

                return interaction.reply({
                    content:
                        `❌ Usa este comando únicamente en <#${CANAL_RESENAS_ID}>.`,
                    ephemeral: true
                });

            }

            const usuario =
                options.getUser('usuario');

            const lista =
                resenasBD.get(usuario.id) || [];

            if (lista.length === 0) {

                return interaction.reply({
                    content:
                        `ℹ️ El usuario ${usuario} aún no tiene reseñas.`
                });

            }

            const promedio =
                (
                    lista.reduce(
                        (acc, r) =>
                            acc + r.estrellas,
                        0
                    ) /
                    lista.length
                ).toFixed(1);

            let texto = '';

            lista
                .slice(-10)
                .forEach((r, i) => {

                    const tagOrigen =
                        r.tipoOrigen ||
                        '⭐ General';

                    texto +=
                        `**${i + 1}.** [${tagOrigen}] Por <@${r.autorId}> - ${'⭐'.repeat(r.estrellas)}\n` +
                        `> *${r.comentario}*\n\n`;

                });

            const embedHistorial =
                new EmbedBuilder()
                    .setTitle(
                        `⭐ Historial Global de Reseñas - ${usuario.username}`
                    )
                    .setColor(0xF1C40F)
                    .setThumbnail(
                        usuario.displayAvatarURL({
                            dynamic: true
                        })
                    )
                    .setDescription(
                        `**Promedio Global:** ${promedio} / 5.0 ⭐\n` +
                        `**Total de Reseñas:** ${lista.length}\n\n` +
                        texto
                    )
                    .setFooter({
                        text:
                            'Reseñas consolidadas de Tickets y Subastas'
                    })
                    .setTimestamp();

            return interaction.reply({
                embeds: [embedHistorial]
            });
        }

        // ====================================================
        // REPUNTUACIONES
        // ====================================================

        if (
            commandName === 'repuntuaciones'
        ) {

            if (
                resenasBD.size === 0
            ) {

                return interaction.reply({
                    content:
                        'ℹ️ Aún no hay reseñas registradas en la base de datos.'
                });

            }

            const listaUsuarios = [];

            resenasBD.forEach(
                (lista, usuarioId) => {

                    const total =
                        lista.length;

                    const promedio =
                        lista.reduce(
                            (acc, r) =>
                                acc + r.estrellas,
                            0
                        ) / total;

                    listaUsuarios.push({
                        usuarioId,
                        promedio,
                        total
                    });

                }
            );

            listaUsuarios.sort(
                (a, b) => {

                    if (
                        b.promedio !==
                        a.promedio
                    ) {

                        return (
                            b.promedio -
                            a.promedio
                        );

                    }

                    return (
                        b.total -
                        a.total
                    );

                }
            );

            const medallas =
                ['🥇', '🥈', '🥉'];

            let descripcionTop = '';

            const top10 =
                listaUsuarios.slice(0, 10);

            top10.forEach(
                (item, index) => {

                    const emojiMedalla =
                        medallas[index] ||
                        '🎖️';

                    const promFormat =
                        item.promedio.toFixed(1);

                    descripcionTop +=
                        `${emojiMedalla} **#${index + 1}** <@${item.usuarioId}>\n` +
                        `> **Calificación:** ${promFormat} / 5.0 ⭐ | **Reseñas:** ${item.total}\n\n`;

                }
            );

            const embedTop =
                new EmbedBuilder()
                    .setTitle(
                        '🏆 Top 10 Mejores Reseñados y Puntuaciones'
                    )
                    .setColor(0xF1C40F)
                    .setDescription(
                        descripcionTop
                    )
                    .setFooter({
                        text:
                            'Tabla de Clasificación de Middlemans y Staff'
                    })
                    .setTimestamp();

            return interaction.reply({
                embeds: [embedTop]
            });
        }
    }

    // ========================================================
    // BOTONES
    // ========================================================

    if (interaction.isButton()) {

        const {
            customId,
            guild,
            user,
            channel,
            member
        } = interaction;

        // ====================================================
        // CREAR TICKET MIDDLEMAN
        // ====================================================

        if (
            customId ===
            'ticket_middleman'
        ) {

            await interaction.deferReply({
                ephemeral: true
            });

            const nombreCanal =
                `ticket-middleman-${contadorMiddleman++}`;

            const permissionOverwrites = [

                {
                    id: guild.roles.everyone.id,
                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                },

                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles
                    ]
                }

            ];

            ROLES_STAFF_IDS.forEach(
                rolId => {

                    permissionOverwrites.push({

                        id: rolId,

                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AttachFiles
                        ]

                    });

                }
            );

            try {

                const ticketChannel =
                    await guild.channels.create({

                        name: nombreCanal,
                        type: 0,
                        permissionOverwrites

                    });

                ticketsBD.set(
                    ticketChannel.id,
                    {

                        tipo: 'middleman',
                        creador: user,
                        reclamadoPor: null,
                        fechaApertura: new Date(),
                        resenaHecha: false

                    }
                );

                const filaBotonesTicket =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    'btn_reclamar'
                                )
                                .setLabel(
                                    'Reclamar Ticket'
                                )
                                .setEmoji('📜')
                                .setStyle(
                                    BTN_STYLE.SECONDARY
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'btn_cerrar'
                                )
                                .setLabel(
                                    'Cerrar Ticket'
                                )
                                .setEmoji('🔒')
                                .setStyle(
                                    BTN_STYLE.DANGER
                                )

                        );

                const embedBienvenida =
                    new EmbedBuilder()
                        .setTitle(
                            '🎟️ Ticket de MIDDLEMAN'
                        )
                        .setColor(0x2ECC71)
                        .setDescription(
                            `${user} abrió un ticket para **middleman**. Un miembro del staff te atenderá en breve.`
                        )
                        .setFooter({
                            text:
                                'Sistema de Tickets'
                        })
                        .setTimestamp();

                const mencionesRoles =
                    ROLES_STAFF_IDS.map(id => `<@&${id}>`).join(' ');

                await ticketChannel.send({
                    content: `${user} ${mencionesRoles}`,
                    embeds: [embedBienvenida],
                    components: [filaBotonesTicket]
                });

                return interaction.editReply({
                    content: `✅ Tu ticket ha sido creado: ${ticketChannel}`
                });

            } catch (err) {
                console.error(err);
                return interaction.editReply({
                    content: '❌ Hubo un error al crear el ticket.'
                });
            }
        }

        // ====================================================
        // CREAR TICKET SOPORTE / OTROS
        // ====================================================

        if (
            customId === 'ticket_soporte' ||
            customId === 'ticket_pregunta' ||
            customId === 'ticket_ayuda' ||
            customId === 'ticket_reportar'
        ) {

            await interaction.deferReply({
                ephemeral: true
            });

            const tipoTicket = customId.replace('ticket_', '');
            const nombreCanal = `ticket-${tipoTicket}-${contadorSoporte++}`;

            const permissionOverwrites = [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ];

            ROLES_SOPORTE_IDS.forEach(rolId => {
                permissionOverwrites.push({
                    id: rolId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles
                    ]
                });
            });

            try {

                const ticketChannel = await guild.channels.create({
                    name: nombreCanal,
                    type: 0,
                    permissionOverwrites
                });

                ticketsBD.set(ticketChannel.id, {
                    tipo: tipoTicket,
                    creador: user,
                    reclamadoPor: null,
                    fechaApertura: new Date(),
                    resenaHecha: false
                });

                const filaBotonesTicket = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('btn_reclamar')
                            .setLabel('Reclamar Ticket')
                            .setEmoji('📜')
                            .setStyle(BTN_STYLE.SECONDARY),
                        new ButtonBuilder()
                            .setCustomId('btn_cerrar')
                            .setLabel('Cerrar Ticket')
                            .setEmoji('🔒')
                            .setStyle(BTN_STYLE.DANGER)
                    );

                const embedBienvenida = new EmbedBuilder()
                    .setTitle(`🎟️ Ticket de Soporte (${tipoTicket.toUpperCase()})`)
                    .setColor(0x3498DB)
                    .setDescription(`${user} abrió un ticket de tipo **${tipoTicket}**. El equipo de soporte te atenderá en breve.`)
                    .setFooter({ text: 'Sistema de Soporte' })
                    .setTimestamp();

                const mencionesSoporte = ROLES_SOPORTE_IDS.map(id => `<@&${id}>`).join(' ');

                await ticketChannel.send({
                    content: `${user} ${mencionesSoporte}`,
                    embeds: [embedBienvenida],
                    components: [filaBotonesTicket]
                });

                return interaction.editReply({
                    content: `✅ Tu ticket ha sido creado: ${ticketChannel}`
                });

            } catch (err) {
                console.error(err);
                return interaction.editReply({
                    content: '❌ Hubo un error al crear el ticket.'
                });
            }
        }

        // ====================================================
        // RECLAMAR TICKET
        // ====================================================

        if (customId === 'btn_reclamar') {

            if (!esStaff(member)) {
                return interaction.reply({
                    content: '❌ Solo el Staff puede reclamar tickets.',
                    ephemeral: true
                });
            }

            const datos = ticketsBD.get(channel.id);
            if (datos && datos.reclamadoPor) {
                return interaction.reply({
                    content: `❌ Este ticket ya fue reclamado por <@${datos.reclamadoPor.id}>.`,
                    ephemeral: true
                });
            }

            if (datos) {
                datos.reclamadoPor = user;
            }

            try {
                // Modificar permisos del canal para que solo el staff asignado/superior y el creador tengan acceso
                if (datos && datos.creador) {
                    await channel.permissionOverwrites.edit(user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true
                    });
                }

                const embedReclamado = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setDescription(`📌 **Ticket reclamado por:** ${user}`);

                return interaction.reply({
                    embeds: [embedReclamado]
                });

            } catch (err) {
                console.error(err);
                return interaction.reply({
                    content: '❌ Hubo un error al reclamar el ticket.',
                    ephemeral: true
                });
            }
        }

        // ====================================================
        // CERRAR TICKET
        // ====================================================

        if (customId === 'btn_cerrar') {

            const datos = ticketsBD.get(channel.id);
            const esCreador = datos && datos.creador && user.id === datos.creador.id;

            if (!esStaff(member) && !esCreador) {
                return interaction.reply({
                    content: '❌ No tienes permisos para cerrar este ticket.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '🔒 **Cerrando ticket...** Guardando log y borrando canal en 5 segundos...'
            });

            const creadorMencion = datos?.creador ? `<@${datos.creador.id}>` : 'Desconocido';
            const atendidoMencion = datos?.reclamadoPor ? `<@${datos.reclamadoPor.id}>` : 'Sin reclamar';
            const fechaApertura = datos?.fechaApertura ? formatearFecha(datos.fechaApertura) : 'Desconocida';

            const embedLog = new EmbedBuilder()
                .setTitle(`📋 Log - ${channel.name}`)
                .setColor(0x3498DB)
                .addFields(
                    { name: '👤 Creador', value: creadorMencion, inline: true },
                    { name: '📌 Atendido por', value: atendidoMencion, inline: true },
                    { name: '🔒 Cerrado por', value: `<@${user.id}>`, inline: true },
                    { name: '🕒 Creado', value: fechaApertura, inline: false },
                    { name: '⏰ Cerrado', value: formatearFecha(new Date()), inline: false }
                )
                .setFooter({ text: 'Sistema de Tickets' })
                .setTimestamp();

            const canalLogs = guild.channels.cache.get(CANAL_LOGS_ID);
            if (canalLogs) {
                await canalLogs.send({ embeds: [embedLog] }).catch(() => {});
            }

            setTimeout(async () => {
                ticketsBD.delete(channel.id);
                await channel.delete().catch(() => {});
            }, 5000);

            return;
        }
    }
});

client.login(process.env.TOKEN);
