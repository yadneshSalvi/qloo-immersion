import { forwardRef, type ButtonHTMLAttributes } from 'react';
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'normal' | 'small' | 'icon';
  }
>(({ className = '', variant = 'primary', size = 'normal', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={`button button-${variant} button-${size} ${className}`}
    {...props}
  />
));
Button.displayName = 'Button';
