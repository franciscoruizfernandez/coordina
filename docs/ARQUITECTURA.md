# Arquitectura del Sistema COORDINA

## Sistema de Coordinació Operativa de Incidències i Assignació de Recursos Policials

**Versió**: 1.0  
**Data**: Abril 2026  
**Autor**: [El teu nom]

---

## 1. VISIÓ GENERAL DEL SISTEMA

COORDINA és un sistema distribuït client-servidor amb comunicació en temps real, dissenyat per gestionar i coordinar incidències policials a la Regió Policial Metropolitana Nord dels Mossos d'Esquadra.

### 1.1 Objectius principals

- Recepció i gestió centralitzada d'incidències provinents del 112
- Coordinació en temps real entre sala de control i patrulles desplegades
- Assignació automàtica i manual de recursos segons proximitat i disponibilitat
- Visualització geoespacial de la situació operativa
- Trazabilitat completa de totes les accions

---

## 2. ARQUITECTURA DE COMPONENTS

### 2.1 Diagrama d'arquitectura general

┌─────────────────────────────────────────────────────────────┐
│ SISTEMA 112 (SIMULADO)                                      │
│ Generador d'incidències                                     │
└────────────────────────┬────────────────────────────────────┘
│ HTTP REST API
▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND CENTRAL                                             │
│ (Node.js + Express)                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │    API REST  │ │  WebSockets  │ │ Autenticació │          │
│ │    Server    │ │    Server    │ │ (JWT + RBAC) │          │
│ │   (Express)  │ │  (Socket.io) │ │              │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│ ┌──────────────────────────────────────────────────┐        │
│ │ Lògica de Negoci                                 │        │
│ │ - Gestió d'incidències                           │        │
│ │ - Assignació de recursos (algoritme proximitat)  │        │
│ │ - Registre de trazabilitat                       │        │
│ │ - Gestió de missatges/chat                       │        │
│ └──────────────────────────────────────────────────┘        │
│                                                             │
│ Deploy: Render.com (Free Tier)                              │
└────────────────────────┬────────────────────────────────────┘
│
▼
┌──────────────────┐
│ BASE DE DADES    │
│ PostgreSQL       │
│ (Supabase)       │
│-----             │
│ - 8 taules       │
│ - RLS actiu      │
│ - Índexs         │
└──────────────────┘


     ┌────────────┴────────────┐
     │                         │
     ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│    SALA DE CONTROL   │   │    PATRULLES (PWA)   │
│  (Web Application)   │   │   (Progressive Web)  │
│                      │   │                      │
│ React + Vite         │   │ React + Vite         │
│ Leaflet.js (mapes)   │   │ Workbox (SW)         │
│ Socket.io-client     │   │ Geolocation API      │
│ TailwindCSS          │   │ Socket.io-client     │
│                      │   │ TailwindCSS          │
│ - Mapa interactiu    │   │                      │
│ - Llistat incidènc.  │   │ - Recepció assign.   │
│ - Assignació manual  │   │ - Actualitz. GPS     │
│ - Assignació auto.   │   │ - Canvi estat        │
│ - Visualitz. vídeo   │   │ - Chat amb sala      │
│ - Chat               │   │ - Instal·lable       │
│                      │   │                      │
│ Deploy: Vercel       │   │ Deploy: Vercel       │
└──────────────────────┘   └──────────────────────┘
          ▲                           ▲
          │                           │
          └──────── WebSockets ───────┘
             (Sincronització en temps real)

┌─────────────────────────────────────────────────────────────┐
│ SERVEIS COMPLEMENTARIS                                      │
├─────────────────────────────────────────────────────────────┤
│ - OpenStreetMap (tiles gratuïts per mapes)                  │
│ - YouTube / Cloudinary (streaming vídeo simulat)            │
│ - GitHub (repositori i CI/CD)                               │
│ - Taiga.io (gestió del projecte - Scrum)                    │
└─────────────────────────────────────────────────────────────┘


### 2.2 Components principals

#### Backend (Node.js + Express + Socket.io)
- **Responsabilitat**: Lògica de negoci, gestió de dades, comunicació temps real
- **Port**: 3000 (desenvolupament), configurable en producció
- **Tecnologies**: Express.js, Socket.io, pg (PostgreSQL client), JWT, bcrypt

#### Base de Dades (PostgreSQL a Supabase)
- **Responsabilitat**: Persistència estructurada, autenticació, RLS
- **Taules**: 8 taules principals (veure apartat 4)
- **Funcionalitats addicionals**: Auth integrat, Realtime subscriptions

