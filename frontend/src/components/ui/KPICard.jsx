import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ icon: Icon, label, value, delta, deltaType = 'up' }) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
          <Icon size={24} />
        </div>
        {delta && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${deltaType === 'up' ? 'text-success' : 'text-danger'}`}>
            {deltaType === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className="text-sm text-ink-2 mb-2">{label}</p>
      <p className="text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
