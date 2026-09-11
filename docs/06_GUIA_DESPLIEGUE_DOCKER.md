# Despliegue con Docker

## 1. Arquitectura de servicios

El MVP **no tiene backend**. Toda la persistencia vive en `localStorage` del navegador, así que el despliegue es un solo servicio: el bundle estático servido por nginx.

```
┌──────────────────────────────────────┐
│  cursiva  (nginx:1.27-alpine)        │
│  build multi-stage:                  │
│    node:22-alpine → vite build       │
│    nginx → sirve client/dist         │
│  puerto 80 (sin publicar en host)    │
└──────────────────────────────────────┘
```

El backend (Node + Express + Postgres) entra recién con el panel docente (Módulo D del roadmap). Hasta entonces, agregar un servicio de base de datos sería infraestructura sin usuario.

## 2. Archivos

- `Dockerfile` — build multi-stage. Las imágenes base son multi-arch porque el host de despliegue es ARM64.
- `docker/nginx.conf` — fallback SPA (`try_files … /index.html`), assets con hash cacheados un año, `index.html` sin caché.
- `docker-compose.yml` — un servicio, sin puertos publicados en el host: el despliegue real corre
  en Coolify, que enruta a través de su propia red/proxy (Traefik) sin necesidad de mapear puertos.
- `.dockerignore` — deja afuera `node_modules`, `dist`, `.git`, `docs` y `openspec`.

## 3. Uso

```bash
# levantar (reconstruye si cambió el código)
docker compose up -d --build

# ver logs
docker compose logs -f cursiva

# bajar
docker compose down
```

Para probar localmente antes de subir a Coolify, publicá el puerto a mano sin tocar el compose:

```bash
docker compose run --rm --service-ports -p 5190:80 cursiva
```

> **Trampa conocida:** al cambiar de rama, `--build` no es opcional. Sin él, compose reusa la imagen vieja y vas a estar probando código que ya no existe.

## 4. Desarrollo sin Docker

```bash
npm install
npm run dev     # Vite en :5173
npm test        # Vitest
npm run build   # tsc --noEmit && vite build
```

Para probar en una tablet de la LAN durante el desarrollo: `npm run dev -- --host`.
