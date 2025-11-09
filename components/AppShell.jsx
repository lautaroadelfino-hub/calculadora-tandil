"use client";

export default function AppShell({ children, showLeft = false }) {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        {showLeft ? (
          <aside className="hidden xl:block col-span-3">
            {/* Reemplazá este placeholder por tu SideRailLeft real si lo querés mantener */}
            <div className="rounded-2xl border p-3 text-sm text-neutral-600">
              Panel izquierdo
            </div>
          </aside>
        ) : null}

        <main className={`col-span-12 ${showLeft ? "xl:col-span-9" : "xl:col-span-12"} space-y-6`}>
          {children}
        </main>
      </div>
    </div>
  );
}