#### Frontend Sala de Control (React SPA)
- **Responsabilitat**: Interfície per operadors, gestió visual incidències
- **Port**: 5173 (desenvolupament)
- **Característiques clau**: 
  - Mapa interactiu amb Leaflet.js
  - Actualització temps real via WebSockets
  - Assignació manual i automàtica
  - Visualització de streams de vídeo

#### Frontend Patrulles (PWA)
- **Responsabilitat**: App mòbil per patrulles, geolocalització
- **Port**: 5174 (desenvolupament)
- **Característiques clau**:
  - Instal·lable com a app nativa
  - Geolocalització automàtica cada 10s
  - Notificacions push
  - Service Workers per funcionament offline parcial

---

## 3. PATRONS ARQUITECTÒNICS

### 3.1 Arquitectura client-servidor distribuïda

El sistema segueix una arquitectura **client-servidor de 3 capes**:

1. **Capa de Presentació**: Frontends (Sala + Patrulles)
2. **Capa de Lògica de Negoci**: Backend (API REST + WebSockets)
3. **Capa de Dades**: PostgreSQL (Supabase)

### 3.2 Comunicació asíncrona bidireccional

- **REST API**: Per operacions CRUD (Create, Read, Update, Delete)
- **WebSockets (Socket.io)**: Per sincronització temps real
  - Events servidor → clients: `nueva_incidencia`, `ubicacion_indicativo`, etc.
  - Events clients → servidor: `actualizar_ubicacion`, `cambiar_estado_operativo`, etc.

### 3.3 Arquitectura orientada a esdeveniments

El sistema es basa en esdeveniments per mantenir la sincronització:

┌──────────────┐   ┌──────────────────────┐   ┌──────────────┐
│   BACKEND    │   │ SALA DE CONTROL      │   │   PATRULLA   │
└──────────────┘   └──────────────────────┘   └──────────────┘
        │                    │                         │
        │── nueva_incidencia ─►                        │
        │                    │                         │
        │── incidencia_asignada ─────────────────────► │
        │                    │                         │
        │◄──────── actualizar_ubicacion ───────────────│
        │                    │                         │
        │── ubicacion_indicativo ─────────────────────►│
        │                    │                         │


### 3.4 Progressive Web App (PWA)

L'aplicació de patrulles segueix el patró PWA:
- **Service Workers**: Cache d'assets estàtics
- **Manifest.json**: Metadades per instal·lació
- **Responsive**: Adaptable a mòbil/tablet
- **Offline-first** (parcial): Funcionalitat bàsica sense connexió

---

## 4. MODEL DE DADES

### 4.1 Diagrama Entitat-Relació

![Diagrama ER](./modelo_datos.png)

*(Nota: Incloure el diagrama creat a la US-003)*

### 4.2 Taules principals

#### usuarios
Gestió d'usuaris del sistema (operadors, patrulles, administradors).

**Camps clau**: `id`, `username`, `password_hash`, `rol`, `activo`

**Rols**: `operador_sala`, `patrulla`, `administrador`

#### incidencias
Registre de totes les incidències policials recibides.

**Camps clau**: `id`, `ubicacion_lat`, `ubicacion_lon`, `tipologia`, `prioridad`, `estado`

**Estats**: `nueva`, `asignada`, `en_curso`, `resuelta`, `cerrada`

**Prioritats**: `baja`, `media`, `alta`, `critica`

#### indicativos
Patrulles/unitats mòbils disponibles al territori.

**Camps clau**: `id`, `codigo`, `tipo_unidad`, `estado_operativo`, `ubicacion_lat`, `ubicacion_lon`

**Tipus unitat**: `coche`, `moto`, `furgon`

**Estats operatius**: `disponible`, `en_servicio`, `no_disponible`, `finalizado`

#### asignaciones
Relació entre incidències i indicatius (històric complet).

**Camps clau**: `id`, `incidencia_id` (FK), `indicativo_id` (FK), `modo_asignacion`, `timestamps`

#### eventos_trazabilidad
Log de totes les accions del sistema per auditoria.

**Camps clau**: `id`, `timestamp`, `tipo_evento`, `usuario_id`, `incidencia_id`, `descripcion`, `datos_adicionales` (JSON)

#### missatges
Sistema de chat/missatgeria sala ↔ patrulles.

**Camps clau**: `id`, `emisor_id` (FK), `destinatario_id` (FK), `incidencia_id` (FK), `contenido`, `leido`

#### streams_video
URLs de streams de vídeo associats.

