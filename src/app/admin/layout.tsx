export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-screen bg-slate-50 overflow-auto">
      {children}
    </div>
  );
}
