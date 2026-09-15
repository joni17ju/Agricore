import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * @param {'primary'|'secondary'|'ghost'|'danger'|'soft'} variant
 * @param {'sm'|'md'|'lg'} size
 * Pass `to` to render a router link styled as a button.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  block = false,
  to,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', isLoading && 'is-loading', className]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {isLoading ? <span className="btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
      {iconRight && !isLoading && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${variant} icon-btn--${size} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 20} />
    </button>
  );
}
