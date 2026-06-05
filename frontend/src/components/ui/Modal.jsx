import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-2 hover:text-ink transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="mb-6">{children}</div>
        {footer && <div className="flex gap-3 justify-end border-t border-border pt-6">{footer}</div>}
      </div>
    </div>
  );
}
