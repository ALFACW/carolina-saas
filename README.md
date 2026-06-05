# Carolina — SaaS Facturación Electrónica DIAN

SaaS multi-tenant de facturación electrónica para Colombia. Emite facturas electrónicas ante la DIAN via Factus API.

## Stack

**Backend:** Node.js 20+, Express, PostgreSQL, Redis, JWT  
**Frontend:** React 18, Vite, TailwindCSS, TanStack Query, Zustand  
**Deploy:** Railway

---

## Instalación local

### Requisitos
- Node.js 20+
- PostgreSQL 14+
- Redis 7+

### 1. Clonar y configurar variables

```bash
# Backend
cd backend
cp .env.example .env
# Editar .env con tus valores

# Frontend
cd ../frontend
cp .env.example .env
```

### 2. Generar ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Pegar el resultado en ENCRYPTION_KEY del .env del backend
```

### 3. Instalar dependencias

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Correr migraciones y seed

```bash
cd backend
npm run migrate   # Crea las tablas
npm run seed      # Inserta planes de precios
```

### 5. Iniciar en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

El frontend corre en `http://localhost:5173` con proxy hacia el backend en `:3000`.

---

## Variables de entorno (backend)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `REDIS_URL` | URL de conexión Redis |
| `JWT_SECRET` | Secreto para firmar JWT (mínimo 32 chars) |
| `ENCRYPTION_KEY` | Clave AES-256 en hex (64 chars) |
| `FRONTEND_URL` | URL del frontend (para CORS) |
| `PORT` | Puerto del servidor (default: 3000) |

---

## Deploy en Railway

1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar servicio PostgreSQL → Railway inyecta `DATABASE_URL`
3. Agregar servicio Redis → Railway inyecta `REDIS_URL`
4. Conectar repositorio GitHub
5. Configurar variables de entorno del backend
6. El archivo `railway.json` ya configura el deploy automáticamente

### Scripts de post-deploy

Ejecutar una sola vez tras el primer deploy:

```bash
npm run migrate && npm run seed
```

---

## Arquitectura multi-tenant

- **Base de datos:** shared database, shared schema con columna `tenant_id`
- **Aislamiento:** cada query filtra por `tenant_id` del usuario autenticado
- **Planes:** starter / básico / profesional / empresarial con límites por usuarios y ventas/día

## Flujo de onboarding

1. Empresa se registra → crea tenant + usuario admin
2. Admin configura la empresa y empieza a operar
3. La facturación electrónica se activa configurando Factus en las variables de entorno del servidor
