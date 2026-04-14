# Base de Dades - COORDINA

## Model de Dades

![Diagrama ER](./model_dades.png)

## Taules

### usuaris
Gestió d’usuaris del sistema (operadors, patrulles, admins).

### incidencies
Registre de totes les incidències policials rebudes.

### indicatius
Patrulles/unitats mòbils disponibles.

### assignacions
Relació entre incidències i indicatius assignats.

### esdeveniments_tracabilitat
Registre de totes les accions del sistema.

### missatges
Xat entre sala i patrulles.

### streams_video
URLs de streams de vídeo associats.

## Connexió

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres