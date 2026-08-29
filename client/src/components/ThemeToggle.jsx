import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export function ThemeToggle({ size = 'md', className = '' }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('syntara:theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('syntara:theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${size} ${className}`}
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      {isLight ? (
        <Moon size={size === 'sm' ? 16 : 18} className="theme-toggle__icon" />
      ) : (
        <Sun size={size === 'sm' ? 16 : 18} className="theme-toggle__icon" />
      )}
    </button>
  );
}
