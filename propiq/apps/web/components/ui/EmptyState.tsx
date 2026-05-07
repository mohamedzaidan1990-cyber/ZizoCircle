interface Props {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="card p-10 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-2 text-sm text-slate-600">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
