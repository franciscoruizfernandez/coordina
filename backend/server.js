// backend/server.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend COORDINA funcionant correctament' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor escoltant al port ${PORT}`);
});