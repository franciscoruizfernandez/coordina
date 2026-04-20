// backend/config/database.js
import pg from 'pg';
import dotenv from 'dotenv';

// Carregar variables d'entorn
dotenv.config();

const { Pool } = pg;

// ==============================================================
// CONFIGURACIÓ DE LA CONNEXIÓ
// ==============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessari per Supabase
  },
  // Configuració del pool
  max: 20, // Màxim de connexions simultànies
  idleTimeoutMillis: 30000, // Temps abans de tancar connexió inactiva
  connectionTimeoutMillis: 2000, // Temps màxim per establir connexió
});

// ==============================================================
// EVENT LISTENERS
// ==============================================================

pool.on('connect', () => {
  console.log('✅ Nova connexió establerta amb PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperat a la connexió PostgreSQL:', err);
  process.exit(-1);
});

// ==============================================================
// FUNCIÓ PER PROVAR LA CONNEXIÓ
// ==============================================================

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('🎯 Connexió PostgreSQL exitosa!');
    console.log('⏰ Hora del servidor BD:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error connectant a PostgreSQL:', error.message);
    return false;
  }
};

// ==============================================================
// FUNCIÓ QUERY GENÈRICA
// ==============================================================

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executada:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Error en query:', error);
    throw error;
  }
};

// ==============================================================
// FUNCIONS AUXILIARS
// ==============================================================

// Obtenir un client del pool (per transaccions)
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Wrapper per fer log de queries
  client.query = (...args) => {
    console.log('🔍 Query del client:', args[0]);
    return query(...args);
  };

  return client;
};

// Tancar el pool (útil per testing o shutdown)
export const closePool = async () => {
  await pool.end();
  console.log('👋 Pool de connexions tancat');
};

// Exportar el pool per defecte
export default pool;