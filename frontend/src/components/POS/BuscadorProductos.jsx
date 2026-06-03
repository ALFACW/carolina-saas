import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { productosService } from '../../services/productos'
import { ProductoCard } from '../Stock/ProductoCard'
import { usePOSStore } from '../../store/posStore'
import { useSounds } from '../../hooks/useSounds'

export function BuscadorProductos({ onAgregar }) {
  const [search,    setSearch]    = useState('')
  const [categoria, setCategoria] = useState('')
  const [flash,     setFlash]     = useState(false)
  const inputRef = useRef(null)
  const agregarItem = usePOSStore(s => s.agregarItem)
  const { scan, error: soundError } = useSounds()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'F1') { e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['productos-pos', search, categoria],
    queryFn: () => productosService.getAll({ search, categoria, activo: true, limit: 40 }),
    staleTime: 30000,
    enabled: search.length > 0 || categoria.length > 0,
  })

  const { data: dataAll } = useQuery({
    queryKey: ['productos-pos-all'],
    queryFn: () => productosService.getAll({ activo: true, limit: 40 }),
    staleTime: 60000,
    enabled: search.length === 0 && categoria.length === 0,
  })

  const productos = (search.length > 0 || categoria.length > 0)
    ? (data?.productos || [])
    : (dataAll?.productos || [])

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (productos.length === 1) {
      if (productos[0].stock_actual > 0) {
        agregarItem(productos[0])
        scan()
        setSearch('')
        setFlash(true)
        setTimeout(() => { setFlash(false); inputRef.current?.focus() }, 350)
      } else {
        soundError()
      }
    }
  }, [productos, agregarItem, scan, soundError])

  return (
    <div className="flex flex-col h-full">
      {/* Barra de búsqueda */}
      <div className="p-4 border-b border-gray-100 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 transition-all ${
              flash
                ? 'border-green-400 bg-green-50 ring-1 ring-green-400'
                : 'border-gray-200 hover:border-gray-300 focus:ring-gray-900 focus:border-gray-900'
            }`}
            placeholder="Buscar producto o escanear código... (F1)"
          />
        </div>
        <input
          type="text"
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 hover:border-gray-300"
          placeholder="Categoría..."
        />
        {flash && (
          <p className="text-xs text-green-600 font-medium">Producto agregado al carrito</p>
        )}
        {!flash && search.length > 0 && productos.length === 1 && (
          <p className="text-xs text-gray-400">Presiona Enter para agregar "{productos[0].nombre}"</p>
        )}
      </div>

      {/* Grid productos */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
        ) : productos.length === 0 && (search || categoria) ? (
          <p className="text-sm text-gray-400 text-center py-10">Sin resultados para "{search}"</p>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
            {productos.map(p => (
              <ProductoCard
                key={p.id}
                producto={p}
                onAgregar={(prod) => { if (onAgregar) onAgregar(prod); else agregarItem(prod) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
