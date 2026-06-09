# CarolinaPOS — Contexto del Proyecto

**Producto:** SaaS colombiano de facturación electrónica DIAN, POS, inventario y gestión comercial.  
**Dev:** Diego (chileno) + pareja colombiana (Calarcá, Quindío).  
**Dominio:** carolinapos.co | **Estado:** Producción activa en Railway + Netlify.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Zustand + React Router v6 |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL multi-tenant (`tenant_id` en todas las tablas) |
| Backend deploy | Railway (región `us-east4` — pendiente mover a SA) |
| Frontend deploy | Netlify → app.carolinapos.co |
| Impresión | Relay vía Railway + servidor.py local (ESC/POS via win32print) |
| Impresión Bluetooth | Web Bluetooth API (Android Chrome) — `lib/bluetoothPrint.js` |
| Facturación DIAN | Factus API (actualmente en sandbox) |
| Auth | JWT + refresh tokens + Zustand persist |

---

## Módulos Implementados

- **Auth**: Login con correo o username, roles por tenant (admin/supervisor/cajero/vendedor/inventario)
- **POS**: Carrito, búsqueda rápida (pg_trgm), descuentos por ítem, métodos de pago, próxima factura visible, procesamiento venta → Factus DIAN
- **Facturación DIAN**: Factus API, PDF, envío email, nota crédito, rangos numeración
- **Ticket ESC/POS**: Layout 4 columnas, QR validación DIAN, densidad configurable, 58/80mm
- **Impresión Relay**: Frontend → Railway `/api/print/job` → servidor.py local (win32print). Token **por dispositivo** en `localStorage` (`carolina_device_token`) + tabla `print_devices` en PostgreSQL.
- **Impresión Bluetooth**: Web Bluetooth para Android Chrome. Soporta 4 servicios GATT (Xprinter, Serialio, Nordic UART, Genérico). Chunks de 512 bytes.
- **Inventario**: Productos, stock, movimientos, alertas stock bajo, importar
- **Clientes**: CRUD con tipo doc CC/NIT/CE, búsqueda desde POS
- **Proveedores + Compras**: CRUD, actualiza stock automáticamente
- **Cartera**: Facturas a crédito, seguimiento pagos
- **Caja y Sesiones**: Apertura/cierre con arqueo, múltiples cajas por tienda, imprime ticket de cierre al cerrar turno anterior
- **Reportes**: Dashboard métricas, ventas por período/producto/cajero
- **Configuración**: Empresa, impresora, DIAN (resolución, prefijo, Factus keys), Bluetooth
- **Super Admin**: `/super-admin` — gestión de todos los tenants
- **Usuarios**: CRUD con roles, username opcional
- **Guía Hardware**: `/guia-hardware` — instrucciones servidor.py + impresora (con token por dispositivo)

---

## Reglas Técnicas Críticas

1. **IVA Colombia**: `precio_venta` SIEMPRE incluye IVA. Nunca sumar IVA encima.  
   `base = total / (1 + iva/100)` | `impuesto = total - base`

2. **Print relay**: Bytes ESC/POS viajan como array de números JSON por Railway → servidor.py los convierte a `bytes()` y los envía con win32print. NO base64 necesario.

3. **Gaveta (cash drawer)**: Abrir con `abrirGaveta()` de `useLocalPrint` solo en venta real. Nunca en reimpresiones.

4. **Multi-tenant**: Todo query PostgreSQL lleva `WHERE tenant_id = $n`. Sin excepción.

5. **Factus sandbox vs prod**: `FACTUS_BASE_URL` distingue ambientes. No mezclar nunca.

6. **Token de impresora**: Es por **dispositivo** (navegador), no por usuario ni por tenant. Se guarda en `localStorage` como `carolina_device_token` y en la tabla `print_devices`. Permite múltiples PCs con distintas impresoras bajo el mismo usuario/tenant.

---

## Archivos Clave

```
frontend/src/
├── lib/escpos.js            ← Generador ESC/POS (CRÍTICO - no tocar sin cuidado)
├── lib/bluetoothPrint.js    ← Impresión BT via Web Bluetooth (Android Chrome)
├── hooks/useLocalPrint.js   ← Hook impresión relay + Bluetooth (reemplazó useQZTray)
├── store/posStore.js        ← Carrito + cálculo IVA colombiano
├── pages/POS.jsx            ← Punto de venta
├── pages/Configuracion.jsx  ← Config empresa + impresora + DIAN + Bluetooth
├── context/AuthContext.jsx  ← Splash screen state (splashing, triggerSplash)
├── components/Common/
│   ├── SplashScreen.jsx     ← Pantalla de carga con logo CarolinaPOS
│   ├── ErrorBoundary.jsx    ← Error boundary global
│   └── PageSkeleton.jsx     ← Skeleton loaders reutilizables
└── styles/index.css         ← Design system global (10 secciones)

backend/src/
├── lib/factus.js                   ← Cliente Factus API (CRÍTICO)
├── routes/printRelay.js            ← Cola de trabajos, tabla print_devices
├── routes/auth.js                  ← Rate limiting: 20 intentos/15 min por IP
├── controllers/posController.js    ← Procesar venta + Factus + búsqueda rápida
└── controllers/authController.js   ← Login con email o username

backend/src/db/migrations/          ← Historial SQL numerado (001..022)

carolinapos-print/
├── servidor.py              ← Servidor local polling Railway (win32print, sin Flask)
└── Iniciar.bat              ← Instala pywin32 + autostart Startup + corre servidor
```

