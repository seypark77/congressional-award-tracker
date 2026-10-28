import { AWARD_LEVELS, PROGRAM_AREAS } from "./constants";
import {
  AwardLevelRequirement,
  CongressionalAwardState,
  GoalItem,
  HourLogEntry,
  ProgramAreaId,
} from "./types";

export interface AreaStats {
  area: ProgramAreaId;
  totalHours: number;
  requiredHours: number;
  hoursProgressPercent: number;
  distinctMonths: string[]; // sorted YYYY-MM
  distinctMonthsCount: number;
  requiredMonths: number;
  monthsProgressPercent: number;
  indirectHours: number;
  directHours: number;
  indirectPercentage: number;
  isIndirectOverLimit: boolean; // > 25% for VPS
  preStartDateEntriesCount: number;
}

export interface GoalStats {
  goal: GoalItem;
  totalHours: number;
  distinctMonths: string[];
  entriesCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

export function getMonthKey(dateStr: string): string {
  // Expects YYYY-MM-DD
  if (!dateStr || dateStr.length < 7) return "";
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function calculateAreaStats(
  area: ProgramAreaId,
  logs: HourLogEntry[],
  targetRequirement: AwardLevelRequirement,
  activityStartDate: string
): AreaStats {
  const areaLogs = logs.filter((l) => l.area === area);
  const requiredHours =
    area === "VPS"
      ? targetRequirement.vpsHours
      : area === "PD"
      ? targetRequirement.pdHours
      : targetRequirement.pfHours;
  const requiredMonths = targetRequirement.minMonths;

  let totalHours = 0;
  let indirectHours = 0;
  let preStartDateEntriesCount = 0;
  const monthSet = new Set<string>();

  for (const entry of areaLogs) {
    const hrs = Number(entry.hours) || 0;
    totalHours += hrs;
    if (area === "VPS" && entry.isIndirectService) {
      indirectHours += hrs;
    }
    const mKey = getMonthKey(entry.date);
    if (mKey) {
      monthSet.add(mKey);
    }
    if (activityStartDate && entry.date < activityStartDate) {
      preStartDateEntriesCount += 1;
    }
  }

  totalHours = Math.round(totalHours * 100) / 100;
  indirectHours = Math.round(indirectHours * 100) / 100;
  const directHours = Math.round((totalHours - indirectHours) * 100) / 100;

  const distinctMonths = Array.from(monthSet).sort();
  const distinctMonthsCount = distinctMonths.length;

  const hoursProgressPercent =
    requiredHours > 0
      ? Math.min(100, Math.round((totalHours / requiredHours) * 100))
      : 100;

  const monthsProgressPercent =
    requiredMonths > 0
      ? Math.min(100, Math.round((distinctMonthsCount / requiredMonths) * 100))
      : 100;

  const indirectPercentage =
    totalHours > 0 ? Math.round((indirectHours / totalHours) * 1000) / 10 : 0;

  const isIndirectOverLimit = area === "VPS" && indirectPercentage > 25;

  return {
    area,
    totalHours,
    requiredHours,
    hoursProgressPercent,
    distinctMonths,
    distinctMonthsCount,
    requiredMonths,
    monthsProgressPercent,
    indirectHours,
    directHours,
    indirectPercentage,
    isIndirectOverLimit,
    preStartDateEntriesCount,
  };
}

export function calculateGoalStats(
  goal: GoalItem,
  logs: HourLogEntry[]
): GoalStats {
  const goalLogs = logs
    .filter((l) => l.area === goal.area && l.goalNumber === goal.goalNumber)
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalHours = 0;
  const monthSet = new Set<string>();

  for (const entry of goalLogs) {
    totalHours += Number(entry.hours) || 0;
    const mKey = getMonthKey(entry.date);
    if (mKey) monthSet.add(mKey);
  }

  totalHours = Math.round(totalHours * 100) / 100;

  return {
    goal,
    totalHours,
    distinctMonths: Array.from(monthSet).sort(),
    entriesCount: goalLogs.length,
    firstDate: goalLogs.length > 0 ? goalLogs[0].date : null,
    lastDate: goalLogs.length > 0 ? goalLogs[goalLogs.length - 1].date : null,
  };
}

export function calculateTimeSpanHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) return 0;
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

/**
 * Generates Official CSV matching the exact columns of the official Hour Log:
 * Date, Program Area, Goal Number, Activity Description, Organization, Hours
 */
export function generateOfficialHourLogCsv(logs: HourLogEntry[]): string {
  const headers = [
    "Date",
    "Program Area",
    "Goal Number",
    "Activity Description",
    "Organization",
    "Hours",
  ];

  const escapeCsvCell = (value: string | number): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const sortedLogs = [...logs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.area.localeCompare(b.area);
  });

