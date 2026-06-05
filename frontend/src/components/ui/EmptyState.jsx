export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-12">
      {Icon && <div className="text-accent-soft mb-4"><Icon size={48} className="mx-auto" /></div>}
      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
      <p className="text-ink-2 mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
