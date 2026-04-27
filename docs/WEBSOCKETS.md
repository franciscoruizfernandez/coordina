## Sistema de Reconnexió

El client Socket.io està configurat amb:
- reconnection: true
- reconnectionAttempts: 10
- reconnectionDelay: 1000ms
- timeout: 20s

En cas de desconnexió:
1. El client entra en mode cua.
2. Els events s'emmagatzemen localment.
3. En reconnectar, es reenvien automàticament.
4. No es perden accions operatives.

S'ha validat:
✅ Reinici del servidor
✅ Tall de xarxa
✅ Enviament d'events durant desconnexió


# Sistema Temps Real - Sprint 2

## US023 - Simulador de Moviment de Patrulles

Objectiu:
Simular comportament dinàmic de patrulles en entorn controlat.

Arquitectura:
Simulador → API REST → BD → WebSocket → Sala control

Flux:
1. Obté indicatius actius
2. Calcula nova posició
3. PATCH ubicació
4. Backend emet 'ubicacio_indicatiu'
5. Clients actualitzen mapa

Casos contemplats:
- Coordenades null
- Indicatiu sense incidència
- Indicatiu amb incidència
- Errors de validació

Test realitzat:
✅ Moviment aleatori
✅ Moviment cap a incidència
✅ Emissió WebSocket correcta
✅ No errors en execució prolongada