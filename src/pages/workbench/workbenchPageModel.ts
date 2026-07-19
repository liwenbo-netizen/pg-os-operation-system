import type { WorkbenchTask } from "../../types/domain";
import type { AppLocale } from "../../lib/i18n";

export type WorkbenchTaskActionKind = "start" | "continue" | "blocked" | "none";

export function getWorkbenchTaskAction(task?: WorkbenchTask): {
  kind: WorkbenchTaskActionKind;
  disabled: boolean;
} {
  if (!task || task.status === "done") {
    return { kind: "none", disabled: true };
  }

  if (task.status === "blocked") {
    return { kind: "blocked", disabled: true };
  }

  return {
    kind: task.status === "in_progress" ? "continue" : "start",
    disabled: false
  };
}

export function getWorkbenchMetricValues(summary: {
  myTasks: number;
  p0: number;
  blocked: number;
  okrAtRisk: number;
}) {
  return [summary.myTasks, summary.p0, summary.blocked, summary.okrAtRisk];
}

const chineseModuleLabels: Record<WorkbenchTask["module"], string> = {
  Media: "媒体",
  Sales: "销售",
  Campaigns: "Campaign",
  Diagnostics: "诊断",
  Finance: "财务",
  Contracts: "合同",
  Guide: "SOP 指南",
  Admin: "系统管理",
  Workbench: "角色工作台"
};

export function getWorkbenchModuleDisplayName(module: WorkbenchTask["module"], locale: AppLocale) {
  return locale === "zh-CN" ? chineseModuleLabels[module] : module;
}

const exactChineseTaskTitles: Record<string, string> = {
  "Convert qualified China ecosystem lead": "转化已通过资格筛选的中国媒体生态机会",
  "Close settlement dispute before finance confirmation": "在财务确认前解决结算争议",
  "Publish launch escalation SOP": "发布上线升级 SOP"
};

const chineseTaskTitlePatterns: Array<[RegExp, string]> = [
  [/^Handle contract: (.+)$/, "处理合同：$1"],
  [/^Complete commercial validation: (.+)$/, "完成商业验证：$1"],
  [/^Plan commercial validation: (.+)$/, "规划商业验证：$1"],
  [/^Approve proposal: (.+)$/, "审批提案：$1"],
  [/^Approve (.+) proposal$/, "审批 $1 提案"],
  [/^Prepare launch: (.+)$/, "准备上线：$1"],
  [/^Process settlement: (.+)$/, "处理结算：$1"],
  [/^Confirm onboarding handoff: (.+)$/, "确认准入交接：$1"],
  [/^Start technical integration: (.+)$/, "启动技术集成：$1"],
  [/^Evaluate trusted supply: (.+)$/, "评估可信供给：$1"],
  [/^Confirm trusted supply pool: (.+)$/, "确认可信供给池：$1"],
  [/^Create controlled supply package: (.+)$/, "创建受控供给包：$1"],
  [/^Activate supply package: (.+)$/, "激活供给包：$1"],
  [/^Review trusted supply quality: (.+)$/, "复核可信供给质量：$1"],
  [/^Publish SOP: (.+)$/, "发布 SOP：$1"],
  [/^Resolve (DC-[^ ]+) (.+)$/, "处理 $1：$2"],
  [/^Approve (.+) framework contract review$/, "审批 $1 框架合同复核"],
  [/^Resolve (.+) scale blocker$/, "解决 $1 规模化阻塞"],
  [/^Resolve (.+)$/, "处理：$1"]
];

export function getWorkbenchTaskDisplayTitle(task: WorkbenchTask, locale: AppLocale) {
  if (locale !== "zh-CN") {
    return task.title;
  }

  const exactTitle = exactChineseTaskTitles[task.title];
  if (exactTitle) {
    return exactTitle;
  }

  for (const [pattern, replacement] of chineseTaskTitlePatterns) {
    if (pattern.test(task.title)) {
      return task.title.replace(pattern, replacement);
    }
  }

  return task.title;
}
