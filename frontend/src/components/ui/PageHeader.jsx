export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-ink mb-2">{title}</h1>
        {subtitle && <p className="text-ink-2">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