**Camps clau**: `id`, `indicativo_id` (FK), `incidencia_id` (FK), `url_stream`, `tipo_fuente`, `activo`

**Tipus font**: `camara_vehiculo`, `drone`, `cctv`, `bodycam`

### 4.3 Relacions principals

- `indicativos.incidencia_asignada_id` → `incidencias.id` (1:1 o None)
- `asignaciones.incidencia_id` → `incidencias.id` (N:1)
- `asignaciones.indicativo_id` → `indicativos.id` (N:1)
- `eventos_trazabilidad.*_id` → Múltiples taules (N:1)
- `mensajes.emisor_id` / `destinatario_id` → `usuarios.id` (N:1)

---

## 5. FLUX DE DADES PRINCIPALS

### 5.1 Flux d'una incidència (cas d'ús complet)
Sistema 112 (simulat)
│
└─► POST /api/incidencias
│
▼
Backend crea registre BD
│
├─► Insereix a taula incidencias
├─► Registra event a eventos_trazabilidad
│
└─► Emetre WebSocket: nueva_incidencia
│
▼
Sala de Control rep event
│
├─► Afegeix marcador al mapa
├─► Mostra a llista d'incidències
│
└─► Operador decideix assignació
│
├─► Assignació MANUAL
│   └─► POST /api/asignaciones
│
└─► Assignació AUTOMÀTICA
    └─► POST /api/asignaciones/automatica
│
├─► Cerca indicatius disponibles
├─► Calcula distàncies (Haversine)
└─► Selecciona el més proper
│
▼
Backend crea assignació
│
├─► Insereix a asignaciones
├─► Actualitza incidencias.estado = 'asignada'
├─► Actualitza indicativos.incidencia_asignada_id
│
└─► Emetre WebSocket: incidencia_asignada
│
├─► A Sala de Control
│   └─► Actualitza mapa
│
└─► A Patrulla específica
│
▼
PWA Patrulla rep notificació
│
├─► Mostra notificació push
├─► Vibra dispositiu
├─► So d'alerta
│
└─► Patrulla accepta
    └─► PATCH /api/asignaciones/:id/aceptar
│
▼
Patrulla envia GPS automàticament
│
└─► Cada 10s: socket.emit('actualizar_ubicacion')
│
├─► Backend actualitza indicativos.ubicacion_*
│
└─► Emetre a Sala: ubicacion_indicativo
    └─► Mapa actualitza posició marcador
│
▼
Patrulla finalitza servei
│
└─► PATCH /api/asignaciones/:id/finalizar
│
├─► Actualitza asignaciones.timestamp_finalizacion
├─► Canvia incidencias.estado = 'resuelta'
├─► Neteja indicativos.incidencia_asignada_id
│
└─► Emetre: cambio_estado_incidencia
    └─► Sala actualitza visualització
│
▼
Operador tanca incidència
│
└─► PATCH /api/incidencias/:id/estado
    └─► estado = 'cerrada'
│
└─► Registre complet a eventos_trazabilidad

### 5.2 Flux de geolocalització (temps real)

PWA Patrulla
│
└─► navigator.geolocation.watchPosition()
│
└─► Cada canvi de posició (o cada 10s)
│
└─► socket.emit('actualizar_ubicacion', {
│   indicativoId, lat, lon
│ })
│
▼
Backend
│
├─► Valida dades
├─► PATCH a indicativos (ubicacion_lat/lon)
├─► Actualitza ultima_actualizacion_gps
│
└─► socket.emit('ubicacion_indicativo', {
│   indicativoId, lat, lon})
│ 
│
▼
Sala de Control
│
└─► Actualitza posició marcador al mapa
    (en temps real, sense recarregar)


---

## 6. DECISIONS TÈCNIQUES JUSTIFICADES

### 6.1 Node.js + Express per al backend

**Decisió**: Utilitzar Node.js amb Express.js

**Justificació**:
- ✅ JavaScript a tot el stack (frontend i backend)
- ✅ Ecosistema npm molt ric
- ✅ Rendiment excel·lent per I/O (bases de dades, APIs)
- ✅ Socket.io s'integra perfectament (mateix llenguatge)
- ✅ Fàcil desplegament a plataformes gratuïtes (Render, Railway)
- ✅ Comunitat molt activa i documentació extensa

**Alternatives considerades**: Python (Flask/Django), Java (Spring Boot)
- Descartades per: Més complexitat, menor rendiment temps real (Python), més verbositat (Java)

### 6.2 PostgreSQL (Supabase) com a base de dades

