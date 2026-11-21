export function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <label className="grid w-full max-w-xs gap-2 text-sm font-bold text-muted-foreground">
      <span>{label}</span>
      <progress value={value} max={Math.max(total, 1)} className="h-2 w-full accent-primary" />
    </label>
  );
}
