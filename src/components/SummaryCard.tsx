type SummaryCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

const toneClasses = {
  neutral: "border-slate-200 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900"
};

export function SummaryCard({ label, value, tone = "neutral" }: SummaryCardProps) {
  return (
    <article className={`rounded-lg border p-4 shadow-card ${toneClasses[tone]}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
    </article>
  );
}

