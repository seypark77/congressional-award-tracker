"use client";

import React from "react";
import { AWARD_LEVELS, PROGRAM_AREAS } from "@/lib/constants";
import {
  calculateAreaStats,
  formatMonthLabel,
} from "@/lib/awardUtils";
import {
  AwardLevelId,
  CongressionalAwardState,
  HourLogEntry,
  ProgramAreaId,
} from "@/lib/types";
import QuickLogForm from "./QuickLogForm";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Clock,
  ArrowRight,
} from "lucide-react";

interface DashboardOverviewProps {
  state: CongressionalAwardState;
  onTargetLevelChange: (level: AwardLevelId) => void;
  onAddLog: (entry: Omit<HourLogEntry, "id" | "createdAt">) => void;
  onNavigateTab: (tab: string) => void;
  onExportCsv: () => void;
}

export default function DashboardOverview({
  state,
  onTargetLevelChange,
  onAddLog,
  onNavigateTab,
  onExportCsv,
}: DashboardOverviewProps) {
  const targetReq = AWARD_LEVELS[state.profile.targetLevel];
  const areas: ProgramAreaId[] = ["VPS", "PD", "PF"];

  const areaStatsMap = {
    VPS: calculateAreaStats(
      "VPS",
      state.logs,
      targetReq,
      state.profile.activityStartDate
    ),
    PD: calculateAreaStats(
      "PD",
      state.logs,
      targetReq,
      state.profile.activityStartDate
    ),
    PF: calculateAreaStats(
      "PF",
      state.logs,
      targetReq,
      state.profile.activityStartDate
    ),
  };

  const totalHoursLogged =
    Math.round(
      (areaStatsMap.VPS.totalHours +
        areaStatsMap.PD.totalHours +
        areaStatsMap.PF.totalHours) *
        100
    ) / 100;

  const totalHoursRequired =
    targetReq.vpsHours + targetReq.pdHours + targetReq.pfHours;

  // Expedition progress check
  const exp = state.expedition;
  const expDaysLogged =
    exp.mode === "in_person"
      ? exp.inPersonDays.length
      : exp.virtualActivities.filter((a) => a.completed).length;
  const expQualifiedDays =
    exp.mode === "in_person"
      ? exp.inPersonDays.filter((d) => d.activeHours >= 6).length
      : expDaysLogged;
  const expReflectionsAnswered = exp.virtualReflections.filter(
    (r) => r.answer.trim().length > 10
  ).length;

  const expProgressPct =
    exp.mode === "in_person"
      ? Math.min(
          100,
          Math.round(
            (expQualifiedDays / Math.max(1, targetReq.expeditionDays)) * 100
          )
        )
      : Math.min(
          100,
          Math.round(((expReflectionsAnswered / 7) * 0.6 + (expDaysLogged > 0 ? 0.4 : 0)) * 100)
        );

  const overallCompletionPct = Math.round(
    (areaStatsMap.VPS.hoursProgressPercent +
      areaStatsMap.VPS.monthsProgressPercent +
      areaStatsMap.PD.hoursProgressPercent +
      areaStatsMap.PD.monthsProgressPercent +
      areaStatsMap.PF.hoursProgressPercent +
      areaStatsMap.PF.monthsProgressPercent +
      expProgressPct) /
      7
  );

  const recentLogs = [...state.logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Participant & Target Medal Summary Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-blue-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>The Congressional Award Program Workbook</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {state.profile.name || "Participant"}&apos;s Progress Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Activity Start Date:{" "}
                <strong className="text-white">
                  {state.profile.activityStartDate || "Not Set"}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Advisor:{" "}
                <strong className="text-white">
                  {state.profile.advisor.name || "Not Set"}
                </strong>
                {state.profile.advisor.isNonFamilyConfirmed && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                    Non-Family Verified
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Target Award Level Switcher + Overall Readiness */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/15">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-amber-300 font-bold mb-1">
                Target Award Level
              </label>
              <select
                value={state.profile.targetLevel}
                onChange={(e) =>
                  onTargetLevelChange(e.target.value as AwardLevelId)
                }
                className="w-full sm:w-52 rounded-lg bg-slate-900/90 border border-white/20 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
              >
                <optgroup label="Certificates">
                  <option value="bronze_cert">Bronze Certificate (60h / 6m)</option>
                  <option value="silver_cert">Silver Certificate (120h / 12m)</option>
                  <option value="gold_cert">Gold Certificate (180h / 18m)</option>
                </optgroup>
                <optgroup label="Medals">
                  <option value="bronze_medal">Bronze Medal (200h / 7m)</option>
                  <option value="silver_medal">Silver Medal (400h / 12m)</option>
                  <option value="gold_medal">Gold Medal (800h / 24m)</option>
                </optgroup>
              </select>
            </div>
            <div className="sm:border-l sm:border-white/15 sm:pl-4 flex items-center justify-between sm:block">
              <span className="text-xs text-slate-300 block">
                Overall Readiness
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-amber-400">
                  {overallCompletionPct}%
                </span>
                <span className="text-[11px] text-slate-300">
                  ({totalHoursLogged}/{totalHoursRequired}h)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VPS Indirect Service Warning Banner (if > 25%) */}
      {areaStatsMap.VPS.isIndirectOverLimit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-400 p-4 flex items-start gap-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm text-amber-950">
            <h3 className="font-bold text-amber-950">
              Indirect Service Limit Warning: {areaStatsMap.VPS.indirectPercentage}% of VPS Hours are Indirect
            </h3>
            <p className="text-xs text-amber-900 mt-0.5">
              Official Congressional Award guidelines state that no more than{" "}
              <strong>25%</strong> of Voluntary Public Service hours should come from Indirect Service (e.g., collection drives, administrative prep without direct community interaction). Currently{" "}
              <strong>{areaStatsMap.VPS.indirectHours} hrs</strong> out of{" "}
              <strong>{areaStatsMap.VPS.totalHours} hrs</strong> are flagged as Indirect. Add more Direct Service hours to bring this under 25%.
            </p>
          </div>
        </div>
      )}

      {/* Real-Time Progress Cards per Program Area (Hours + Active Months) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {areas.map((areaId) => {
          const meta = PROGRAM_AREAS[areaId];
          const stats = areaStatsMap[areaId];
          const areaGoals = state.goals.filter((g) => g.area === areaId);
          const unverifiedValidators = areaGoals.filter(
            (g) => !g.validator.name || !g.validator.email || !g.validator.isNonFamilyConfirmed
          ).length;

          return (
            <div
              key={areaId}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.bgLight} ${meta.textColor}`}
                    >
                      {areaId}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      {meta.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => onNavigateTab("goals")}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg"
                  >
                    {areaGoals.length}/{meta.maxGoals} Goals
                  </button>
                </div>

                {/* Hours Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Cumulative Hours
                    </span>
                    <span className="font-bold text-slate-900">
                      {stats.totalHours.toFixed(1)}{" "}
                      <span className="text-slate-400 font-normal">
                        / {stats.requiredHours} hrs
                      </span>{" "}
                      <span className="text-blue-600">
                        ({stats.hoursProgressPercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${meta.progressBarColor} rounded-full transition-all duration-500`}
                      style={{ width: `${stats.hoursProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Active Months Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Active Months
                    </span>
                    <span className="font-bold text-slate-900">
                      {stats.distinctMonthsCount}{" "}
                      <span className="text-slate-400 font-normal">
                        / {stats.requiredMonths} mos
                      </span>{" "}
                      <span className="text-emerald-600">
                        ({stats.monthsProgressPercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.monthsProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Distinct Month Pills */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {stats.distinctMonths.length > 0 ? (
                    stats.distinctMonths.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                      >
                        {formatMonthLabel(m)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      No active months logged yet
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Info: VPS Indirect Service Ratio or Validator Readiness */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {areaId === "VPS" && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Indirect Service:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        stats.isIndirectOverLimit
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {stats.indirectHours}h ({stats.indirectPercentage}% • Max 25%)
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Adult Validators:</span>
                  {areaGoals.length === 0 ? (
                    <span className="text-amber-600 font-medium">
                      Add a goal first
                    </span>
                  ) : unverifiedValidators === 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> All Verified
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">
                      {unverifiedValidators} incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 4th Card: Expedition / Exploration Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
                  EXP / EXPL
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {exp.type} ({exp.mode === "in_person" ? "In-Person" : "Virtual"})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab("expedition")}
                className="text-xs font-medium text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg"
              >
                Open Log →
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
              {exp.title || "Untitled Expedition/Exploration"}
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Requirement ({targetReq.name}):{" "}
              <strong className="text-slate-700">
                {targetReq.expeditionDescription}
              </strong>
            </p>

            {/* Progress bar */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  {exp.mode === "in_person"
                    ? "Qualified Days (6–8h/day)"
                    : "Virtual Checklist & 7 Qs"}
                </span>
                <span className="font-bold text-purple-700">
                  {exp.mode === "in_person"
                    ? `${expQualifiedDays} / ${targetReq.expeditionDays} days`
                    : `${expReflectionsAnswered}/7 Qs`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${expProgressPct}%` }}
                />
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span>Dates:</span>
                <span className="font-medium text-slate-900">
                  {exp.startDate || "TBD"} → {exp.endDate || "TBD"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Consecutive Nights:</span>
                <span className="font-medium text-slate-900">
                  {exp.nightsCount} / {targetReq.expeditionNights} required
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Expedition Validator:</span>
            {exp.validator.name && exp.validator.isNonFamilyConfirmed ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> {exp.validator.name}
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                Needs Verification
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Split: Quick Log Entry + Recent Logs & Submittable/CSV Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <QuickLogForm
            goals={state.goals}
            logs={state.logs}
            activityStartDate={state.profile.activityStartDate}
            onAddLog={onAddLog}
            onNavigateToGoals={() => onNavigateTab("goals")}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Quick Export & Submittable Helper Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Submission & Export Tools
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Submittable Ready
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Generate official Hour Log CSV files or copy formatted goal summaries directly into the Congressional Award Submittable portal.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => onNavigateTab("export")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                Submittable Helper
              </button>
              <button
                onClick={onExportCsv}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Official CSV Log
              </button>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Recent Logged Activities
              </h3>
              <button
                onClick={() => onNavigateTab("logs")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                View All ({state.logs.length}) <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No hours logged yet. Use the Quick Log Entry form to record your first activity!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLogs.map((item) => {
                  const meta = PROGRAM_AREAS[item.area];
                  return (
                    <div
                      key={item.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${meta.bgLight} ${meta.textColor}`}
                          >
                            {item.area} #{item.goalNumber}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {item.date}
                          </span>
                          {item.area === "VPS" && item.isIndirectService && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Indirect
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 font-medium line-clamp-1 mt-1">
                          {item.activityDescription}
                        </p>
                        {item.organization && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {item.organization}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                        {Number(item.hours).toFixed(2)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
