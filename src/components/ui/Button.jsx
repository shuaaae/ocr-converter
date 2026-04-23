import { ArrowRight, Scan, Upload } from 'lucide-react';

const variantStyles = {
  primary: 'bg-[var(--accent-primary)] text-white shadow-[0_4px_16px_rgba(255,92,0,0.2)] hover:scale-105 active:scale-95',
  accent: 'bg-[var(--accent-primary)] text-white px-8 py-4 shadow-[0_8px_24px_rgba(255,92,0,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none',
};

const sizeStyles = {
  medium: 'px-6 py-3',
  large: 'px-8 py-4 text-[13px]',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon = null,
  onClick,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 border-none rounded-xl text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer transition-transform duration-150 ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.medium} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon === 'upload' && <Upload size={16} />}
      {icon === 'arrow' && <ArrowRight size={16} />}
      {icon === 'scan' && <Scan size={16} />}
      {children}
    </button>
  );
};