**Decisió**: PostgreSQL gestionada amb Supabase

**Justificació**:
- ✅ Base de dades relacional robusta i madura
- ✅ Suport complet de ACID i transaccions
- ✅ Índexs eficients per consultes geoespacials
- ✅ Row Level Security (RLS) integrat
- ✅ Supabase ofereix: Auth, Realtime, Storage en un sol lloc
- ✅ Plan gratuït generós (500 MB BD, 1 GB transferència)
- ✅ API REST automàtica (útil per prototipatge ràpid)

**Alternatives considerades**: MongoDB, MySQL
- MongoDB: Descartada per necessitat de relacions complexes i transaccions
- MySQL: Descartada per menor suport de funcionalitats avançades (JSONB, RLS)

### 6.3 React per als frontends

**Decisió**: React.js amb Vite

**Justificació**:
- ✅ Llibreria més popular i amb més comunitat
- ✅ Component-based architecture (reutilització)
- ✅ Virtual DOM per rendiment òptim
- ✅ Ecosistema immens de llibreries (Leaflet, Router, etc.)
- ✅ Vite: Build tool ràpid (HMR instantani)
- ✅ Fàcil conversió a PWA amb plugins

**Alternatives considerades**: Vue.js, Angular, Svelte
- Vue: Descartada per menor ecosistema
- Angular: Descartada per complexitat i corba d'aprenentatge
- Svelte: Descartada per ecosistema més petit i menys maduresa

### 6.4 Socket.io per comunicació temps real

**Decisió**: Socket.io per WebSockets

**Justificació**:
- ✅ Abstracció sobre WebSockets amb fallback automàtic (long-polling)
- ✅ Suport de sales (rooms) per enviar events a grups
- ✅ Reconnexió automàtica
- ✅ Integració perfecta amb Express
- ✅ Molt fàcil d'usar (API simple)
- ✅ Ampliament provat en producció

**Alternatives considerades**: WebSockets natius, SSE (Server-Sent Events)
- WebSockets natius: Més complex, sense fallback automàtic
- SSE: Només unidireccional (servidor → client)

### 6.5 Leaflet.js per mapes

**Decisió**: Leaflet.js + OpenStreetMap

**Justificació**:
- ✅ Completament gratuït (0 costos, sense API keys)
- ✅ Open source i molt lleuger (38 KB)
- ✅ Plugins extensius (clustering, routing, heatmaps)
- ✅ OpenStreetMap: tiles gratuïts sense restriccions
- ✅ Fàcil integració amb React (react-leaflet)

**Alternatives considerades**: Google Maps, Mapbox
- Google Maps: Requereix API key, límits restrictius, costos
- Mapbox: Límits en plan gratuït (50k càrregues/mes)

### 6.6 TailwindCSS per estils

**Decisió**: TailwindCSS com a framework CSS

**Justificació**:
- ✅ Utility-first: desenvolupament molt ràpid
- ✅ No cal escriure CSS custom
- ✅ Bundle final optimitzat (només classes usades)
- ✅ Consistent design system
- ✅ Responsive design integrat

**Alternatives considerades**: Bootstrap, Material-UI, CSS pur
- Bootstrap: Més pesant, estils pre-definits menys flexibles
- Material-UI: Massa opinat, bundle més gran
- CSS pur: Més lent de desenvolupar, menys consistent

### 6.7 JWT per autenticació

**Decisió**: JSON Web Tokens per autenticació

**Justificació**:
- ✅ Stateless (no cal sessió al servidor)
- ✅ Escalable (no requereix memoria compartida)
- ✅ Fàcil d'implementar
- ✅ Standard de la industria
- ✅ Funciona perfectament amb API REST

**Alternatives considerades**: Sessions tradicionals, OAuth
- Sessions: Requereixen memòria al servidor, menys escalables
- OAuth: Massa complex per a aquest cas d'ús

### 6.8 Desplegament gratuït

**Decisió**: Render (backend) + Vercel (frontends) + Supabase (BD)

