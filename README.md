# 🚔 COORDINA
## Sistema de Coordinació Operativa de Incidències i Assignació de Recursos Policials

> Plataforma integral de gestió i coordinació operativa d'incidències policials en temps real per a la Regió Policial Metropolitana Nord dels Mossos d'Esquadra

[![Estado del proyecto](https://img.shields.io/badge/estado-en%20desenvolupament-yellow)](https://github.com/franciscoruizfernandez/coordina)
[![Licencia](https://img.shields.io/badge/llicència-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue)](https://react.dev/)

---

## 📋 Taula de Continguts

- [Descripció](#-descripció)
- [Característiques Principals](#-característiques-principals)
- [Arquitectura](#️-arquitectura)
- [Tecnologies](#-tecnologies)
- [Requisits Previs](#-requisits-previs)
- [Instal·lació](#-installació)
- [Configuració](#️-configuració)
- [Ús](#-ús)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Projecte](#-estructura-del-projecte)
- [Testing](#-testing)
- [Desplegament](#-desplegament)
- [Contribució](#-contribució)
- [Autors](#️-autors)
- [Llicència](#-llicència)
- [Agraïments](#-agraïments)

---

## 📖 Descripció

**COORDINA** és un sistema distribuït client-servidor amb comunicació en temps real dissenyat per gestionar i coordinar incidències policials. El projecte forma part d'un Treball de Fi de Grau (TFG) d'Enginyeria Informàtica amb menció en Software.

### Context

El sistema simula l'operativa real de coordinació policial:
- 📞 Recepció d'incidències des del sistema 112
- 🗺️ Visualització geoespacial en temps real
- 🚓 Assignació automàtica i manual de patrulles segons proximitat
- 📱 Aplicació mòbil (PWA) per a patrulles amb geolocalització
- 💬 Chat bidireccional sala ↔ patrulles
- 📹 Integració de streams de vídeo
- 📊 Trazabilitat completa de totes les accions

### Objectius del projecte

- ✅ Validar la viabilitat d'una arquitectura integrada per entorns policials
- ✅ Millorar la coordinació operativa mitjançant temps real
- ✅ Optimitzar l'assignació de recursos segons criteris geogràfics
- ✅ Proporcionar consciència situacional global als operadors

---

## 🛠️ Tecnologies

### Backend
- ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white) **Node.js 18+** - Entorn d'execució JavaScript
- ![Express](https://img.shields.io/badge/Express-4.18+-000000?logo=express&logoColor=white) **Express.js** - Framework web minimalista
- ![Socket.io](https://img.shields.io/badge/Socket.io-4.7+-010101?logo=socket.io&logoColor=white) **Socket.io** - Comunicació temps real (WebSockets)
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white) **PostgreSQL** - Base de dades relacional
- ![JWT](https://img.shields.io/badge/JWT-000000?logo=json-web-tokens&logoColor=white) **JSON Web Tokens** - Autenticació
- **bcrypt** - Hash de contrasenyes
- **Helmet.js** - Seguretat HTTP headers
- **express-rate-limit** - Protecció contra atacs

### Frontend Sala de Control
- ![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black) **React 18+** - Llibreria UI
- ![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite&logoColor=white) **Vite** - Build tool
- ![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-199900?logo=leaflet&logoColor=white) **Leaflet.js** - Mapes interactius
- **react-leaflet** - Components React per Leaflet
- **Socket.io-client** - Client WebSocket
- **Axios** - Client HTTP
- ![TailwindCSS](https://img.shields.io/badge/Tailwind-3+-06B6D4?logo=tailwindcss&logoColor=white) **TailwindCSS** - Framework CSS utility-first
- **react-router-dom** - Navegació
- **react-toastify** - Notificacions
- **date-fns** - Formatació de dates

### Frontend Patrulles (PWA)
- ![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black) **React 18+** - Llibreria UI
- ![Vite](https://img.shields.io/badge/Vite-5+-646CFF?logo=vite&logoColor=white) **Vite** - Build tool
- **vite-plugin-pwa** - Plugin PWA
- **Workbox** - Service Workers
- **Geolocation API** - Geolocalització del navegador
- **Socket.io-client** - Client WebSocket
- ![TailwindCSS](https://img.shields.io/badge/Tailwind-3+-06B6D4?logo=tailwindcss&logoColor=white) **TailwindCSS** - Framework CSS

### Infraestructura i Desplegament
- ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white) **Supabase** - PostgreSQL gestionada + Auth + Realtime
- ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white) **Render.com** - Hosting backend (Free tier)
- ![CloudFlare Pages](https://img.shields.io/badge/Cloudflare-000000?logo=vercel&logoColor=white) **Cloudflare Pages** - Hosting frontends
- ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white) **Cloudinary** - Emmagatzematge assets/vídeos
- **YouTube** - Streaming vídeo simulat (embebido)
- ![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white) **GitHub** - Control de versions
- **Taiga.io** - Gestió del projecte (Scrum)

### Testing i Qualitat
- **Jest** - Tests unitaris (backend)
- **Supertest** - Tests integració API
- **Vitest** - Tests unitaris (frontend)
- **Testing Library** - Tests components React
- **Playwright / Cypress** - Tests E2E
- **ESLint** - Linter JavaScript
- **Prettier** - Formatació de codi

---

## 📋 Requisits Previs

Abans de començar, assegura't de tenir instal·lat:

- ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js) **Node.js 18 o superior** - [Descarregar](https://nodejs.org/)
- ![npm](https://img.shields.io/badge/npm-9+-CB3837?logo=npm) **npm 9 o superior** (ve amb Node.js)
- ![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white) **Git** - [Descarregar](https://git-scm.com/)
- **Editor de codi** (recomanat: [Visual Studio Code](https://code.visualstudio.com/))

### Verificar instal·lació

```bash
node --version   # Ha de mostrar v18.x.x o superior
npm --version    # Ha de mostrar v9.x.x o superior
git --version    # Ha de mostrar v2.x.x o superior

🚀 Instal·lació
1. Clonar el repositori
    git clone https://github.com/EL_TEU_USUARI/coordina-sistema.git
    cd coordina-sistema

2. Configurar el Backend
    cd backend
    npm install

Crea un fitxer .env a partir de l'exemple:
    cp .env.example .env

Edita .env i configura les variables necessàries:
    PORT=3000
    DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
    JWT_SECRET=el_teu_secret_super_segur_aqui
    SUPABASE_URL=https://PROJECT_REF.supabase.co
    SUPABASE_ANON_KEY=la_teva_anon_key
    NODE_ENV=development
    ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
    Nota: Per obtenir les credencials de Supabase:

Crea un compte a supabase.com
Crea un nou projecte
Copia les credencials des de Settings → API

3. Configurar Frontend Sala de Control
    cd ../frontend-sala
    npm install

Crea el fitxer .env:
    cp .env.example .env

Edita .env:
    VITE_API_URL=http://localhost:3000
    VITE_WS_URL=http://localhost:3000
    VITE_APP_NAME=COORDINA Sala de Control

4. Configurar Frontend Patrulles (PWA)
    cd ../frontend-patrullas
    npm install --legacy-peer-deps
    Nota: S'usa --legacy-peer-deps per compatibilitat amb Vite 8.

Crea el fitxer .env:
    cp .env.example .env

Edita .env:
    VITE_API_URL=http://localhost:3000
    VITE_WS_URL=http://localhost:3000
    VITE_APP_NAME=COORDINA Patrulles
    VITE_GPS_UPDATE_INTERVAL=10

5. Configurar la Base de Dades
    Ves a Supabase i crea un projecte
    A l'editor SQL, executa l'script de creació de taules (disponible a docs/sql/crear_tablas.sql)
    Insereix dades de prova (disponible a docs/sql/datos_prueba.sql)
    Verificació: A Supabase → Table Editor hauries de veure 8 taules creades.

---

```markdown
## 📁 Estructura del Projecte
coordina-sistema/
│
├── backend/ # Backend Node.js + Express + Socket.io
│ ├── config/ # Configuració (BD, etc.)
│ ├── controllers/ # Controladors (lògica de negoci)
│ ├── middleware/ # Middlewares (auth, RBAC, trazabilitat)
│ ├── routes/ # Rutes API REST
│ ├── sockets/ # Gestió events WebSocket
│ ├── simulators/ # Simuladors (112, GPS)
│ ├── utils/ # Utilitats (Haversine, JWT helpers)
│ ├── server.js # Punt d'entrada
│ ├── .env.example # Template variables d'entorn
│ └── package.json
│
├── frontend-sala/ # Frontend React - Sala de Control
│ ├── src/
│ │ ├── components/ # Components React
│ │ ├── context/ # Contexts (Auth, Socket)
│ │ ├── services/ # Serveis (API, Socket client)
│ │ ├── utils/ # Utilitats
│ │ ├── App.jsx # Component principal
│ │ └── main.jsx # Punt d'entrada
│ ├── public/ # Assets estàtics
│ ├── index.html
│ ├── vite.config.js
│ ├── tailwind.config.js
│ └── package.json
│
├── frontend-patrullas/ # Frontend React PWA - Patrulles
│ ├── src/
│ │ ├── components/ # Components React
│ │ ├── hooks/ # Hooks custom (useGeolocation)
│ │ ├── services/ # Serveis (API, Socket)
│ │ ├── App.jsx
│ │ └── main.jsx
│ ├── public/
│ │ ├── manifest.json # Manifest PWA
│ │ ├── icon-192.png # Icona PWA 192x192
│ │ └── icon-512.png # Icona PWA 512x512
│ ├── vite.config.js # Amb plugin VitePWA
│ └── package.json
│
├── docs/ # Documentació del projecte
│ ├── ARQUITECTURA.md # Arquitectura del sistema
│ ├── API.md # Documentació API REST
│ ├── WEBSOCKETS.md # Documentació events WebSocket
│ ├── MANUAL_USUARIO.md # Manual d'usuari
│ ├── INSTALACION.md # Guia d'instal·lació
│ ├── modelo_datos.png # Diagrama ER
│ ├── sql/ # Scripts SQL
│ │ ├── crear_tablas.sql
│ │ └── datos_prueba.sql
│ └── capturas/ # Screenshots del sistema
│
├── .gitignore # Fitxers ignorats per Git
├── LICENSE # Llicència del projecte (MIT)
└── README.md # Aquest fitxer

---

## 📚 Documentació Addicional

- 📐 **[Arquitectura del Sistema](docs/ARQUITECTURA.md)** - Disseny tècnic detallat, decisions arquitectòniques i diagrames
- 🔌 **[Documentació API REST](docs/API.md)** - Endpoints, exemples de request/response
- 🔄 **[Documentació WebSockets](docs/WEBSOCKETS.md)** - Events en temps real
- 👤 **[Manual d'Usuari](docs/MANUAL_USUARIO.md)** - Guia d'ús de les aplicacions
- 💾 **[Model de Dades](docs/modelo_datos.png)** - Diagrama Entitat-Relació

---


## 🎯 Ús

### Executar en mode desenvolupament

**Necessites 3 terminals obertes simultàniament:**

---

### 🖥️ Terminal 1: Backend
```bash
cd backend
npm run dev
```

✅ Backend escoltant a: http://localhost:3000

---

### 🖥️ Terminal 2: Frontend Sala
```bash
cd frontend-sala
npm run dev
```

✅ Sala de Control a: http://localhost:5173

---

### 🖥️ Terminal 3: Frontend Patrulles
```bash
cd frontend-patrullas
npm run dev
```

✅ App Patrulles a: http://localhost:5174

---

## 🔍 Verificar funcionament

Obre al navegador:

- http://localhost:3000/health

Resposta esperada:

```json
{"status":"OK","message":"Backend COORDINA funcionant correctament"}
```

- http://localhost:5173 → Sala de Control
- http://localhost:5174 → App Patrulles

---

## 👤 Usuaris de prova

### 🧑‍💼 Operadors Sala
- operador1 / test123
- operador2 / test123

### 🚓 Patrulles
- patrulla101 / test123
- patrulla102 / test123
- patrulla103 / test123

### 👑 Administrador
- admin / test123

⚠️ Aquests usuaris són de prova (NO producció)

---

## 🧪 Scripts

### Backend
```bash
npm run dev      # Desenvolupament
npm start        # Producció
npm test         # Tests
npm run lint     # ESLint
npm run format   # Prettier
```

### Frontend Sala
```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

### Frontend Patrulles (PWA)
```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

---

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend-sala
npm test
```

### E2E (Playwright)
```bash
npm install -D @playwright/test
npx playwright test
```

### Cobertura
```bash
cd backend
npm run test:coverage
```

🎯 Objectiu: >70% coverage

---

## 🚀 Desplegament

### 🖥️ Backend → Render
- Connectar repositori GitHub
- Build: `npm install`
- Start: `npm start`
- Afegir variables .env

---

### 🖥️ Frontend Sala → Vercel
- Import Project
- Seleccionar frontend-sala
- Afegir variables VITE_*
- Deploy

---

### 📱 Frontend Patrulles → Vercel
- Mateix procés que Sala

---

### 🗄️ Base de dades → Supabase
Ja configurada en instal·lació inicial

---

## 🌍 URLs producció (exemple)

- Backend: https://coordina-backend.onrender.com
- Sala: https://coordina-sala.vercel.app
- Patrulles: https://coordina-patrulles.vercel.app

---

## 🤝 Contribució

```bash
git checkout -b feature/NovaFuncionalitat
git commit -m "Afegir nova funcionalitat"
git push origin feature/NovaFuncionalitat
```

1. Fork
2. Pull Request

---

## 🎨 Estil de codi

- ESLint
- Prettier
- Commits en català o anglès
- Comentaris en català

---

## 🧑‍💻 Autors

Francisco Ruiz Fernández

🎓 Enginyeria Informàtica - FIB  
📧 francisco.ruiz.fernandez@estudiantat.upc.edu  
💼 LinkedIn  
🐙 GitHub: @franciscoruizfernandez  

Director TFG: Alberto Abello Gamazo

---

## 📄 Llicència

```
MIT License

Copyright (c) 2026 [El teu nom]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software")...
```

---

## 🙏 Agraïments

- Mossos d'Esquadra
- FIB (UPC)
- Node.js, React, Express, Socket.io
- Leaflet.js, TailwindCSS
- Supabase, Render, Vercel
- OpenStreetMap

---

## 📞 Contacte

- Issues: GitHub Issues
- Email: el.teu.email@example.com
- Discussions: GitHub Discussions
```