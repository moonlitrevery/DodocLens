import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const linkClass =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const activeClass =
  "bg-brand-900 text-white dark:bg-brand-800 dark:text-white";
const idleClass =
  "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-900";

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-brand-950">
      <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent dark:text-accent-muted">
          DodocLens
        </div>
        <h1 className="mt-1 text-lg font-semibold text-brand-950 dark:text-slate-100">
          Document intelligence
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Local OCR, embeddings, and semantic search.
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : idleClass}`
          }
        >
          Upload
        </NavLink>
        <NavLink
          to="/documents"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : idleClass}`
          }
        >
          Documents
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : idleClass}`
          }
        >
          Search
        </NavLink>
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <ThemeToggle />
      </div>
    </aside>
  );
}
