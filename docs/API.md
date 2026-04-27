## Missatges

### POST /api/missatges
Envia un missatge

Body:
{
  "incidencia_id": "uuid",
  "contingut": "Missatge",
  "destinatari_id": "uuid opcional"
}

### GET /api/missatges?incidencia_id=X
Retorna historial de la incidència

### PATCH /api/missatges/:id/llegit
Marca missatge com a llegit

