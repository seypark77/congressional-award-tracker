"use client";

import React, { useEffect, useState } from "react";
import { PROGRAM_AREAS } from "@/lib/constants";
import { GoalItem, HourLogEntry, ProgramAreaId } from "@/lib/types";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  PlusCircle,
  FileText,
  Sparkles,
} from "lucide-react";

interface QuickLogFormProps {
  goals: GoalItem[];
  logs: HourLogEntry[];
  activityStartDate: string;
  onAddLog: (entry: Omit<HourLogEntry, "id" | "createdAt">) => void;
  onNavigateToGoals?: () => void;
  compact?: boolean;
}

export default function QuickLogForm({
  goals,
  logs,
  activityStartDate,
  onAddLog,
  onNavigateToGoals,
  compact = false,
}: QuickLogFormProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDate =
    activityStartDate && todayStr < activityStartDate
      ? activityStartDate
      : todayStr;

  const [area, setArea] = useState<ProgramAreaId>("VPS");
  const [goalNumber, setGoalNumber] = useState<number>(1);
  const [date, setDate] = useState<string>(defaultDate);
  const [hours, setHours] = useState<string>("2.0");
  const [activityDescription, setActivityDescription] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");
  const [isIndirectService, setIsIndirectService] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const areaGoals = goals
    .filter((g) => g.area === area)
    .sort((a, b) => a.goalNumber - b.goalNumber);

  // Sync goalNumber and default organization when area changes
  useEffect(() => {
    const matchingGoals = goals
      .filter((g) => g.area === area)
      .sort((a, b) => a.goalNumber - b.goalNumber);
    if (matchingGoals.length > 0) {
      const firstGoal = matchingGoals[0];
      setGoalNumber(firstGoal.goalNumber);
      setOrganization(firstGoal.organizationDefault || "");
    } else {
      setGoalNumber(1);
      setOrganization("");
    }
    if (area !== "VPS") {
      setIsIndirectService(false);
    }
  }, [area, goals]);

  const handleGoalChange = (newGoalNumber: number) => {
    setGoalNumber(newGoalNumber);
    const found = areaGoals.find((g) => g.goalNumber === newGoalNumber);
    if (found?.organizationDefault) {
      setOrganization(found.organizationDefault);
    }
  };

  // Calculate projected VPS Indirect % if area === "VPS"
  const vpsLogs = logs.filter((l) => l.area === "VPS");
  const currentVpsTotal = vpsLogs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
  const currentVpsIndirect = vpsLogs.reduce(
    (sum, l) => sum + (l.isIndirectService ? Number(l.hours) || 0 : 0),
    0
  );
  const parsedHours = parseFloat(hours) || 0;
  const projectedVpsTotal = currentVpsTotal + (area === "VPS" ? parsedHours : 0);
  const projectedVpsIndirect =
    currentVpsIndirect + (area === "VPS" && isIndirectService ? parsedHours : 0);
  const projectedIndirectPct =
    projectedVpsTotal > 0
      ? Math.round((projectedVpsIndirect / projectedVpsTotal) * 1000) / 10
      : 0;

  const isBeforeStartDate =
    Boolean(activityStartDate) && Boolean(date) && date < activityStartDate;

  const handleQuickHours = (val: number) => {
    setHours(val.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessBanner(null);

    if (!date) {
      setErrorMsg("Please select an activity date.");
      return;
    }

    if (activityStartDate && date < activityStartDate) {
      setErrorMsg(
        `Activities cannot be logged before your Official Activity Start Date (${activityStartDate}).`
      );
      return;
    }

    const numericHours = parseFloat(hours);
    if (isNaN(numericHours) || numericHours <= 0 || numericHours > 24) {
      setErrorMsg("Please enter valid decimal hours between 0.25 and 24.0.");
      return;
    }

    if (!activityDescription.trim()) {
      setErrorMsg("Please provide a brief description of the activity performed.");
      return;
    }

    onAddLog({
      date,
      area,
      goalNumber,
      activityDescription: activityDescription.trim(),
      organization: organization.trim(),
      hours: Math.round(numericHours * 100) / 100,
      isIndirectService: area === "VPS" ? isIndirectService : false,
    });

    setActivityDescription("");
    setSuccessBanner(
      `Logged ${numericHours.toFixed(2)} hrs to ${area} Goal #${goalNumber} (${date})`
    );
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg tracking-tight">
              Quick Hour Log Entry
            </h2>
            <p className="text-xs text-slate-300">
              Official Workbook format • Validated against Start Date ({activityStartDate || "Not set"})
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium bg-white/10 px-2.5 py-1 rounded-full text-amber-300">
          <Sparkles className="w-3.5 h-3.5" /> Instant Save
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successBanner && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Program Area Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            1. Program Area
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["VPS", "PD", "PF"] as ProgramAreaId[]).map((areaId) => {
              const meta = PROGRAM_AREAS[areaId];
              const isSelected = area === areaId;
              return (
                <button
                  key={areaId}
                  type="button"
                  onClick={() => setArea(areaId)}
                  className={`py-2.5 px-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? areaId === "VPS"
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : areaId === "PD"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-rose-600 border-rose-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold">{areaId}</span>
                  <span
                    className={`text-[11px] leading-tight mt-0.5 line-clamp-1 ${
                      isSelected ? "text-white/90" : "text-slate-500"
                    }`}
                  >
                    {meta.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Goal Selector & Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Goal Number ({area} Max {PROGRAM_AREAS[area].maxGoals})
              </label>
              {onNavigateToGoals && (
                <button
                  type="button"
                  onClick={onNavigateToGoals}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                >
                  Manage Goals →
                </button>
              )}
            </div>
            {areaGoals.length > 0 ? (
              <select
                value={goalNumber}
                onChange={(e) => handleGoalChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {areaGoals.map((g) => (
                  <option key={g.id} value={g.goalNumber}>
                    Goal #{g.goalNumber}: {g.title}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={goalNumber}
                onChange={(e) => setGoalNumber(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {Array.from(
                  { length: PROGRAM_AREAS[area].maxGoals },
                  (_, i) => i + 1
                ).map((num) => (
                  <option key={num} value={num}>
                    Goal #{num} (Unconfigured — Add details in Goals tab)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              3. Activity Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                min={activityStartDate || undefined}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  isBeforeStartDate
                    ? "border-red-400 bg-red-50 text-red-900 focus:ring-red-500/20"
                    : "border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-blue-500/20"
                }`}
              />
            </div>
            {isBeforeStartDate && (
              <p className="mt-1 text-[11px] font-medium text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Cannot be earlier than Start Date ({activityStartDate})
              </p>
            )}
          </div>
        </div>

        {/* Hours (Decimal) + Quick Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              4. Hours (Decimal Format)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[0.5, 1, 1.5, 2, 3, 4].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickHours(preset)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      parseFloat(hours) === preset
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {preset}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              5. Organization <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Community Food Bank, Track Club..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* VPS Direct vs Indirect Service Toggle */}
        {area === "VPS" && (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-blue-950">
                  VPS Service Type Classification
                </span>
                <p className="text-[11px] text-blue-800">
                  Official Guideline: At least 75% should be Direct Service; Indirect Service (drives, prep, fundraising) max 25%.
                </p>
              </div>
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-blue-200">
                <button
                  type="button"
                  onClick={() => setIsIndirectService(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    !isIndirectService
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Direct Service
                </button>
                <button
                  type="button"
                  onClick={() => setIsIndirectService(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    isIndirectService
                      ? "bg-amber-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Indirect Service
                </button>
              </div>
            </div>
            {isIndirectService && projectedIndirectPct > 25 && (
              <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Heads up: Logging this as Indirect Service brings your total VPS Indirect Service to{" "}
                  <strong>{projectedIndirectPct}%</strong> (exceeds the 25% recommended limit).
                </span>
              </div>
            )}
          </div>
        )}

        {/* Activity Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            6. Activity Description (Action-Oriented)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <textarea
              rows={compact ? 2 : 2}
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              placeholder="Describe specific actions taken (e.g., 'Sorted 400 lbs of produce and assisted 30 families at check-in')..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isBeforeStartDate}
          className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Log {hours || "0"} Hours to {area} Goal #{goalNumber}
        </button>
      </form>
    </div>
  );
}
