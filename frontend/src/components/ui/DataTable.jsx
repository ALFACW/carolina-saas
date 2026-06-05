export default function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
      <table className="w-full">
        <thead className="bg-surface-soft border-b border-border">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wide">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              className="hover:bg-surface-soft transition-colors cursor-pointer"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-sm text-ink">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="px-6 py-8 text-center text-ink-2 text-sm">
          No hay datos
        </div>
      )}
    </div>
  );
}
