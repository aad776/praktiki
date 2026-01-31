export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-lg bg-white px-8 py-6 shadow-md text-center">
        <h1 className="text-2xl font-semibold text-red-600 mb-2">Unauthorized</h1>
        <p className="text-slate-600 text-sm">
          You do not have permission to access this page.
        </p>
      </div>
    </main>
  );
}

