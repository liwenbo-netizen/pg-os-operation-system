import {
  ArrowRight,
  CircleCheck,
  Inbox,
  ShieldAlert,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { StatusBadge } from "./StatusBadge";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type OperatingPageHeaderProps = {
  title: string;
  description: string;
  pageType: string;
  role: string;
  status?: ReactNode;
};

export function OperatingPageHeader({
  title,
  description,
  pageType,
  role,
  status
}: OperatingPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info">{pageType}</StatusBadge>
          <StatusBadge tone="neutral">{role}</StatusBadge>
          {status}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </header>
  );
}

type NextActionBarProps = {
  heading: string;
  status: string;
  statusTone?: Tone;
  nextActionLabel: string;
  nextAction: string;
  ownerLabel: string;
  owner: string;
  blockerLabel: string;
  blocker?: string;
  dueDateLabel: string;
  dueDate: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

export function NextActionBar({
  heading,
  status,
  statusTone = "neutral",
  nextActionLabel,
  nextAction,
  ownerLabel,
  owner,
  blockerLabel,
  blocker,
  dueDateLabel,
  dueDate,
  actionLabel,
  onAction,
  actionDisabled = false
}: NextActionBarProps) {
  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:px-5" aria-labelledby="next-action-heading">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p id="next-action-heading" className="text-sm font-semibold text-slate-950">
              {heading}
            </p>
            <StatusBadge tone={statusTone}>{status}</StatusBadge>
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.7fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)]">
            <DecisionField label={nextActionLabel} value={nextAction} strong />
            <DecisionField label={ownerLabel} value={owner} />
            <DecisionField label={dueDateLabel} value={dueDate} />
          </div>
          {blocker ? (
            <div className="mt-3 flex items-start gap-2 border-l-2 border-rose-400 pl-3 text-sm text-rose-800">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold">{blockerLabel}: </span>
                {blocker}
              </p>
            </div>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <button
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DecisionField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 break-words text-sm text-slate-700", strong && "font-semibold text-slate-950")}>{value}</p>
    </div>
  );
}

export type MetricStripItem = {
  label: string;
  value: string;
  tone?: Exclude<Tone, "info">;
  detail?: string;
};

const metricToneClasses: Record<NonNullable<MetricStripItem["tone"]>, string> = {
  neutral: "text-slate-950",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700"
};

export function MetricStrip({ items, label }: { items: MetricStripItem[]; label: string }) {
  return (
    <section
      className="grid overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4"
      aria-label={label}
    >
      {items.map((item, index) => (
        <article
          key={item.label}
          className={cn(
            "min-w-0 px-4 py-3",
            index > 0 && "border-t border-slate-200 sm:border-t-0 sm:border-l",
            index > 1 && "sm:border-t xl:border-t-0"
          )}
        >
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <p className={cn("mt-1 text-xl font-semibold", metricToneClasses[item.tone ?? "neutral"])}>{item.value}</p>
          {item.detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p> : null}
        </article>
      ))}
    </section>
  );
}

type GuidedEmptyStateProps = {
  title: string;
  description: string;
  ownerLabel: string;
  owner: string;
  success?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function GuidedEmptyState({
  title,
  description,
  ownerLabel,
  owner,
  success = false,
  actionLabel,
  onAction
}: GuidedEmptyStateProps) {
  const Icon: LucideIcon = success ? CircleCheck : Inbox;

  return (
    <div className="flex min-h-48 flex-col items-start justify-center border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
      <div className={cn("flex size-9 items-center justify-center rounded-lg", success ? "bg-emerald-100 text-emerald-700" : "bg-white text-blue-600")}>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{ownerLabel}: </span>
        {owner}
      </p>
      {actionLabel && onAction ? (
        <button
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function WorkspaceLayout({
  queue,
  detail,
  context
}: {
  queue: ReactNode;
  detail: ReactNode;
  context: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="min-w-0">{queue}</aside>
      <main className="min-w-0 space-y-4">{detail}</main>
      <aside className="min-w-0">{context}</aside>
    </div>
  );
}
