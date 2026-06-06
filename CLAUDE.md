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
| Backend deploy | Railway |
| Frontend deploy | Netlify → app.carolinapos.co |
| Impresión | Relay vía Railway + servidor.py local (ESC/POS via win32print) |
| Facturación DIAN | Factus API (actualmente en sandbox) |
| Auth | JWT + refresh tokens + Zustand persist |

---

## Módulos Implementados

- **Auth**: Login con correo o username, roles por tenant (admin/supervisor/cajero/vendedor/inventario)
- **POS**: Carrito, búsqueda productos, descuentos por ítem, métodos de pago, procesamiento venta → Factus DIAN
- **Facturación DIAN**: Factus API, PDF, envío email, nota crédito, rangos numeración
- **Ticket ESC/POS**: Layout 4 columnas, QR validación DIAN, densidad configurable, 58/80mm
- **Impresión Relay**: Frontend → Railway `/api/print/job` → servidor.py local (win32print). Elimina CORS/Chrome PNA para siempre. Token por tenant en `tenants.printer_token`.
- **Inventario**: Productos, stock, movimientos, alertas stock bajo, importar
- **Clientes**: CRUD con tipo doc CC/NIT/CE, búsqueda desde POS
- **Proveedores + Compras**: CRUD, actualiza stock automáticamente
- **Cartera**: Facturas a crédito, seguimiento pagos
- **Caja y Sesiones**: Apertura/cierre con arqueo, múltiples cajas por tienda
- **Reportes**: Dashboard métricas, ventas por período/producto/cajero
- **Configuración**: Empresa, impresora, DIAN (resolución, prefijo, Factus keys)
- **Super Admin**: `/super-admin` — gestión de todos los tenants
- **Usuarios**: CRUD con roles, username opcional
- **Guía Hardware**: `/guia-hardware` — instrucciones servidor.py + impresora

---

## Reglas Técnicas Críticas

1. **IVA Colombia**: `precio_venta` SIEMPRE incluye IVA. Nunca sumar IVA encima.  
   `base = total / (1 + iva/100)` | `impuesto = total - base`

2. **Print relay**: Bytes ESC/POS viajan como array de números JSON por Railway → servidor.py los convierte a `bytes()` y los envía con win32print. NO base64 necesario.

3. **Gaveta (cash drawer)**: Abrir con `abrirGaveta()` de `useLocalPrint` solo en venta real. Nunca en reimpresiones.

4. **Multi-tenant**: Todo query PostgreSQL lleva `WHERE tenant_id = $n`. Sin excepción.

5. **Factus sandbox vs prod**: `FACTUS_BASE_URL` distingue ambientes. No mezclar nunca.

---

## Archivos Clave

```
frontend/src/
├── lib/escpos.js            ← Generador ESC/POS (CRÍTICO - no tocar sin cuidado)
├── hooks/useLocalPrint.js   ← Hook impresión relay (reemplazó useQZTray)
├── store/posStore.js        ← Carrito + cálculo IVA colombiano
├── pages/POS.jsx            ← Punto de venta
└── pages/Configuracion.jsx  ← Config empresa + impresora + DIAN

backend/src/
├── lib/factus.js            ← Cliente Factus API (CRÍTICO)
├── routes/printRelay.js     ← Cola de trabajos de impresión relay
├── controllers/posController.js    ← Procesar venta + Factus
└── controllers/authController.js   ← Login con email o username

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
```

---

## Tareas Pendientes

1. **SQL pendiente** en Railway PostgreSQL:
   ```sql
   UPDATE users SET username = 'concentradoscalarca' WHERE email = 'concentradoscalarca@gmail.com';
   ```
   *(email actualizado por el usuario — era carlos@tiendademo.com)*

2. **DNS app.carolinapos.co**: ✅ CNAME → Netlify. `FRONTEND_URL` Railway pendiente actualizar a `https://app.carolinapos.co`

3. **Landing page carolinapos.co**: ✅ Desplegada en Cloudflare Pages → carolinapos.co

4. **Emails Zoho Mail**: contacto@, soporte@, ventas@, noreply@carolinapos.co

5. **Editar username** desde módulo Usuarios admin

6. **Reimprimir ticket desde FacturaDetalle**: Agregar botón + llamada `buildTicket` con parámetro `W`

7. **Factus producción**: Cambiar `FACTUS_BASE_URL` cuando cliente tenga resolución DIAN real

8. **Cobro suscripciones Wompi**: Integrar cuando haya 10+ clientes. Antes: activación manual Super Admin.

9. **Municipio dinámico Factus**: Actualmente hardcodeado `11001` (Bogotá). Hacer lookup real.

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
