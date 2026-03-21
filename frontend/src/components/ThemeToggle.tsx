import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-theme hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-700 to-accent" />
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
