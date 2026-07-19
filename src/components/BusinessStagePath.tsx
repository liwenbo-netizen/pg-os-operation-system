import { Check, Circle, ShieldAlert } from "lucide-react";
import { cn } from "../lib/cn";
import { StatusBadge } from "./StatusBadge";

export type BusinessStageState = "complete" | "active" | "blocked" | "pending";

export type BusinessStageItem = {
  key: string;
  label: string;
  state: BusinessStageState;
};

export function BusinessStagePath({
  title,
  stages,
  stateLabels
}: {
  title: string;
  stages: BusinessStageItem[];
  stateLabels: Record<BusinessStageState, string>;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card" aria-label={title}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none">
        {stages.map((stage, index) => {
          const Icon = stage.state === "complete" ? Check : stage.state === "blocked" ? ShieldAlert : Circle;
          return (
            <li
              key={stage.key}
              className={cn(
                "min-w-0 border-l-2 px-3 py-2",
                stage.state === "complete" && "border-emerald-400",
                stage.state === "active" && "border-blue-500 bg-blue-50",
                stage.state === "blocked" && "border-rose-400 bg-rose-50",
                stage.state === "pending" && "border-slate-200"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-600">
                  {stage.state === "complete" || stage.state === "blocked" ? <Icon className="size-4" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
                </span>
                <StatusBadge tone={stage.state === "complete" ? "success" : stage.state === "active" ? "info" : stage.state === "blocked" ? "danger" : "neutral"}>
                  {stateLabels[stage.state]}
                </StatusBadge>
              </div>
              <p className="mt-3 break-words text-sm font-semibold text-slate-900">{stage.label}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
