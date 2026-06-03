import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export function useTenant() {
  const qc = useQueryClient()
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => { const { data } = await api.get('/api/tenants/me'); return data },
  })

  const { data: usage } = useQuery({
    queryKey: ['tenant-usage'],
    queryFn: async () => { const { data } = await api.get('/api/tenants/usage'); return data },
    staleTime: 60000,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates) => { const { data } = await api.put('/api/tenants/me', updates); return data },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-me'] }),
  })

  return { tenant, usage, isLoading, update: updateMutation.mutateAsync }
}
