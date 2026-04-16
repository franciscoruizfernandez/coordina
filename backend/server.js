// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testConnection } from './config/database.js';

import authRoutes from './routes/authRoutes.js';
import incidenciaRoutes from './routes/incidenciaRoutes.js';

import Usuari from './models/Usuari.js';
import Incidencia from './models/Incidencia.js';
import Indicatiu from './models/Indicatiu.js';

// Carregar variables d'entorn
dotenv.config();

// Crear aplicació Express
const app = express();

// Configuració
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';




// ==============================================================
// CONFIGURACIÓ CORS
// ==============================================================

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
  origin: (origin, callback) => {
    // Permetre peticions sense origin (com Postman, curl, apps mòbils)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permès per CORS'));
    }
  },
  credentials: true, // Permetre cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));





// ==============================================================
// MIDDLEWARE BÀSICS
// ==============================================================

// 1. Body parser - Per llegir JSON i URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Logger simple per desenvolupament
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}





// ==============================================================
// RUTES
// ==============================================================

// Ruta de health check (verificar que el servidor funciona)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend COORDINA funcionant correctament',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Ruta arrel
app.get('/', (req, res) => {
  res.json({
    message: 'API COORDINA - Sistema de Coordinació Operativa Policial',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
    },
  });
});

// Rutes d'autenticació
app.use('/api/auth', authRoutes);

// Rutes d'incidencies
app.use('/api/incidencies', incidenciaRoutes);





// ==============================================================
// RUTES DE TEST (TEMPORALS)
// ==============================================================

// Test: Llistar tots els usuaris
app.get('/test/usuaris', async (req, res, next) => {
  try {
    const usuaris = await Usuari.llistarTots();
    res.json({
      exit: true,
      total: usuaris.length,
      dades: usuaris,
    });
  } catch (error) {
    next(error);
  }
});

// Test: Llistar totes les incidències
app.get('/test/incidencies', async (req, res, next) => {
  try {
    const incidencies = await Incidencia.llistarTotes();
    res.json({
      exit: true,
      total: incidencies.length,
      dades: incidencies,
    });
  } catch (error) {
    next(error);
  }
});

// Test: Llistar tots els indicatius
app.get('/test/indicatius', async (req, res, next) => {
  try {
    const indicatius = await Indicatiu.llistarTots();
    res.json({
      exit: true,
      total: indicatius.length,
      dades: indicatius,
    });
  } catch (error) {
    next(error);
  }
});

// Test: Llistar indicatius disponibles
app.get('/test/indicatius/disponibles', async (req, res, next) => {
  try {
    const disponibles = await Indicatiu.trobarDisponibles();
    res.json({
      exit: true,
      total: disponibles.length,
      dades: disponibles,
    });
  } catch (error) {
    next(error);
  }
});





// ==============================================================
// GESTIÓ D'ERRORS
// ==============================================================

// Ruta no trobada (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ruta ${req.path} no trobada`,
    path: req.path,
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error intern del servidor';

  res.status(statusCode).json({
    error: true,
    message: message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});





// ==============================================================
// INICIAR SERVIDOR
// ==============================================================

const startServer = async () => {
  try {
    // Provar connexió a BD abans d'arrencar el servidor
    console.log('🔌 Provant connexió a la base de dades...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ No s\'ha pogut connectar a la base de dades');
      console.error('💡 Verifica les credencials al fitxer .env');
      process.exit(1);
    }

    // Si la connexió és exitosa, arrencar el servidor
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Servidor COORDINA iniciat');
      console.log('='.repeat(50));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorn: ${NODE_ENV}`);
      console.log(`💾 Base de dades: Connectada`);
      console.log(`⏰ Hora inici: ${new Date().toLocaleString()}`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Error iniciant el servidor:', error);
    process.exit(1);
  }
};

startServer();

// Gestionar tancament graciós
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM rebut, tancant servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT rebut, tancant servidor...');
  process.exit(0);
});