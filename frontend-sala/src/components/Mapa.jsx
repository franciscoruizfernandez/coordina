import { useMemo, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  ScaleControl,
  Polyline,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import MarcadorIncidencia from "./MarcadorIncidencia";
import MarcadorIndicatiu from "./MarcadorIndicatiu";
import ControlsCapes from "./ControlsCapes";
import "leaflet/dist/leaflet.css";

// ─── Centre i zoom per defecte ──────────────────────────────
const CENTRE_INICIAL = [41.60, 2.30];
const ZOOM_INICIAL = 10;

// ─── Icona personalitzada per als clusters ──────────────────
const crearIconaCluster = (cluster) => {
  const count = cluster.getChildCount();

  let mida, color, borderColor, fontSize;

  if (count < 5) {
    mida = 40;
    color = "rgba(59, 130, 246, 0.85)";
    borderColor = "rgba(59, 130, 246, 0.4)";
    fontSize = 14;
  } else if (count < 15) {
    mida = 48;
    color = "rgba(245, 158, 11, 0.85)";
    borderColor = "rgba(245, 158, 11, 0.4)";
    fontSize = 15;
  } else if (count < 30) {
    mida = 54;
    color = "rgba(239, 68, 68, 0.85)";
    borderColor = "rgba(239, 68, 68, 0.4)";
    fontSize = 16;
  } else {
    mida = 60;
    color = "rgba(127, 29, 29, 0.9)";
    borderColor = "rgba(127, 29, 29, 0.4)";
    fontSize = 17;
  }

  return L.divIcon({
    html: `
      <div style="
        width: ${mida}px;
        height: ${mida}px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: ${color};
        border: 4px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        color: white;
        font-weight: 700;
        font-size: ${fontSize}px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
      ">
        ${count}
      </div>
    `,
    className: "",
    iconSize: L.point(mida, mida),
    iconAnchor: [mida / 2, mida / 2],
  });
};

// ─── Component intern: botó centrar mapa ────────────────────
function BotoCentrar() {
  const mapa = useMap();

  return (
    <button
      onClick={() => mapa.setView(CENTRE_INICIAL, ZOOM_INICIAL)}
      className="absolute bottom-12 right-3 z-[1000] bg-white rounded-lg
                 shadow-lg border border-gray-200 px-3 py-2 text-sm
                 font-medium text-gray-700 hover:bg-gray-50
                 transition-colors flex items-center gap-1"
      title="Centrar mapa a la posició inicial"
    >
      🎯 Centrar
    </button>
  );
}

// ─── Component intern: controlador d'enfoc per selecció ─────
function ControladorEnfoc({ focusMapa }) {
  const mapa = useMap();
  const lastSeqRef = useRef(0);

  useEffect(() => {
    // Només actuar si hi ha un seq nou
    if (!focusMapa || focusMapa.seq === lastSeqRef.current) return;

    const { lat, lon, seq } = focusMapa;

    // Validar que les coordenades siguin números finits
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // Marcar com processat
    lastSeqRef.current = seq;

    // Esperar un tick perquè el mapa estigui llest
    requestAnimationFrame(() => {
      try {
        mapa.flyTo([lat, lon], 12, {
          animate: true,
          duration: 0.8,
        });
      } catch (err) {
        console.warn('⚠️ Error fent flyTo:', err);
      }
    });
  }, [mapa, focusMapa]);

  return null;
}

// ─── Component principal ────────────────────────────────────
function Mapa({
  incidencies = [],
  indicatius = [],
  onSeleccionarIncidencia,
  onSeleccionarIndicatiu,
  incidenciaSeleccionada = null,
  indicatiuSeleccionat = null,
  filtres = {},
  onCanviFiltres,
  focusMapa = null,
  trajecteActiu = null,
}) {
  // ─── Filtrar incidències segons els controls ────────────────
  const incidenciesFiltrades = useMemo(() => {
    let resultat = [...incidencies];

    if (!filtres.mostrarTancades) {
      resultat = resultat.filter(
        (inc) => inc.estat !== 'tancada' && inc.estat !== 'resolta'
      );
    }

    if (filtres.prioritatMapa && filtres.prioritatMapa !== 'totes') {
      resultat = resultat.filter(
        (inc) => inc.prioritat === filtres.prioritatMapa
      );
    }

    return resultat;
  }, [incidencies, filtres.mostrarTancades, filtres.prioritatMapa]);

  // ─── Filtrar indicatius segons els controls ─────────────────
  const indicatiusFiltrats = useMemo(() => {
    let resultat = [...indicatius];

    if (!filtres.mostrarNoDisponibles) {
      resultat = resultat.filter(
        (ind) => ind.estat_operatiu !== 'no_disponible'
      );
    }

    return resultat;
  }, [indicatius, filtres.mostrarNoDisponibles]);

  // ─── Calcular línia de trajecte ─────────────────────────────
  const liniaTrajecte = useMemo(() => {
    // 1) Trajecte explícit (ve del botó "Veure detalls incidència")
    if (trajecteActiu) {
      const { origenLat, origenLon, destiLat, destiLon } = trajecteActiu;
      if ([origenLat, origenLon, destiLat, destiLon].every(Number.isFinite)) {
        return [
          [origenLat, origenLon],
          [destiLat, destiLon],
        ];
      }
    }

    // 2) Trajecte automàtic: indicatiu seleccionat amb incidència assignada
    if (indicatiuSeleccionat?.incidencia_assignada_id) {
      const ind = indicatiuSeleccionat;
      const inc = incidencies.find(
        (item) => String(item.id) === String(ind.incidencia_assignada_id)
      );

      if (inc) {
        const latInd = parseFloat(ind.ubicacio_lat);
        const lonInd = parseFloat(ind.ubicacio_lon);
        const latInc = parseFloat(inc.ubicacio_lat);
        const lonInc = parseFloat(inc.ubicacio_lon);

        if ([latInd, lonInd, latInc, lonInc].every(Number.isFinite)) {
          return [
            [latInd, lonInd],
            [latInc, lonInc],
          ];
        }
      }
    }

    return null;
  }, [trajecteActiu, indicatiuSeleccionat, incidencies]);

  return (
    <div className="relative w-full h-full">
      {/* ─── Controls de capes ──────────────────── */}
      {onCanviFiltres && (
        <ControlsCapes
          filtres={filtres}
          onCanviFiltres={onCanviFiltres}
        />
      )}

      {/* ─── Mapa ──────────────────────────────── */}
      <MapContainer
        center={CENTRE_INICIAL}
        zoom={ZOOM_INICIAL}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
          maxZoom={18}
          minZoom={10}
        />

        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <BotoCentrar />
        <ControladorEnfoc focusMapa={focusMapa} />

        {/* Línia de trajecte indicatiu → incidència */}
        {liniaTrajecte && (
          <Polyline
            positions={liniaTrajecte}
            pathOptions={{
              color: "#2563EB",
              weight: 4,
              opacity: 0.55,
              dashArray: "12 8",
              lineCap: "round",
            }}
          />
        )}

        {/* Incidències amb clustering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          zoomToBoundsOnClick={true}
          iconCreateFunction={crearIconaCluster}
        >
          {incidenciesFiltrades.map((incidencia) => (
            <MarcadorIncidencia
              key={incidencia.id}
              incidencia={incidencia}
              onSeleccionar={onSeleccionarIncidencia}
              seleccionat={incidenciaSeleccionada?.id === incidencia.id}
            />
          ))}
        </MarkerClusterGroup>

        {/* Indicatius sense clustering */}
        {indicatiusFiltrats.map((indicatiu) => (
          <MarcadorIndicatiu
            key={indicatiu.id}
            indicatiu={indicatiu}
            onSeleccionar={onSeleccionarIndicatiu}
            seleccionat={indicatiuSeleccionat?.id === indicatiu.id}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export default Mapa;