export default function StatusChip({ status, label }) {
  const variants = {
    'active': 'bg-green-50 text-success',
    'inactive': 'bg-surface-soft text-ink-2',
    'emitida': 'bg-green-50 text-success',
    'anulada': 'bg-red-50 text-danger',
    'pendiente': 'bg-yellow-50 text-warning',
    'vencida': 'bg-red-50 text-danger',
    'al-dia': 'bg-green-50 text-success',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${variants[status] || variants.inactive}`}>
      {label}
    </span>
  );
}
