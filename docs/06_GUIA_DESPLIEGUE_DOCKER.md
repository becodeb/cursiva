# Guía de Despliegue y Entorno de Desarrollo con Docker

## 1. Arquitectura de Servicios
El entorno se compone de 3 servicios orquestados mediante Docker Compose:
- `client`: Servidor web / bundle para la aplicación React (Vite / Nginx).
- `server`: API REST en Express + TypeScript.
- `database`: PostgreSQL para almacenar usuarios, intentos de trazo y estados de dominio.

## 2. Archivo `docker-compose.yml`

```yaml
version: '3.8'

services:
  database:
    image: postgres:16-alpine
    container_name: cursiva_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: cursiva_admin
      POSTGRES_PASSWORD: cursiva_secure_password
      POSTGRES_DB: cursiva_learning
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - cursiva_net

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: cursiva_api
    restart: unless-stopped
    environment:
      PORT: 4000
      DATABASE_URL: ******database:5432/cursiva_learning
      NODE_ENV: development
    ports:
      - "4000:4000"
    depends_on:
      - database
    volumes:
      - ./server:/app
      - /app/node_modules
    networks:
      - cursiva_net

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: cursiva_frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - server
    networks:
      - cursiva_net

volumes:
  pgdata:

networks:
  cursiva_net:
    driver: bridge
```

## 3. Instrucciones de Inicialización Rápida

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/cursiva-app.git
cd cursiva-app
```

2. Iniciar el entorno completo:
```bash
docker compose up --build
```

3. Acceso a los entornos:
* Frontend: `http://localhost:3000`
* API Backend: `http://localhost:4000`
* Conexión DB: `localhost:5432` (User: `cursiva_admin`, DB: `cursiva_learning`)
