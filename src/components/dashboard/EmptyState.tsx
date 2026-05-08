export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl bg-card p-8 text-center shadow-card">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{message}</div>
    </div>
  );
}
