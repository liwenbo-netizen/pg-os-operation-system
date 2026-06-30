import { ArrowRight, BookOpen, Clock3, UserRound } from "lucide-react";

type RightRailProps = {
  owner: string;
  blocker: string;
  nextAction: string;
  sop: string;
};

export function RightRail({ owner, blocker, nextAction, sop }: RightRailProps) {
  const items = [
    { icon: UserRound, label: "Owner", value: owner },
    { icon: Clock3, label: "Blocker", value: blocker },
    { icon: ArrowRight, label: "Next action", value: nextAction },
    { icon: BookOpen, label: "SOP", value: sop }
  ];

  return (
    <aside className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <item.icon className="size-4 text-blue-600" aria-hidden="true" />
            {item.label}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.value}</p>
        </div>
      ))}
    </aside>
  );
}

