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
const CANAL_LOGS_ID = '1505339523473735822';
const CANAL_RESENAS_ID = '1535036437865566348';

// ============================================================
// ROLES
// ============================================================

// Middleman
const ROLE_MIDDLEMAN_ID = '1499596482322501802';

// Todos los roles Staff
const ROLES_STAFF_IDS = [
    '1499596482322501802', // Middleman
    '1517988091653259364', // Staff
    '1499595987411406998', // Moderador
    '1499606642898112612', // Administrador
    '1499597074642243686', // Co-Owner
    '1498106196589154334'  // Dueño
];

// Roles que pueden ver tickets de soporte.
// IMPORTANTE: Middleman NO está incluido aquí.
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
// ESTILOS DE BOTONES
// ============================================================

const BTN_STYLE = {
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4
};

// ============================================================
// FORMATEAR FECHA
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
// READY
// ============================================================

client.on('ready', async () => {

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
                description: 'Añadir al comprador/vendedor al ticket (Solo Middlemans en adelante)',
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
                        description: 'Calificación (1 a 5)',
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
                description: 'Ver todas las reseñas de un usuario (Tickets y Subastas)',

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
                description:
                    'Muestra el Top 10 de mejores calificaciones y puntuaciones de los miembros'
            },

            {
                name: '',
                description: 'Ruleta de perdón 50/50'
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

            const esStaff =
                ROLES_STAFF_IDS.some(
                    rolId =>
                        member.roles.cache.has(rolId)
                ) ||
                member.permissions.has(
                    PermissionFlagsBits.Administrator
                );

            if (!esStaff) {

                return interaction.reply({
                    content:
                        '❌ Solo un **Middleman** o rol superior puede añadir usuarios al ticket.',
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
                ROLES_STAFF_IDS.some(
                    rolId =>
                        member.roles.cache.has(rolId)
                ) ||
                member.permissions.has(
                    PermissionFlagsBits.Administrator
                );

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
                    ? formatearFecha(
                        datos.fechaApertura
                    )
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
                                formatearFecha(
                                    new Date()
                                ),
                            inline: false
                        }

                    )
                    .setFooter({
                        text:
                            'Ticket cerrado mediante /force_ticket'
                    })
                    .setTimestamp();

            const canalLogs =
                guild.channels.cache.get(
                    CANAL_LOGS_ID
                );

            if (canalLogs) {

                await canalLogs.send({
                    embeds: [embedLog]
                });

            }

            setTimeout(
                async () => {

                    ticketsBD.delete(
                        channel.id
                    );

                    await channel
                        .delete()
                        .catch(() => {});

                },
                5000
            );

            return;
        }

        // ====================================================
        // P
        // ====================================================

        if (commandName === '') {

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
                ticketsBD.get(
                    channel.id
                );

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
                options.getInteger(
                    'estrellas'
                );

            const comentario =
                options.getString(
                    'comentario'
                ) ||
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
                '⭐'.repeat(
                    estrellas
                );

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
                options.getUser(
                    'usuario'
                );

            const lista =
                resenasBD.get(
                    usuario.id
                ) || [];

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
                            acc +
                            r.estrellas,
                        0
                    ) /
                    lista.length
                ).toFixed(1);

            let texto = '';

            lista
                .slice(-10)
                .forEach(
                    (r, i) => {

                        const tagOrigen =
                            r.tipoOrigen ||
                            '⭐ General';

                        texto +=
                            `**${i + 1}.** [${tagOrigen}] Por <@${r.autorId}> - ${'⭐'.repeat(r.estrellas)}\n` +
                            `> *${r.comentario}*\n\n`;

                    }
                );

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
            commandName ===
            'repuntuaciones'
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
                                acc +
                                r.estrellas,
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
                listaUsuarios.slice(
                    0,
                    10
                );

            top10.forEach(
                (item, index) => {

                    const emojiMedalla =
                        medallas[index] ||
                        '🎖️';

                    const promFormat =
                        item.promedio.toFixed(
                            1
                        );

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
            channel
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

            // Todos los Staff pueden ver Middleman
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
                        .setColor(
                            0x2ECC71
                        )
                        .setDescription(
                            `${user} abrió un ticket para **middleman**. Un miembro del staff te atenderá en breve.`
                        )
                        .setFooter({
                            text:
                                'Sistema de Tickets'
                        })
                        .setTimestamp();

                const mencionesRoles =
                    ROLES_STAFF_IDS
                        .map(
                            id =>
                                `<@&${id}>`
                        )
                        .join(' ');

                await ticketChannel.send({

                    content:
                        `${user} ${mencionesRoles}`,

                    embeds: [
                        embedBienvenida
                    ],

                    components: [
                        filaBotonesTicket
                    ]

                });

                return interaction.editReply({

                    content:
                        `✅ Ticket creado en: ${ticketChannel}`

                });

            } catch (err) {

                console.error(err);

                return interaction.editReply({

                    content:
                        '❌ Error al crear canal.'

                });

            }
        }

        // ====================================================
        // CREAR TICKET SOPORTE
        // ====================================================

        if (
            [
                'ticket_soporte',
                'ticket_pregunta',
                'ticket_ayuda',
                'ticket_reportar'
            ].includes(customId)
        ) {

            await interaction.deferReply({
                ephemeral: true
            });

            const detallesCategorias = {

                ticket_soporte: {
                    nombre: 'soporte',
                    emoji: '🎫',
                    titulo: 'Ticket de SOPORTE',
                    color: 0xE74C3C
                },

                ticket_pregunta: {
                    nombre: 'pregunta',
                    emoji: '❓',
                    titulo: 'Ticket de PREGUNTA',
                    color: 0x3498DB
                },

                ticket_ayuda: {
                    nombre: 'ayuda',
                    emoji: '⚠️',
                    titulo: 'Ticket de AYUDA',
                    color: 0x2ECC71
                },

                ticket_reportar: {
                    nombre: 'reportar',
                    emoji: '🚨',
                    titulo: 'Ticket de REPORTE',
                    color: 0x95A5A6
                }

            };

            const info =
                detallesCategorias[
                    customId
                ];

            const nombreCanal =
                `ticket-${info.nombre}-${contadorSoporte++}`;

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
                },

                // Middleman queda EXPLÍCITAMENTE bloqueado
                {
                    id: ROLE_MIDDLEMAN_ID,
                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                }

            ];

            // Staff, Moderador, Admin, Co-Owner y Dueño
            // pueden ver los tickets de soporte.
            ROLES_SOPORTE_IDS.forEach(
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

                        tipo: info.nombre,
                        creador: user,
                        reclamadoPor: null,
                        fechaApertura: new Date(),

                        // Soporte no necesita reseña
                        resenaHecha: true

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
                            `${info.emoji} ${info.titulo}`
                        )
                        .setColor(
                            info.color
                        )
                        .setDescription(
                            `${user} abrió un ticket para **${info.nombre}**. Un miembro del staff te atenderá en breve.`
                        )
                        .setFooter({
                            text:
                                'Sistema de Soporte'
                        })
                        .setTimestamp();

                const mencionesRoles =
                    ROLES_SOPORTE_IDS
                        .map(
                            id =>
                                `<@&${id}>`
                        )
                        .join(' ');

                await ticketChannel.send({

                    content:
                        `${user} ${mencionesRoles}`,

                    embeds: [
                        embedBienvenida
                    ],

                    components: [
                        filaBotonesTicket
                    ]

                });

                return interaction.editReply({

                    content:
                        `✅ Ticket de ${info.nombre} creado en: ${ticketChannel}`

                });

            } catch (err) {

                console.error(err);

                return interaction.editReply({

                    content:
                        '❌ Error al crear el canal de ticket.'

                });

            }
        }

        // ====================================================
        // RECLAMAR TICKET
        // ====================================================

        if (
            customId ===
            'btn_reclamar'
        ) {

            const datos =
                ticketsBD.get(
                    channel.id
                );

            if (!datos) {

                return interaction.reply({

                    content:
                        '❌ Datos de ticket no encontrados.',

                    ephemeral: true

                });

            }

            // =================================================
            // COMPROBAR SI ES ADMIN
            // =================================================

            const esAdministrador =
                interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                );

            // =================================================
            // COMPROBAR ROLES
            // =================================================

            const tieneRolStaff =
                ROLES_STAFF_IDS.some(
                    rolId =>
                        interaction.member.roles.cache.has(
                            rolId
                        )
                );

            if (
                !tieneRolStaff &&
                !esAdministrador
            ) {

                return interaction.reply({

                    content:
                        '❌ No tienes permiso para reclamar este ticket.',

                    ephemeral: true

                });

            }

            // =================================================
            // COMPROBAR TIPO DE TICKET
            // =================================================

            const esTicketSoporte = [

                'soporte',
                'pregunta',
                'ayuda',
                'reportar'

            ].includes(
                datos.tipo
            );

            const esMiddleman =
                interaction.member.roles.cache.has(
                    ROLE_MIDDLEMAN_ID
                );

            // =================================================
            // COMPROBAR SI TIENE ROL SUPERIOR A MIDDLEMAN
            // =================================================

            const tieneRolSuperior =
                ROLES_SOPORTE_IDS.some(
                    rolId =>
                        interaction.member.roles.cache.has(
                            rolId
                        )
                );

            /*
                CASOS:

                Middleman solamente:
                esMiddleman = true
                tieneRolSuperior = false
                ❌ No puede soporte

                Middleman + Moderador:
                esMiddleman = true
                tieneRolSuperior = true
                ✅ Puede soporte

                Middleman + Staff:
                true + true
                ✅ Puede soporte

                Moderador solamente:
                false + true
                ✅ Puede soporte
            */

            if (
                esTicketSoporte &&
                esMiddleman &&
                !tieneRolSuperior &&
                !esAdministrador
            ) {

                return interaction.reply({

                    content:
                        '❌ Los Middleman sin un rol superior solo pueden reclamar tickets de **Middleman**.',

                    ephemeral: true

                });

            }

            // =================================================
            // YA RECLAMADO
            // =================================================

            if (datos.reclamadoPor) {

                return interaction.reply({

                    content:
                        `⚠️ Este ticket ya fue reclamado por ${datos.reclamadoPor}.`,

                    ephemeral: true

                });

            }

            // =================================================
            // GUARDAR QUIÉN LO RECLAMÓ
            // =================================================

            datos.reclamadoPor =
                user;

            try {

                // =================================================
                // TICKET DE SOPORTE
                // =================================================

                if (esTicketSoporte) {

                    /*
                        IMPORTANTE:

                        NO se elimina la visibilidad
                        del resto del Staff.

                        Por eso NO hacemos:

                        ViewChannel: false

                        para los demás roles.
                    */

                    // Middleman SOLO sigue sin poder verlo.
                    await channel.permissionOverwrites.edit(

                        ROLE_MIDDLEMAN_ID,

                        {
                            ViewChannel: false
                        }

                    ).catch(() => {});

                    // Todos los roles superiores
                    // mantienen acceso.
                    for (
                        const rolId
                        of ROLES_SOPORTE_IDS
                    ) {

                        await channel.permissionOverwrites.edit(

                            rolId,

                            {
                                ViewChannel: true,
                                SendMessages: true,
                                AttachFiles: true
                            }

                        ).catch(() => {});

                    }

                    // El creador mantiene acceso.
                    await channel.permissionOverwrites.edit(

                        datos.creador.id,

                        {
                            ViewChannel: true,
                            SendMessages: true,
                            AttachFiles: true
                        }

                    ).catch(() => {});

                }

                // =================================================
                // TICKET MIDDLEMAN
                // =================================================

                else {

                    /*
                        Cuando un ticket Middleman es reclamado,
                        se oculta para los demás Staff.
                    */

                    for (
                        const rolId
                        of ROLES_STAFF_IDS
                    ) {

                        await channel.permissionOverwrites.edit(

                            rolId,

                            {
                                ViewChannel: false
                            }

                        ).catch(() => {});

                    }

                    // El que reclamó mantiene acceso.
                    await channel.permissionOverwrites.edit(

                        user.id,

                        {
                            ViewChannel: true,
                            SendMessages: true,
                            AttachFiles: true
                        }

                    ).catch(() => {});

                    // El creador mantiene acceso.
                    await channel.permissionOverwrites.edit(

                        datos.creador.id,

                        {
                            ViewChannel: true,
                            SendMessages: true,
                            AttachFiles: true
                        }

                    ).catch(() => {});

                }

                // =================================================
                // ACTUALIZAR BOTÓN
                // =================================================

                const filaActualizada =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    'btn_reclamar'
                                )
                                .setLabel(
                                    'Ticket Reclamado'
                                )
                                .setEmoji('📜')
                                .setStyle(
                                    BTN_STYLE.SECONDARY
                                )
                                .setDisabled(true),

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

                await interaction.update({

                    components: [
                        filaActualizada
                    ]

                });

                // =================================================
                // MENSAJE DE RECLAMACIÓN
                // =================================================

                if (esTicketSoporte) {

                    return channel.send({

                        content:
                            `📌 **Ticket reclamado por ${user}.**\n` +
                            `👥 El ticket continúa visible para todo el Staff autorizado.`

                    });

                }

                return channel.send({

                    content:
                        `📌 **Reclamado por ${user}.**\n` +
                        `🔒 Solo el creador y el miembro del Staff que reclamó tienen acceso.`

                });

            } catch (error) {

                console.error(
                    '❌ Error al reclamar ticket:',
                    error
                );

            }
        }

        // ====================================================
        // CERRAR TICKET
        // ====================================================

        if (
            customId ===
            'btn_cerrar'
        ) {

            const datos =
                ticketsBD.get(
                    channel.id
                );

            if (!datos) {

                return interaction.reply({

                    content:
                        '❌ Datos no encontrados.',

                    ephemeral: true

                });

            }

            if (!datos.reclamadoPor) {

                return interaction.reply({

                    content:
                        '⚠️ Un encargado debe reclamar el ticket antes de cerrarlo.',

                    ephemeral: true

                });

            }

            // Middleman requiere reseña
            if (
                datos.tipo ===
                    'middleman' &&
                !datos.resenaHecha
            ) {

                return interaction.reply({

                    content:
                        `⚠️ **ESPERA** Antes de cerrar el ticket, <@${datos.creador.id}> debe reseñar a: <@${datos.reclamadoPor.id}>`,

                    ephemeral: false

                });

            }

            const btnConfirmar =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                'btn_confirmar_cierre'
                            )
                            .setLabel(
                                '⚠️ Confirmar Cierre'
                            )
                            .setStyle(
                                BTN_STYLE.DANGER
                            )

                    );

            return interaction.reply({

                content:
                    '❓ ¿Estás seguro de cerrar este ticket?',

                components: [
                    btnConfirmar
                ]

            });
        }

        // ====================================================
        // CONFIRMAR CIERRE
        // ====================================================

        if (
            customId ===
            'btn_confirmar_cierre'
        ) {

            const datos =
                ticketsBD.get(
                    channel.id
                );

            if (!datos) {

                return interaction.reply({

                    content:
                        '❌ Datos del ticket no encontrados.',

                    ephemeral: true

                });

            }

            await interaction.reply({

                content:
                    '🔒 Guardando log y cerrando en 5s...'

            });

            const embedLog =
                new EmbedBuilder()
                    .setTitle(
                        `📋 Log - ${channel.name}`
                    )
                    .setColor(
                        0x2ECC71
                    )
                    .addFields(

                        {
                            name: '👤 Creador',
                            value:
                                `<@${datos.creador.id}>`,
                            inline: true
                        },

                        {
                            name: '📌 Atendido por',
                            value:
                                `<@${datos.reclamadoPor.id}>`,
                            inline: true
                        },

                        {
                            name: '🔒 Cerrado por',
                            value:
                                `<@${user.id}>`,
                            inline: true
                        },

                        {
                            name: '🕒 Creado',
                            value:
                                formatearFecha(
                                    datos.fechaApertura
                                ),
                            inline: false
                        },

                        {
                            name: '⏰ Cerrado',
                            value:
                                formatearFecha(
                                    new Date()
                                ),
                            inline: false
                        }

                    )
                    .setTimestamp();

            const canalLogs =
                guild.channels.cache.get(
                    CANAL_LOGS_ID
                );

            if (canalLogs) {

                await canalLogs.send({

                    embeds: [
                        embedLog
                    ]

                });

            }

            setTimeout(
                async () => {

                    ticketsBD.delete(
                        channel.id
                    );

                    await channel
                        .delete()
                        .catch(() => {});

                },
                5000
            );
        }
    }
});

// ============================================================
// LOGIN
// ============================================================

client.login(
    process.env.TOKEN
);
