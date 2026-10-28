"use client";

import React, { useState } from "react";
import { PROGRAM_AREAS } from "@/lib/constants";
import { calculateGoalStats, formatMonthLabel } from "@/lib/awardUtils";
import { GoalItem, HourLogEntry, ProgramAreaId } from "@/lib/types";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  UserCheck,
} from "lucide-react";

interface GoalsValidatorsViewProps {
  goals: GoalItem[];
  logs: HourLogEntry[];
  onSaveGoal: (
    goal: GoalItem
  ) => Promise<{ success: boolean; message: string }>;
  onDeleteGoal: (id: string) => Promise<void> | void;
}

export default function GoalsValidatorsView({
  goals,
  logs,
  onSaveGoal,
  onDeleteGoal,
}: GoalsValidatorsViewProps) {
  const [selectedArea, setSelectedArea] = useState<ProgramAreaId>("VPS");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [draftGoal, setDraftGoal] = useState<GoalItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const areaMeta = PROGRAM_AREAS[selectedArea];
  const areaGoals = goals
    .filter((g) => g.area === selectedArea)
    .sort((a, b) => a.goalNumber - b.goalNumber);

  const canAddMoreGoals = areaGoals.length < areaMeta.maxGoals;

  const startNewGoal = (area: ProgramAreaId) => {
    const existingNums = new Set(
      goals.filter((g) => g.area === area).map((g) => g.goalNumber)
    );
    let nextNum = 1;
    while (
      existingNums.has(nextNum) &&
      nextNum <= PROGRAM_AREAS[area].maxGoals
    ) {
      nextNum++;
    }
    const newGoal: GoalItem = {
      id: `goal-${area.toLowerCase()}-${Date.now()}`,
      area,
      goalNumber: nextNum,
      title: "",
      description: "",
      organizationDefault: "",
      validator: {
        name: "",
        role: "",
        email: "",
        phone: "",
        isNonFamilyConfirmed: false,
      },
    };
    setEditingGoalId(newGoal.id);
    setDraftGoal(newGoal);
    setFormError(null);
    setSaveSuccessMsg(null);
  };

  const startEditGoal = (goal: GoalItem) => {
    setEditingGoalId(goal.id);
    setDraftGoal({
      ...goal,
      validator: { ...goal.validator },
    });
    setFormError(null);
    setSaveSuccessMsg(null);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftGoal) return;
    setFormError(null);

    if (!draftGoal.title.trim()) {
      setFormError("Please enter a clear Goal Statement / Title.");
      return;
    }
    if (!draftGoal.validator.name.trim() || !draftGoal.validator.role.trim()) {
      setFormError(
        "Each goal requires an Adult Validator's Name and Role/Title."
      );
      return;
    }
    if (
      !draftGoal.validator.email.trim() ||
      !draftGoal.validator.email.includes("@")
    ) {
      setFormError("Please enter a valid email address for the Validator.");
      return;
    }
    if (!draftGoal.validator.isNonFamilyConfirmed) {
      setFormError(
        "Official Requirement: You must confirm the Validator is a non-family adult (not a parent, relative, or peer)."
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await onSaveGoal(draftGoal);
      if (res.success) {
        setEditingGoalId(null);
        setDraftGoal(null);
        setSaveSuccessMsg("Saved successfully!");
        setTimeout(() => {
          setSaveSuccessMsg(null);
        }, 3000);
      } else {
        setFormError(res.message || "Failed to save goal to database.");
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save goal."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Area Selector & Goal Limit Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Program Area Goals & Adult Validator Tracking
            </h2>
            <p className="text-xs text-slate-500">
              Official Goal Limits: VPS (Max 4 Goals) • Personal Development (Max 2 Goals) • Physical Fitness (Max 2 Goals)
            </p>
          </div>

          {saveSuccessMsg && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Area Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["VPS", "PD", "PF"] as ProgramAreaId[]).map((areaId) => {
            const meta = PROGRAM_AREAS[areaId];
            const count = goals.filter((g) => g.area === areaId).length;
            const isActive = selectedArea === areaId;
            return (
              <button
                key={areaId}
                type="button"
                onClick={() => {
                  setSelectedArea(areaId);
                  setEditingGoalId(null);
                  setDraftGoal(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-amber-400 text-slate-950"
                        : `${meta.bgLight} ${meta.textColor}`
                    }`}
                  >
                    {areaId}
                  </span>
                  <h3 className="font-bold text-sm mt-1.5">{meta.name}</h3>
                </div>
                <div className="text-right">
                  <span
                    className={`text-lg font-extrabold ${
                      isActive ? "text-amber-400" : "text-slate-900"
                    }`}
                  >
                    {count}/{meta.maxGoals}
                  </span>
                  <span
                    className={`block text-[10px] uppercase tracking-wider ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Goals Used
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600">{areaMeta.description}</p>
          {canAddMoreGoals ? (
            <button
              type="button"
              onClick={() => startNewGoal(selectedArea)}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add {selectedArea} Goal ({areaGoals.length}/{areaMeta.maxGoals})
            </button>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold">
              Maximum {areaMeta.maxGoals} goals reached for {selectedArea}
            </span>
          )}
        </div>
      </div>

      {/* Add / Edit Goal & Validator Form Card */}
      {draftGoal && (
        <form
          onSubmit={handleSaveDraft}
          className="bg-white rounded-2xl border-2 border-blue-600 p-5 sm:p-6 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {selectedArea} — Goal #{draftGoal.goalNumber} Configuration
              </span>
              <h3 className="text-base font-bold text-slate-900">
                SMART Goal Statement & Non-Family Adult Validator
              </h3>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingGoalId(null);
                setDraftGoal(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Goal Number (Max {areaMeta.maxGoals})
              </label>
              <select
                value={draftGoal.goalNumber}
                onChange={(e) =>
                  setDraftGoal({
                    ...draftGoal,
                    goalNumber: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {Array.from({ length: areaMeta.maxGoals }, (_, i) => i + 1).map(
                  (num) => (
                    <option key={num} value={num}>
                      Goal #{num}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Goal Statement (&quot;My goal is to...&quot;)
              </label>
              <input
                type="text"
                value={draftGoal.title}
                onChange={(e) =>
                  setDraftGoal({ ...draftGoal, title: e.target.value })
                }
                placeholder="e.g., Volunteer weekly at the Community Food Bank and assist 40+ families per shift"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Action Plan & Measurable Steps
              </label>
              <textarea
                rows={3}
                value={draftGoal.description}
                onChange={(e) =>
                  setDraftGoal({ ...draftGoal, description: e.target.value })
                }
                placeholder="Describe how you will achieve this goal, your starting point, and measurable milestones..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Organization Name (Auto-fills in Quick Log)
              </label>
              <input
                type="text"
                value={draftGoal.organizationDefault || ""}
                onChange={(e) =>
                  setDraftGoal({
                    ...draftGoal,
                    organizationDefault: e.target.value,
                  })
                }
                placeholder="e.g., Community Harvest Food Bank"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none mb-2"
              />
              <p className="text-[11px] text-slate-500">
                Setting a default organization here makes logging hours in seconds even faster.
              </p>
            </div>
          </div>

          {/* Validator Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Required Goal Validator Information (Non-Family Adult)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Validator Full Name *
                </label>
                <input
                  type="text"
                  value={draftGoal.validator.name}
                  onChange={(e) =>
                    setDraftGoal({
                      ...draftGoal,
                      validator: {
                        ...draftGoal.validator,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., Marcus Holloway"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Role / Title *
                </label>
                <input
                  type="text"
                  value={draftGoal.validator.role}
                  onChange={(e) =>
                    setDraftGoal({
                      ...draftGoal,
                      validator: {
                        ...draftGoal.validator,
                        role: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., Volunteer Coordinator, Coach"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Validator Email *
                </label>
                <input
                  type="email"
                  value={draftGoal.validator.email}
                  onChange={(e) =>
                    setDraftGoal({
                      ...draftGoal,
                      validator: {
                        ...draftGoal.validator,
                        email: e.target.value,
                      },
                    })
                  }
                  placeholder="validator@organization.org"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draftGoal.validator.isNonFamilyConfirmed}
                onChange={(e) =>
                  setDraftGoal({
                    ...draftGoal,
                    validator: {
                      ...draftGoal.validator,
                      isNonFamilyConfirmed: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700">
                <strong>Non-Family Adult Confirmation:</strong> I confirm that this Validator is an adult knowledgeable in this activity and is{" "}
                <span className="underline font-semibold">
                  not a parent, relative, family member, or peer
                </span>
                .
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingGoalId(null);
                setDraftGoal(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Goal Cards for Selected Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {areaGoals.map((goal) => {
          const gStats = calculateGoalStats(goal, logs);
          const isEditingThis = editingGoalId === goal.id;
          return (
            <div
              key={goal.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between space-y-4 ${
                isEditingThis
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${areaMeta.bgLight} ${areaMeta.textColor}`}
                    >
                      {goal.area} — Goal #{goal.goalNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {goal.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditGoal(goal)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {goal.description || "No detailed action plan added yet."}
                </p>

                {goal.organizationDefault && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{goal.organizationDefault}</span>
                  </div>
                )}

                {/* Logged Hours & Months Stats for this Goal */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Logged Hours
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {gStats.totalHours.toFixed(2)} hrs
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Active Months
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {gStats.distinctMonths.length} mos
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                      Log Entries
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {gStats.entriesCount}
                    </span>
                  </div>
                </div>

                {gStats.distinctMonths.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {gStats.distinctMonths.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        {formatMonthLabel(m)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Validator Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned Adult Validator
                  </span>
                  {goal.validator.isNonFamilyConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Non-Family Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Pending Confirmation
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {goal.validator.name || "Not specified"}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {goal.validator.role || "No role"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {goal.validator.email || "No email"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
