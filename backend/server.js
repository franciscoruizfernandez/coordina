// backend/server.js
import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { testConnection } from './config/database.js';
import { inicialitzarSocketIO, setIOInstance } from './sockets/socketManager.js';

import Usuari from './models/Usuari.js';
import Incidencia from './models/Incidencia.js';
import Indicatiu from './models/Indicatiu.js';

// Rutes
import authRoutes         from './routes/authRoutes.js';
import incidenciaRoutes   from './routes/incidenciaRoutes.js';
import indicatiuRoutes    from './routes/indicatiuRoutes.js';
import assignacioRoutes   from './routes/assignacioRoutes.js';
import tracabilitatRoutes from './routes/tracabilitatRoutes.js';
import missatgeRoutes from './routes/missatgeRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==============================================================
// CORS
// ==============================================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(new Error('No permès per CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ==============================================================
// MIDDLEWARE
// ==============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ==============================================================
// RUTES PÚBLIQUES
// ==============================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend COORDINA funcionant correctament',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    websockets: 'actiu', // 🆕 del segon
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API COORDINA - Sistema de Coordinació Operativa Policial',
    version: '1.0.0',
    websockets: 'Socket.io integrat', // 🆕 del segon
    endpoints: {
      health: '/health',
      api: '/api/v1',
      auth: '/api/auth',
      incidencies: '/api/incidencies',
      indicatius: '/api/indicatius',
      assignacions: '/api/assignacions',
      tracabilitat: '/api/tracabilitat',
      missatges: '/api/missatges',
    },
  });
});

// ==============================================================
// RUTES API
// ==============================================================
app.use('/api/auth',          authRoutes);
app.use('/api/incidencies',   incidenciaRoutes);
app.use('/api/indicatius',    indicatiuRoutes);
app.use('/api/assignacions',  assignacioRoutes);
app.use('/api/tracabilitat',  tracabilitatRoutes);
app.use('/api/missatges', missatgeRoutes);

// ==============================================================
// RUTES DE TEST (es mantenen)
// ==============================================================
app.get('/test/usuaris', async (req, res, next) => {
  try {
    const usuaris = await Usuari.llistarTots();
    res.json({ exit: true, total: usuaris.length, dades: usuaris });
  } catch (error) {
    next(error);
  }
});

app.get('/test/incidencies', async (req, res, next) => {
  try {
    const incidencies = await Incidencia.llistarTotes();
    res.json({ exit: true, total: incidencies.length, dades: incidencies });
  } catch (error) {
    next(error);
  }
});

app.get('/test/indicatius', async (req, res, next) => {
  try {
    const indicatius = await Indicatiu.llistarTots();
    res.json({ exit: true, total: indicatius.length, dades: indicatius });
  } catch (error) {
    next(error);
  }
});

app.get('/test/indicatius/disponibles', async (req, res, next) => {
  try {
    const disponibles = await Indicatiu.trobarDisponibles();
    res.json({ exit: true, total: disponibles.length, dades: disponibles });
  } catch (error) {
    next(error);
  }
});

// ==============================================================
// ERRORS
// ==============================================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ruta ${req.path} no trobada`,
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  res.status(err.statusCode || 500).json({
    error: true,
    message: err.message || 'Error intern del servidor',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==============================================================
// START SERVER
// ==============================================================
const startServer = async () => {
  try {
    console.log('🔌 Connectant a la base de dades...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error("❌ No s'ha pogut connectar a la BD");
      process.exit(1);
    }

    const io = inicialitzarSocketIO(httpServer);
    setIOInstance(io);

    httpServer.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 COORDINA Backend + WebSockets iniciat');
      console.log('='.repeat(50));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorn: ${NODE_ENV}`);
      console.log(`💾 Base de dades: Connectada`);
      console.log(`🔌 WebSockets: Socket.io actiu`);
      console.log(`⏰ Hora inici: ${new Date().toLocaleString()}`);
      console.log('='.repeat(50));
      console.log('Endpoints actius:');
      console.log('  /api/auth');
      console.log('  /api/incidencies');
      console.log('  /api/indicatius');
      console.log('  /api/assignacions');
      console.log('  /api/tracabilitat');
      console.log('  [WS] Socket.io → Temps real');
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Error iniciant el servidor:', error);
    process.exit(1);
  }
};

startServer();

// Shutdown
process.on('SIGTERM', () => {
  console.log('👋 Tancant servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Tancant servidor...');
  process.exit(0);
});

// token pruebas operador sala
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYTc1ZDQ3My0zOWNiLTQwMDMtYmY5ZC02OGE2YWNiZmNhY2IiLCJ1c2VybmFtZSI6Im9wZXJhZG9yMyIsInJvbCI6Im9wZXJhZG9yX3NhbGEiLCJpYXQiOjE3NzYzNTk1NjUsImV4cCI6MTc3NjQ0NTk2NX0.iwtK6D08qrOOv4JiZlRKbvSlpqHnj86nJcSEfZ4M-eU

// token pruebas patrulla
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NDU0MzY5OC1iMjY3LTRhMWEtOTIwOC1mNDU2NWVlOTczOWYiLCJ1c2VybmFtZSI6InBhdHJ1bGxhMTAxIiwicm9sIjoicGF0cnVsbGEiLCJpYXQiOjE3NzYzNzc2NDAsImV4cCI6MTc3NjQ2NDA0MH0.OrJ8PteCluC9SBrBqHZit5yeXkC0ePZFSxi86gPhBm4

// token pruebas admin
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNDRhODY1ZS1kYTY2LTRlODgtYjMyNC1kYWM4MjNkMDdhNmMiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImlhdCI6MTc3NjM3Nzg5OCwiZXhwIjoxNzc2NDY0Mjk4fQ.8GcbiM7LpFbNTLtHx1Vvbq64qpEeyEGf6e94aCBd1Ls 

// patrulla A101 77dad933-b69a-47cb-a287-3e7d81397f7d
// incidencia 19629233-7278-478e-8714-f8403ed3a34a
// assignacio f59dc659-88aa-41af-8ca9-d0649ce1f9b6