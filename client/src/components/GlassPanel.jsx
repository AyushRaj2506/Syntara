import './GlassPanel.css';

/**
 * Reusable glass surface — used by Modal, floating toolbars, preview panel.
 * Per spec §2.1: only used on the allow-listed surfaces.
 * @param {{
 *   className?: string,
 *   children: React.ReactNode,
 *   [key: string]: any
 * }} props
 */
export function GlassPanel({ className = '', children, ...rest }) {
  return (
    <div className={`glass-panel ${className}`} {...rest}>
      {children}
    </div>
  );
}