---

## Variables de Entorno Railway

```
DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET
FACTUS_BASE_URL=https://api-sandbox.factus.com.co  ← cambiar a prod cuando toque
FACTUS_CLIENT_ID, FACTUS_CLIENT_SECRET, FACTUS_USERNAME, FACTUS_PASSWORD
FRONTEND_URL=https://app.carolinapos.co
EMAIL_USER, EMAIL_PASS, EMAIL_FROM
```

Ver `backend/.env.example` para documentación completa.

---

## Módulo Contable (Futuro)

### Resumen
Construir capa contable propia en CarolinaPOS. El 70% de los datos ya existen (ventas, compras, IVA). Falta organizarlos con lógica de partida doble.

### Arquitectura
3 tablas PostgreSQL multi-tenant:
- `accounts` — PUC colombiano (~5000 cuentas, 9 clases)
- `journal_entries` — cada movimiento (venta, compra, gasto)
- `postings` — los dos lados de cada asiento (débito + crédito)

**Regla invariable:** `SUM(débitos) = SUM(créditos)` por cada journal entry

### Asientos automáticos (ejemplos)
```
Venta $100.000:
  Débito  1105 Caja           $100.000
  Crédito 4135 Ventas          $84.034
  Crédito 2408 IVA por pagar   $15.966

Compra $50.000:
  Débito  6205 Costo mercancía  $42.017
  Débito  2367 IVA descontable   $7.983
  Crédito 2205 Proveedores      $50.000
```

### Pasos para construirlo
1. Ejecutar `WebScarpingPUC` → importar PUC a PostgreSQL (seed inicial)
2. Crear tablas `accounts`, `journal_entries`, `postings` con migraciones
3. Función `buildAsientos()` que se dispara en cada venta/compra
4. Reportes: Balance general, Estado de resultados, Libro de IVA (Excel primero, XML DIAN después)
5. **Validar asientos con un contador colombiano antes de lanzar**

### Reportes requeridos
- **Balance general**: activos (clase 1) = pasivos (clase 2) + patrimonio (clase 3)
- **Estado de resultados**: ingresos (clase 4) - costos (clase 6) - gastos (clase 5) = utilidad neta
- **Libro de IVA**: ventas y compras del período → Excel para que contador diligencie Formulario 300 DIAN

### Referencias técnicas
- `github.com/pgr0ss/pgledger` — implementación 100% PostgreSQL, artículo 2025
- `gist.github.com/NYKevin/9433376` — esquema SQL mínimo de partida doble
- `github.com/blnkfinance/blnk` — ledger open source producción-ready (Go + PostgreSQL)
- `github.com/YUND4/WebScarpingPUC` — genera PUC colombiano en JSON
- `github.com/OCA/l10n-colombia` — lógica retenciones Colombia en XML (referencia)
- `github.com/Asuskf/Sistema-Contable-Arcano` — reportes contables en C# (referencia)

### Integraciones evaluadas (alternativa a construir propio)
- **Alegra** — facturación DIAN + contabilidad + API REST + programa partners. `developers.alegra.com`
- **Siigo** — líder Colombia, API en `developers.siigo.com`, contacto: WhatsApp 317 429 4883 / Tel (571) 580 2606

### Prerequisito crítico
Conseguir un contador colombiano que valide los asientos antes de lanzar. Sin eso el módulo puede ser técnicamente correcto pero contablemente inválido.

---

## Tareas Pendientes

1. **Editar username** desde módulo Usuarios admin

2. **Reimprimir ticket desde FacturaDetalle**: Agregar botón + llamada `buildTicket` con parámetro `W`

3. **Factus producción**: Cambiar `FACTUS_BASE_URL` cuando cliente tenga resolución DIAN real

4. **Cobro suscripciones Wompi**: Integrar cuando haya 10+ clientes. Antes: activación manual Super Admin.

5. **Municipio dinámico Factus**: Actualmente hardcodeado `11001` (Bogotá). Hacer lookup real.

6. **Railway región**: Cambiar de `sfo` a `us-east4` para mejor latencia Colombia. Requiere plan pago.

7. **iOS Bluetooth**: Web Bluetooth bloqueado por Apple. Opciones: relay vía PC (funciona hoy) o app React Native.

---

## Empresa Legal — CARODI SAS (pendiente respuesta pareja)

- **Empresa:** CARODI SAS (SAS colombiana)
- **Representante legal:** Pareja colombiana de Diego (Calarcá)
- **Diego:** Entra como accionista después via cesión de acciones (necesita pasaporte + RUT Colombia)
- **Marca:** CarolinaPOS — ✅ libre en Colombia (verificado RUES + SIC)
- **Etapa 1:** Constituir en crearempresa.gov.co (~$300k COP)
- **Etapa 2:** Marca en SIC clase 42 (~$1.2M COP) cuando haya ingresos
- **Modelo cobro:** Efectivo/transferencia + activación manual hasta integrar Wompi

---

## Modelo de Negocio

- Una cuenta Factus (bolsa multifacturador) para todos los tenants CarolinaPOS
- Clientes pagan mensualidad; CarolinaPOS absorbe costo Factus con margen
- Planes: Básico / Pro / Enterprise (precios por definir)
