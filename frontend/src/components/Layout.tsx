import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-dl-bg font-sans text-white">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-dl-bg-deep/70 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-dl-border bg-dl-bg/95 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="btn-glass rounded-lg px-3 py-2"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              {mobileNavOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold tracking-tight">
              DodocLens
            </div>
            <p className="truncate text-xs uppercase tracking-[0.2px] text-dl-muted">
              Local document intelligence
            </p>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-content flex-1 px-4 py-8 sm:px-8 md:py-10 lg:px-16">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