  const rows = sortedLogs.map((entry) => [
    escapeCsvCell(entry.date),
    escapeCsvCell(PROGRAM_AREAS[entry.area].name),
    escapeCsvCell(`Goal #${entry.goalNumber}`),
    escapeCsvCell(
      entry.area === "VPS" && entry.isIndirectService
        ? `${entry.activityDescription} [Indirect Service]`
        : entry.activityDescription
    ),
    escapeCsvCell(entry.organization || ""),
    escapeCsvCell(Number(entry.hours).toFixed(2)),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Generates structured Submittable Copy-Paste sections for easy submission
 */
export function generateSubmittableSections(state: CongressionalAwardState) {
  const targetReq = AWARD_LEVELS[state.profile.targetLevel];
  const areas: ProgramAreaId[] = ["VPS", "PD", "PF"];

  const areaSummaries = areas.map((areaId) => {
    const areaMeta = PROGRAM_AREAS[areaId];
    const stats = calculateAreaStats(
      areaId,
      state.logs,
      targetReq,
      state.profile.activityStartDate
    );
    const areaGoals = state.goals
      .filter((g) => g.area === areaId)
      .sort((a, b) => a.goalNumber - b.goalNumber);

    const goalBlocks = areaGoals.map((goal) => {
      const gStats = calculateGoalStats(goal, state.logs);
      const goalLogs = state.logs
        .filter((l) => l.area === areaId && l.goalNumber === goal.goalNumber)
        .sort((a, b) => a.date.localeCompare(b.date));

      const activityBullets = goalLogs
        .map(
          (l) =>
            `• ${l.date} (${Number(l.hours).toFixed(2)} hrs${
              l.organization ? ` @ ${l.organization}` : ""
            }${
              l.area === "VPS"
                ? l.isIndirectService
                  ? " - Indirect"
                  : " - Direct"
                : ""
            }): ${l.activityDescription}`
        )
        .join("\n");

      const textBlock = [
        `=== ${areaMeta.name.toUpperCase()} — GOAL #${goal.goalNumber} ===`,
        `Goal Statement: ${goal.title}`,
        `Goal Plan & Description: ${goal.description}`,
        `Primary Organization: ${goal.organizationDefault || "N/A"}`,
        `Total Logged Hours for Goal #${goal.goalNumber}: ${gStats.totalHours.toFixed(2)} hrs`,
        `Active Date Span: ${
          gStats.firstDate && gStats.lastDate
            ? `${gStats.firstDate} to ${gStats.lastDate} (${gStats.distinctMonths.length} active month(s): ${gStats.distinctMonths
                .map(formatMonthLabel)
                .join(", ")})`
            : "No activities logged yet"
        }`,
        `Validator Name: ${goal.validator.name || "Not specified"}`,
        `Validator Title/Role: ${goal.validator.role || "Not specified"}`,
        `Validator Email: ${goal.validator.email || "Not specified"}${
          goal.validator.phone ? ` | Phone: ${goal.validator.phone}` : ""
        }`,
        `Non-Family Adult Confirmed: ${
          goal.validator.isNonFamilyConfirmed ? "Yes (Verified Non-Family)" : "Pending Verification"
        }`,
        ``,
        `Activity Log Breakdown (${gStats.entriesCount} entries):`,
        activityBullets || "No hours logged for this goal yet.",
      ].join("\n");

      return {
        goal,
        gStats,
        textBlock,
      };
    });

    const overallAreaText = [
      `############################################################`,
      `${areaMeta.name.toUpperCase()} (${areaId}) — OVERALL SUMMARY`,
      `Target Requirement (${targetReq.name}): ${stats.requiredHours} Hours | ${stats.requiredMonths} Active Months`,
      `Completed: ${stats.totalHours.toFixed(2)} Hours | ${stats.distinctMonthsCount} Distinct Months (${stats.distinctMonths
        .map(formatMonthLabel)
        .join(", ")})`,
      areaId === "VPS"
        ? `Service Split: Direct = ${stats.directHours.toFixed(2)} hrs (${(
            100 - stats.indirectPercentage
          ).toFixed(1)}%) | Indirect = ${stats.indirectHours.toFixed(2)} hrs (${
            stats.indirectPercentage
          }%)${
            stats.isIndirectOverLimit
              ? " [WARNING: Indirect service exceeds 25% guideline]"
              : " [Compliant: Indirect <= 25%]"
          }`
        : null,
      `############################################################`,
      ``,
      ...goalBlocks.map((b) => b.textBlock + "\n"),
    ]
      .filter((line) => line !== null)
      .join("\n");

    return {
      areaId,
      areaName: areaMeta.name,
      stats,
      goalBlocks,
      overallAreaText,
    };
  });

  const exp = state.expedition;
  const expeditionText = [
    `=== EXPEDITION / EXPLORATION SUBMISSION SUMMARY ===`,
    `Format: ${exp.type} (${
      exp.mode === "in_person" ? "In-Person" : "Virtual Experience"
    })`,
    `Title: ${exp.title}`,
    `Destination / Theme: ${exp.locationOrTheme}`,
    `Dates: ${exp.startDate || "TBD"} to ${exp.endDate || "TBD"} (${
      exp.nightsCount
    } Consecutive Night(s))`,
    `Target Level Requirement (${targetReq.name}): ${targetReq.expeditionDescription}`,
    ``,
    `Overview & Participant Planning:`,
    exp.overview || "N/A",
    ``,
    `Validator Information:`,
    `Name: ${exp.validator.name} (${exp.validator.role})`,
    `Email: ${exp.validator.email}${
      exp.validator.phone ? ` | Phone: ${exp.validator.phone}` : ""
    }`,
    `Non-Family Adult Confirmed: ${
      exp.validator.isNonFamilyConfirmed ? "Yes" : "Pending"
    }`,
    ``,
    exp.mode === "in_person"
      ? [
          `--- DAILY TIMESTAMPED LOG (6–8 HOURS/DAY REQUIREMENT) ---`,
          ...exp.inPersonDays.map(
            (d) =>
              `Day ${d.dayNumber} (${d.date}): ${d.startTime} – ${d.endTime} (${d.activeHours} active hrs)\n  Route/Location: ${d.locationOrRoute}\n  Overnight: ${d.overnightLocation}\n  Activities: ${d.activitiesSummary}`
          ),
        ].join("\n")
      : [
          `--- VIRTUAL IMMERSION CHECKLIST ---`,
          ...exp.virtualActivities.map(
            (a, i) =>
              `${i + 1}. [${a.completed ? "COMPLETED" : "PENDING"}] ${
                a.title
              } (${a.dateCompleted}, ${a.hoursSpent} hrs) — ${a.resourceOrUrl}\n   Notes: ${
                a.notes
              }`
          ),
          ``,
          `--- OFFICIAL 7 VIRTUAL REFLECTION QUESTIONS ---`,
          ...exp.virtualReflections.map(
            (r) => `${r.question}\nAnswer: ${r.answer || "(Not answered yet)"}\n`
          ),
        ].join("\n"),
  ].join("\n");

  const profileHeaderText = [
    `=== CONGRESSIONAL AWARD PARTICIPANT & ADVISOR RECORD ===`,
    `Participant Name: ${state.profile.name}`,
    `Target Award Level: ${targetReq.name} (${targetReq.tier})`,
    `Official Activity Start Date: ${state.profile.activityStartDate}`,
    `State / Congressional District: ${state.profile.stateOrDistrict || "Not specified"}`,
    `Advisor Name: ${state.profile.advisor.name}`,
    `Advisor Role: ${state.profile.advisor.role}`,
    `Advisor Email: ${state.profile.advisor.email}${
      state.profile.advisor.phone ? ` | Phone: ${state.profile.advisor.phone}` : ""
    }`,
    `Advisor Non-Family Verification: ${
      state.profile.advisor.isNonFamilyConfirmed
        ? "Confirmed Non-Family Adult"
        : "Pending Verification"
    }`,
  ].join("\n");

  const fullPacketText = [
    profileHeaderText,
    "",
    ...areaSummaries.map((a) => a.overallAreaText),
    expeditionText,
  ].join("\n");

  return {
    profileHeaderText,
    areaSummaries,
    expeditionText,
    fullPacketText,
  };
}
