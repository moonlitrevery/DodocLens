import { NavLink } from "react-router-dom";

const linkBase =
  "block rounded-lg px-3 py-2.5 text-[15px] font-medium leading-snug tracking-wide transition-colors duration-theme";

function navClass(isActive: boolean) {
  if (isActive) {
    return `${linkBase} bg-dl-violet text-white shadow-card`;
  }
  return `${linkBase} text-dl-muted hover:bg-white/5 hover:text-dl-purple`;
}

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <aside
      id="app-sidebar"
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-[min(17rem,88vw)] -translate-x-full flex-col border-r border-dl-border bg-dl-bg-deep shadow-ambient transition-transform duration-theme md:static md:z-0 md:w-56 md:translate-x-0 md:shadow-none lg:w-60",
        mobileOpen ? "translate-x-0" : "",
      ].join(" ")}
    >
      <div className="border-b border-dl-border px-4 py-6 md:py-8">
        <p className="section-kicker">Espaço de trabalho</p>
        <h1 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-white md:text-[1.6rem]">
          DodocLens
        </h1>
        <p className="mt-2 text-sm font-normal leading-relaxed text-dl-muted">
          Seus documentos ficam só com você. Busca inteligente, sem internet.
        </p>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 p-3"
        aria-label="Navegação principal"
      >
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.25px] text-dl-muted/80">
          Navegar
        </p>
        <NavLink
          to="/"
          end
          onClick={onCloseMobile}
          className={({ isActive }) => navClass(isActive)}
        >
          Enviar
        </NavLink>
        <NavLink
          to="/documents"
          onClick={onCloseMobile}
          className={({ isActive }) => navClass(isActive)}
        >
          Documentos
        </NavLink>
        <NavLink
          to="/search"
          onClick={onCloseMobile}
          className={({ isActive }) => navClass(isActive)}
        >
          Busca
        </NavLink>
      </nav>

      <div className="border-t border-dl-border p-3">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.25px] text-dl-muted/70">
          Versão
        </p>
        <p className="mt-2 px-3 font-mono text-xs text-dl-code">v0.1 · local-first</p>
      </div>
    </aside>
  );
}
