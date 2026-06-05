# Carolina Backend

Backend SaaS multi-tenant de facturación electrónica DIAN (Colombia) que usa la API de Factus como proveedor autorizado.

## Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4
- **Base de datos:** PostgreSQL (via `pg`)
- **Caché / Sesiones:** Redis
- **Autenticación:** JWT (access + refresh tokens)
- **Cifrado:** AES-256-GCM (crypto nativo de Node.js)
- **Validación:** Zod
- **Logging:** Winston
- **API externa:** Factus (facturación electrónica DIAN Colombia)

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14+
- Redis 6+
- Credenciales de Factus API para facturación electrónica DIAN

## Instalación local

```bash
# 1. Clonar el repositorio e instalar dependencias
cd Carolina/backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 3. Ejecutar migraciones
npm run migrate

# 4. Poblar datos iniciales (planes de precios)
npm run seed

# 5. Arrancar en modo desarrollo
npm run dev
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Cadena de conexión Redis | `redis://host:6379` |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mín. 32 chars) | `una-cadena-larga-y-aleatoria` |
| `JWT_EXPIRES_IN` | Duración del access token | `7d` |
| `ENCRYPTION_KEY` | Clave de 64 chars hex para AES-256-GCM | `a1b2c3...` (32 bytes = 64 hex) |
| `FRONTEND_URL` | URL del frontend (CORS) | `https://app.tudominio.com` |
| `NODE_ENV` | Entorno de ejecución | `production` o `development` |
| `PORT` | Puerto del servidor | `3000` |

### Generar ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generar JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Migraciones y Seed

```bash
# Crear todas las tablas en orden
npm run migrate

# Insertar los 4 planes de precios (starter, basico, profesional, empresarial)
npm run seed
```

Las migraciones se ejecutan en orden numérico desde `src/db/migrations/`. Son idempotentes (usan `CREATE TABLE IF NOT EXISTS`).

## API Endpoints

### Autenticación (`/api/auth`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/register` | Registrar nuevo tenant + admin |
| POST | `/login` | Iniciar sesión |
| POST | `/refresh` | Renovar access token |
| POST | `/logout` | Cerrar sesión |
| GET | `/me` | Perfil del usuario actual |

### Onboarding (`/api/onboarding`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/estado` | Ver estado de onboarding del tenant |

### POS - Punto de Venta (`/api/pos`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard` | Resumen del día y mes |
| POST | `/venta` | Procesar venta completa con factura DIAN |
| GET | `/productos-rapido` | Top 20 productos más vendidos |

### Productos (`/api/productos`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar con paginación y filtros |
| POST | `/` | Crear producto |
| GET | `/:id` | Obtener por ID |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Desactivar (soft delete) |
| POST | `/:id/ajuste-stock` | Entrada / salida / ajuste de stock |

### Clientes (`/api/clientes`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar con búsqueda |
| POST | `/` | Crear cliente |
| GET | `/:id` | Obtener por ID |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar |

### Facturas (`/api/facturas`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar con filtros |
| GET | `/:id` | Detalle con ítems |
| GET | `/:id/pdf` | URL del PDF desde Factus |
| POST | `/:id/anular` | Anular factura (crea nota crédito) |

### Reportes (`/api/reportes`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ventas-dia` | Ventas de un día específico |
| GET | `/ventas-mes` | Ventas agrupadas por día del mes |
| GET | `/productos-mas-vendidos` | Top N productos |
| GET | `/stock-bajo` | Productos con stock <= mínimo |

### Tenant (`/api/tenants`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/me` | Datos del tenant actual |
| PUT | `/me` | Actualizar datos de la empresa |
| PUT | `/plan` | Cambiar plan de suscripción |
| GET | `/usage` | Uso actual vs límites del plan |

## Planes disponibles

| Plan | Usuarios | Ventas/día | Precio COP/mes |
|---|---|---|---|
| Starter | 1 | 30 | $129.000 |
| Básico | 3 | 100 | $179.000 |
| Profesional | 10 | 300 | $279.000 |
| Empresarial | Ilimitado | 800 | $489.000 |

## Despliegue en Railway

1. Crea un nuevo proyecto en [Railway](https://railway.app)
2. Agrega los servicios **PostgreSQL** y **Redis** desde el marketplace
3. Conecta tu repositorio GitHub al proyecto
4. En la pestaña **Variables**, agrega todas las variables del `.env.example` con valores de producción:
   - `DATABASE_URL`: Railway lo inyecta automáticamente si usas el servicio PostgreSQL integrado
   - `REDIS_URL`: Ídem para Redis
   - Genera un `ENCRYPTION_KEY` y `JWT_SECRET` seguros
5. El build se ejecuta automáticamente con `npm start`
6. Ejecuta las migraciones una vez desde la terminal de Railway:
   ```bash
   npm run migrate && npm run seed
   ```

## Seguridad

- Cada query filtra por `tenant_id` para aislamiento de datos
- Rate limiting de 100 req/min por IP
- Headers de seguridad via Helmet
- Refresh tokens almacenados en Redis con TTL de 30 días
