# UI Consistency Audit & Fix — CarolinaPOS

Revisa TODAS las páginas en `frontend/src/pages/` y sus modales/formularios asociados en `components/` para detectar y corregir inconsistencias de diseño.

## Estándares de diseño CarolinaPOS (fuente de verdad)

Estos son los patrones correctos que DEBEN usarse en todas las páginas:

### Estructura de página
```jsx
<div className="space-y-6">
  {/* Encabezado */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-ink">Título de la Página</h1>
      <p className="text-sm text-ink-2 mt-0.5">Subtítulo opcional</p>
    </div>
    {/* Botón de acción principal (si aplica) */}
    <button className="...">Acción</button>
  </div>

  {/* Contenido */}
</div>
```

### Cards / paneles
```jsx
<div className="bg-white border border-border rounded-xl shadow-sm p-6">
  ...
</div>
```
- Siempre: `rounded-xl` (NO `rounded-lg` ni `rounded-2xl`)
- Siempre: `border border-border`
- Siempre: `shadow-sm`
- Padding interno: `p-6` en desktop, puede reducir a `p-4` en mobile

### Tablas
```jsx
<div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border bg-surface-soft">
        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wider">Col</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="hover:bg-surface-soft transition-colors">
        <td className="px-4 py-3 text-sm text-ink">Valor</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Títulos
- Página principal: `text-2xl font-bold text-ink`
- Sección dentro de página: `text-base font-semibold text-ink`
- Label de campo: `text-xs font-semibold text-ink-2 uppercase tracking-wider`
- NUNCA usar `text-3xl` ni `text-xl` para títulos de página

### Botones
- Primario: `bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors`
- Secundario: `bg-white border border-border text-ink px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-soft transition-colors`
- Peligro: `bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors`
- NUNCA mezclar `rounded-md` con `rounded-lg` en la misma página
- NUNCA usar `rounded-full` en botones de acción (solo badges/pills)

### Modales
```jsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-border">
      <h2 className="text-base font-semibold text-ink">Título Modal</h2>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
    {/* Body */}
    <div className="p-6 space-y-4">...</div>
    {/* Footer */}
    <div className="flex justify-end gap-3 p-6 border-t border-border">
      <button>Cancelar</button>
      <button>Confirmar</button>
    </div>
  </div>
</div>
```

### Formularios / inputs
- Wrapper de campo: `<div className="space-y-1.5">`
- Label: `<label className="text-xs font-medium text-ink-2">Label</label>`
- Input: `className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"`
- Error: `<p className="text-xs text-red-600">Mensaje</p>`

### Badges de estado
```jsx
// Activo / éxito
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Activo</span>
// Pendiente / advertencia  
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pendiente</span>
// Inactivo / error
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Inactivo</span>
// Neutro
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-soft text-ink-2">Neutro</span>
```

### Estados vacíos (empty state)
```jsx
<div className="text-center py-12">
  <IconName className="w-10 h-10 text-ink-2/40 mx-auto mb-3" />
  <p className="text-sm font-medium text-ink-2">Sin resultados</p>
  <p className="text-xs text-ink-2/70 mt-1">Descripción opcional</p>
</div>
```

### Paginación
```jsx
<div className="flex items-center justify-between px-4 py-3 border-t border-border">
  <p className="text-xs text-ink-2">Mostrando X–Y de Z</p>
  <div className="flex gap-1">
    <button className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-soft disabled:opacity-40">Anterior</button>
    <button className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-soft disabled:opacity-40">Siguiente</button>
  </div>
</div>
```

### Filtros / barra de búsqueda
```jsx
<div className="flex flex-wrap gap-3 items-center">
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
    <input className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Buscar..." />
  </div>
  {/* Otros filtros select */}
</div>
```

---

## Instrucciones de auditoría

Lee **cada archivo** en `frontend/src/pages/` y los componentes que importa de `components/`. Para cada uno:

1. **Detecta** las inconsistencias comparando contra los estándares de arriba
2. **Corrige** directamente en el archivo — no describas, edita
3. **Mantén** toda la lógica y funcionalidad intacta, solo cambia clases CSS/estructura JSX de layout
4. **No toques** POS.jsx (tiene su propio layout especial)
5. **No toques** lógica de negocio, hooks, estado, queries

Inconsistencias más comunes a buscar y corregir:
- `rounded-lg` en cards → cambiar a `rounded-xl`
- `rounded-md` en botones → cambiar a `rounded-lg`
- `text-xl` o `text-3xl` en títulos de página → cambiar a `text-2xl font-bold text-ink`
- `text-gray-*` → cambiar a `text-ink` o `text-ink-2`
- `border-gray-200` → cambiar a `border-border`
- `bg-gray-50` → cambiar a `bg-surface-soft`
- Botón "Volver" que empuja el título hacia abajo → moverlo al encabezado junto al título o eliminarlo si el browser back funciona
- Modales con padding inconsistente
- Tablas sin `rounded-xl` en el contenedor

Después de corregir todas las páginas, genera un resumen de qué se cambió en cada archivo.
