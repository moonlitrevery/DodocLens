import { createContext, useEffect, type ReactNode } from "react";

/**
 * Design system is dark-first (DESIGN.md). `html` carries `class="dark"` from index.html;
 * this provider syncs color-scheme for native controls.
 */
const ThemeContext = createContext(true);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return (
    <ThemeContext.Provider value={true}>{children}</ThemeContext.Provider>
  );
}
