// backend/sockets/socketManager.js

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// ==============================================================
// MAPA DE CLIENTS CONNECTATS
// Estructura: { socketId: { userId, username, rol, indicatiuId? } }
// ==============================================================
const clientsConnectats = new Map();

// ==============================================================
// MIDDLEWARE D'AUTENTICACIÓ PER A WEBSOCKETS
// Verifica el JWT en el handshake abans de permetre la connexió
// ==============================================================
const middlewareAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token no proporcionat'));
    }

    // Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adjuntar info de l'usuari al socket
    socket.usuari = {
      userId: decoded.userId,
      username: decoded.username,
      rol: decoded.rol,
    };

    console.log(`✅ Autenticació WS exitosa: ${decoded.username} (${decoded.rol})`);
    next();
  } catch (error) {
    console.error('❌ Error autenticant WebSocket:', error.message);
    next(new Error('Token invàlid o expirat'));
  }
};

// ==============================================================
// GESTIÓ DE ROOMS PER ROL
// Els operadors es connecten a "sala_control"
// Les patrulles a "patrulla_[indicatiuId]"
// ==============================================================
const assignarRoom = (socket) => {
  const { rol, userId, username } = socket.usuari;

  if (rol === 'operador_sala' || rol === 'administrador') {
    socket.join('sala_control');
    console.log(`📍 ${username} unit a sala_control`);
  } else if (rol === 'patrulla') {
    // En el futur, aquí rebrem l'indicatiuId del handshake
    // De moment, usem el userId com a identificador temporal
    const roomPatrulla = `patrulla_${userId}`;
    socket.join(roomPatrulla);
    console.log(`📍 ${username} unit a ${roomPatrulla}`);
  }
};

// ==============================================================
// INICIALITZAR SOCKET.IO
// S'executa quan arranquem el servidor HTTP
// ==============================================================
export const inicialitzarSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Opcions de reconnexió
    pingTimeout: 60000, // 60s abans de considerar desconnectat
    pingInterval: 25000, // Envia ping cada 25s
  });

  // Aplicar middleware d'autenticació
  io.use(middlewareAuth);

  // ==============================================================
  // EVENT: CONNECTION
  // S'executa cada cop que un client es connecta
  // ==============================================================
  io.on('connection', (socket) => {
    const { userId, username, rol } = socket.usuari;

    console.log('='.repeat(50));
    console.log(`🔌 Nova connexió WebSocket`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Usuari: ${username} (${rol})`);
    console.log(`   User ID: ${userId}`);
    console.log('='.repeat(50));

    // Registrar client connectat
    clientsConnectats.set(socket.id, {
      userId,
      username,
      rol,
      connectat: new Date().toISOString(),
    });

    // Assignar a la room corresponent
    assignarRoom(socket);

    // Enviar confirmació al client
    socket.emit('connexio_exitosa', {
      missatge: 'Connexió WebSocket establerta correctament',
      usuari: { username, rol },
      timestamp: new Date().toISOString(),
    });

    // Notificar a la sala de control que hi ha un nou client
    io.to('sala_control').emit('client_connectat', {
      username,
      rol,
      timestamp: new Date().toISOString(),
    });

    // ==============================================================
    // EVENT: DISCONNECT
    // S'executa quan un client es desconnecta
    // ==============================================================
    socket.on('disconnect', (reason) => {
      console.log('='.repeat(50));
      console.log(`❌ Desconnexió WebSocket`);
      console.log(`   Usuari: ${username}`);
      console.log(`   Motiu: ${reason}`);
      console.log('='.repeat(50));

      // Eliminar del registre
      clientsConnectats.delete(socket.id);

      // Notificar a la sala
      io.to('sala_control').emit('client_desconnectat', {
        username,
        rol,
        motiu: reason,
        timestamp: new Date().toISOString(),
      });
    });

    // ==============================================================
    // EVENT: HEARTBEAT/PING (opcional, Socket.io ja ho gestiona)
    // Permet detectar connexions "zombi"
    // ==============================================================
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Event per debugging: veure clients connectats
    socket.on('clients_connectats', () => {
      const llista = Array.from(clientsConnectats.values());
      socket.emit('llista_clients', {
        total: llista.length,
        clients: llista,
      });
    });
  });

  console.log('✅ Socket.io inicialitzat correctament');

  // Retornar la instància io per usar-la en altres parts (controladors)
  return io;
};

// ==============================================================
// GETTER PER OBTENIR LA INSTÀNCIA IO DES DE CONTROLADORS
// ==============================================================
let ioInstance = null;

export const setIOInstance = (io) => {
  ioInstance = io;
};

export const getIOInstance = () => {
  if (!ioInstance) {
    throw new Error('Socket.io no ha estat inicialitzat');
  }
  return ioInstance;
};