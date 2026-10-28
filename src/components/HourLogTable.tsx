"use client";

import React, { useMemo, useState } from "react";
import { PROGRAM_AREAS } from "@/lib/constants";
import {
  formatMonthLabel,
  generateOfficialHourLogCsv,
  getMonthKey,
} from "@/lib/awardUtils";
import { GoalItem, HourLogEntry, ProgramAreaId } from "@/lib/types";
import {
  AlertCircle,
  Calendar,
  Check,
  Download,
  Edit3,
  Filter,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface HourLogTableProps {
  logs: HourLogEntry[];
  goals: GoalItem[];
  activityStartDate: string;
  onUpdateLog: (updated: HourLogEntry) => void;
  onDeleteLog: (id: string) => void;
}

export default function HourLogTable({
  logs,
  goals,
  activityStartDate,
  onUpdateLog,
  onDeleteLog,
}: HourLogTableProps) {
  const [filterArea, setFilterArea] = useState<ProgramAreaId | "ALL">("ALL");
  const [filterGoal, setFilterGoal] = useState<number | "ALL">("ALL");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterServiceType, setFilterServiceType] = useState<
    "ALL" | "DIRECT" | "INDIRECT"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<HourLogEntry | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Pre-calculate cumulative hours per area in chronological order
  const cumulativeByLogId = useMemo(() => {
    const map = new Map<string, number>();
    const runningTotals: Record<ProgramAreaId, number> = {
      VPS: 0,
      PD: 0,
      PF: 0,
    };
    const chronological = [...logs].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
    for (const entry of chronological) {
      runningTotals[entry.area] =
        Math.round((runningTotals[entry.area] + (Number(entry.hours) || 0)) * 100) /
        100;
      map.set(entry.id, runningTotals[entry.area]);
    }
    return map;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return [...logs]
      .filter((entry) => {
        if (filterArea !== "ALL" && entry.area !== filterArea) return false;
        if (filterGoal !== "ALL" && entry.goalNumber !== filterGoal)
          return false;
        if (filterStartDate && entry.date < filterStartDate) return false;
        if (filterEndDate && entry.date > filterEndDate) return false;
        if (filterServiceType === "DIRECT" && entry.isIndirectService)
          return false;
        if (filterServiceType === "INDIRECT" && !entry.isIndirectService)
          return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = entry.activityDescription
            .toLowerCase()
            .includes(q);
          const matchOrg = (entry.organization || "")
            .toLowerCase()
            .includes(q);
          if (!matchDesc && !matchOrg) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    logs,
    filterArea,
    filterGoal,
    filterStartDate,
    filterEndDate,
    filterServiceType,
    searchQuery,
  ]);

  const filteredSummary = useMemo(() => {
    let totalHours = 0;
    const months = new Set<string>();
    for (const item of filteredLogs) {
      totalHours += Number(item.hours) || 0;
      const m = getMonthKey(item.date);
      if (m) months.add(m);
    }
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      distinctMonths: Array.from(months).sort(),
    };
  }, [filteredLogs]);

  const handleResetFilters = () => {
    setFilterArea("ALL");
    setFilterGoal("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterServiceType("ALL");
    setSearchQuery("");
  };

  const handleDownloadCsv = (entriesToExport: HourLogEntry[], suffix: string) => {
    const csvContent = generateOfficialHourLogCsv(entriesToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Congressional_Award_Hour_Log_${suffix}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (entry: HourLogEntry) => {
    setEditingId(entry.id);
    setEditDraft({ ...entry });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    if (activityStartDate && editDraft.date < activityStartDate) {
      setEditError(
        `Date cannot be before Activity Start Date (${activityStartDate}).`
      );
      return;
    }
    if (!editDraft.activityDescription.trim()) {
      setEditError("Activity description cannot be empty.");
      return;
    }
    if (isNaN(editDraft.hours) || editDraft.hours <= 0 || editDraft.hours > 24) {
      setEditError("Hours must be between 0.25 and 24.0.");
      return;
    }
    onUpdateLog({
      ...editDraft,
      hours: Math.round(Number(editDraft.hours) * 100) / 100,
    });
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const getGoalTitle = (area: ProgramAreaId, goalNumber: number) => {
    const found = goals.find(
      (g) => g.area === area && g.goalNumber === goalNumber
    );
    return found ? found.title : `Goal #${goalNumber}`;
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Official Hour Log History Table
            </h2>
            <p className="text-xs text-slate-500">
              Filter by Program Area, Goal Number, and Date Range • Matches official Hour Log columns
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadCsv(filteredLogs, "Filtered")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Filtered CSV ({filteredLogs.length})
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Program Area Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Program Area
            </label>
            <select
              value={filterArea}
              onChange={(e) =>
                setFilterArea(e.target.value as ProgramAreaId | "ALL")
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Program Areas</option>
              <option value="VPS">Voluntary Public Service (VPS)</option>
              <option value="PD">Personal Development (PD)</option>
              <option value="PF">Physical Fitness (PF)</option>
            </select>
          </div>

          {/* Goal Number Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Goal Number
            </label>
            <select
              value={filterGoal}
              onChange={(e) =>
                setFilterGoal(
                  e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Goals (#1 – #4)</option>
              <option value={1}>Goal #1</option>
              <option value={2}>Goal #2</option>
              <option value={3}>Goal #3 (VPS only)</option>
              <option value={4}>Goal #4 (VPS only)</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              From Date
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              To Date
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Search Activity / Org
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keyword or org..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Bar of Filtered Results */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-600">
              Showing{" "}
              <strong className="text-slate-900">{filteredLogs.length}</strong> of{" "}
              {logs.length} entries
            </span>
            <span className="text-slate-600">
              Filtered Hours:{" "}
              <strong className="text-blue-700 text-sm">
                {filteredSummary.totalHours.toFixed(2)} hrs
              </strong>
            </span>
            <span className="text-slate-600">
              Active Months in View:{" "}
              <strong className="text-emerald-700">
                {filteredSummary.distinctMonths.length}
              </strong>{" "}
              {filteredSummary.distinctMonths.length > 0 && (
                <span className="text-slate-400">
                  ({filteredSummary.distinctMonths.map(formatMonthLabel).join(", ")})
                </span>
              )}
            </span>
          </div>

          {/* Direct / Indirect quick filter for VPS */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(["ALL", "DIRECT", "INDIRECT"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterServiceType(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filterServiceType === type
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "ALL"
                  ? "All Service"
                  : type === "DIRECT"
                  ? "Direct Only"
                  : "Indirect Only"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {editError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{editError}</span>
        </div>
      )}

      {/* Official Hour Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Program Area</th>
                <th className="py-3.5 px-4">Goal Number</th>
                <th className="py-3.5 px-4 min-w-[260px]">
                  Activity Description
                </th>
                <th className="py-3.5 px-4">Organization</th>
                <th className="py-3.5 px-4 text-right">Hours</th>
                <th className="py-3.5 px-4 text-right">Area Cumulative</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 px-4 text-center text-slate-400 text-sm"
                  >
                    No hour log entries match your current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => {
                  const isEditing = editingId === entry.id && editDraft;
                  const meta = PROGRAM_AREAS[entry.area];
                  const isBeforeStart =
                    Boolean(activityStartDate) &&
                    entry.date < activityStartDate;
                  const cumHours = cumulativeByLogId.get(entry.id) ?? entry.hours;

                  if (isEditing && editDraft) {
                    return (
                      <tr key={entry.id} className="bg-blue-50/40">
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            min={activityStartDate || undefined}
                            value={editDraft.date}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                date: e.target.value,
                              })
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={editDraft.area}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                area: e.target.value as ProgramAreaId,
                                goalNumber: 1,
                              })
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="VPS">VPS</option>
                            <option value="PD">PD</option>
                            <option value="PF">PF</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={editDraft.goalNumber}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                goalNumber: Number(e.target.value),
                              })
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                          >
                            {Array.from(
                              {
                                length: PROGRAM_AREAS[editDraft.area].maxGoals,
                              },
                              (_, i) => i + 1
                            ).map((n) => (
                              <option key={n} value={n}>
                                Goal #{n}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 space-y-1">
                          <input
                            type="text"
                            value={editDraft.activityDescription}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                activityDescription: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                          {editDraft.area === "VPS" && (
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
                              <input
                                type="checkbox"
                                checked={Boolean(editDraft.isIndirectService)}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    isIndirectService: e.target.checked,
                                  })
                                }
                              />
                              Indirect Service
                            </label>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editDraft.organization}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                organization: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            value={editDraft.hours}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                hours: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-right font-semibold"
                          />
                        </td>
                        <td className="py-3 px-3 text-right text-xs text-slate-400">
                          —
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div>{entry.date}</div>
                        {isBeforeStart && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                            <AlertCircle className="w-3 h-3" /> Before Start Date
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.bgLight} ${meta.textColor}`}
                        >
                          {entry.area}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          Goal #{entry.goalNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 max-w-[160px] truncate">
                          {getGoalTitle(entry.area, entry.goalNumber)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="leading-snug">
                          {entry.activityDescription}
                        </p>
                        {entry.area === "VPS" && (
                          <span
                            className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                              entry.isIndirectService
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {entry.isIndirectService
                              ? "Indirect Service"
                              : "Direct Service"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {entry.organization || (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-slate-900">
                        {Number(entry.hours).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right text-xs font-semibold text-slate-500">
                        {cumHours.toFixed(2)} hrs
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit entry"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLog(entry.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
