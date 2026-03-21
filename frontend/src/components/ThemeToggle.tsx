import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-brand-900 dark:text-slate-200 dark:hover:bg-brand-800"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-700 to-accent" />
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
