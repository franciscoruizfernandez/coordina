// src/components/TempsRelatiu.jsx

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';

// ─── Formatar data completa per al tooltip ──────────────────
const formatarDataCompleta = (timestamp) => {
  if (!timestamp) return '';

  return new Date(timestamp).toLocaleString('ca-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ─── Calcular text relatiu ──────────────────────────────────
const calcularTextRelatiu = (timestamp) => {
  if (!timestamp) return '—';

  try {
    const data = new Date(timestamp);

    // Si la data és invàlida
    if (isNaN(data.getTime())) return '—';

    // Diferència en segons
    const difSegons = Math.floor((Date.now() - data.getTime()) / 1000);

    // Menys de 10 segons
    if (difSegons < 10) return 'Ara mateix';

    // Menys d'1 minut
    if (difSegons < 60) return `Fa ${difSegons}s`;

    // Usar date-fns per a la resta
    return 'Fa ' + formatDistanceToNow(data, {
      locale: ca,
      addSuffix: false,
    });
  } catch {
    return '—';
  }
};

// ==============================================================
// COMPONENT: TempsRelatiu
// Mostra "Fa X minuts" amb tooltip de data exacta
// S'actualitza automàticament cada 30 segons
// ==============================================================
function TempsRelatiu({ timestamp, className = '', prefix = '' }) {
  const [textRelatiu, setTextRelatiu] = useState(() =>
    calcularTextRelatiu(timestamp)
  );

  // ─── Actualitzar cada 30 segons ───────────────────────────
  useEffect(() => {
    if (!timestamp) return;

    // Actualitzar immediatament
    setTextRelatiu(calcularTextRelatiu(timestamp));

    // Interval per actualitzar
    const interval = setInterval(() => {
      setTextRelatiu(calcularTextRelatiu(timestamp));
    }, 30000); // cada 30 segons

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return <span className={className}>—</span>;

  return (
    <span
      className={`cursor-help ${className}`}
      title={formatarDataCompleta(timestamp)}
    >
      {prefix}{textRelatiu}
    </span>
  );
}

export default TempsRelatiu;