**Justificació**:
- ✅ 100% gratuït per prototips
- ✅ Deploy automàtic des de GitHub
- ✅ SSL/HTTPS inclòs
- ✅ Logs i monitorització bàsics
- ✅ Fàcil configuració (variables d'entorn via UI)

**Alternatives considerades**: Heroku, AWS, DigitalOcean
- Heroku: Plan gratuït eliminat
- AWS: Massa complex per configurar
- DigitalOcean: Requereix tarjeta de crèdit

---

## 7. SEGURETAT

### 7.1 Mesures implementades

#### Autenticació i Autorització
- **JWT** amb expiració (24h)
- **bcrypt** per hash de contrasenyes (10 salt rounds)
- **RBAC** (Role-Based Access Control): operador_sala, patrulla, administrador
- Middleware de verificació de token a totes les rutes protegides

#### Protecció del backend
- **Helmet.js**: Headers de seguretat HTTP
- **CORS** configurat estrictament (només dominis permesos)
- **Rate limiting**: Màxim 100 requests / 15 minuts per IP
- **express-validator**: Validació i sanitització d'inputs
- Protecció contra SQL injection (queries parametritzades amb `pg`)

#### Base de dades
- **Row Level Security (RLS)** a Supabase
  - Patrulles només veuen les seves assignacions
  - Operadors veuen tot
  - Administradors accés complet
- Contrasenyes SEMPRE hashejades (mai en text pla)
- Connexió sempre amb SSL/TLS

#### Comunicació
- **HTTPS** obligatori en producció (Vercel i Render)
- **WSS** (WebSocket Secure) per comunicacions temps real
- Tokens JWT enviats via headers (mai a URL)

### 7.2 Simulacions per al prototip

**Nota important**: Aquest és un prototip acadèmic. En producció real caldria:
- Xifrat end-to-end per missatges sensibles
- Autenticació de dos factors (2FA)
- Auditoria de seguretat professional
- Compliment GDPR complet
- Certificació ENS (Esquema Nacional de Seguretat)
- Backups automàtics xifrats

---

## 8. RENDIMENT I ESCALABILITAT

### 8.1 Optimitzacions implementades

#### Frontend
- **Code splitting**: Components carregats amb lazy loading
- **Memoització**: `React.memo`, `useMemo`, `useCallback`
- **Virtualització**: Llistes llargues amb `react-window` (si >100 items)
- **Clustering**: Agrupació de marcadors al mapa (Leaflet.markercluster)
- **Cache**: Service Workers (PWA) per assets estàtics
- **Bundle optimization**: Vite minifica i optimitza automàticament

#### Backend
- **Índexs BD**: A tots els camps de consulta freqüent
- **Queries optimitzades**: SELECT només camps necessaris
- **Connection pooling**: Reutilització de connexions a BD
- **Compressió**: Gzip per respostes HTTP

#### WebSockets
- **Rooms**: Només enviar events als clients rellevants
- **Throttling**: Limitar freqüència d'actualitzacions GPS (10s)
- **Heartbeat**: Detectar connexions mortes i netejar-les

### 8.2 Limitacions actuals

- **Plan gratuït Render**: Sleep després de 15 min inactivitat
  - Mitigació: Cron job que fa ping cada 10 min
- **Concurrència**: Testat fins a 20 connexions simultànies
  - Per producció caldria clustering o load balancing
- **Geolocalització**: Precisió depèn del dispositiu
  - Millor en mòbils que en ordinadors

### 8.3 Escalabilitat futura

Per escalar a producció real:
- **Horizontal scaling**: Múltiples instàncies del backend amb load balancer
- **Redis**: Per gestió de sessions i cache
- **CDN**: Cloudflare per servir assets estàtics
- **Microserveis**: Separar funcionalitats en serveis independents
- **Message queue**: RabbitMQ o Kafka per events asíncrons
- **Monitorització**: New Relic, Datadog o Sentry

---

## 9. TESTING

### 9.1 Estratègia de testing

#### Tests unitaris (Jest + Supertest)
- Funcions crítiques: càlcul distància Haversine
- Algoritme d'assignació automàtica
- Generació i validació de JWT
- Endpoints API (login, CRUD incidències)

**Objectiu**: >70% coverage en lògica crítica

#### Tests d'integració
- Flux complet: crear incidència → assignar patrulla → actualitzar estat
- Autenticació i autorització
- WebSockets bidireccionals

#### Tests E2E (Playwright/Cypress)
- Escenari complet simulat:
  1. Login operador
  2. Veure mapa amb incidències
  3. Assignar patrulla automàticament
  4. Login patrulla (altra finestra)
  5. Rebre assignació i acceptar
  6. Enviar missatge a sala
  7. Finalitzar servei

#### Tests de càrrega (Artillery/k6)
- 20 connexions WebSocket simultànies
- 50 requests/segon a API
- Mesura de latència i throughput

### 9.2 CI/CD

**GitHub Actions**: Tests automàtics en cada push

```yaml
# .github/workflows/test.yml
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test


