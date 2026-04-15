// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

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

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Servidor COORDINA iniciat');
  console.log('='.repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Entorn: ${NODE_ENV}`);
  console.log(`⏰ Hora inici: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
});

// Gestionar tancament graciós
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM rebut, tancant servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT rebut, tancant servidor...');
  process.exit(0);
});