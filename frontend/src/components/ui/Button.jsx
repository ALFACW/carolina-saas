export default function Button({ variant = 'primary', size = 'md', children, ...props }) {
  const variants = {
    primary: 'bg-accent hover:bg-accent/90 text-white',
    ghost: 'border border-border hover:bg-surface-soft text-ink',
    danger: 'bg-danger hover:bg-danger/90 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}
