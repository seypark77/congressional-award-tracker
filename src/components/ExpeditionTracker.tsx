"use client";

import React, { useEffect, useState } from "react";
import { AWARD_LEVELS } from "@/lib/constants";
import { calculateTimeSpanHours } from "@/lib/awardUtils";
import {
  AwardLevelId,
  ExpeditionData,
  InPersonDayLog,
  VirtualActivityItem,
} from "@/lib/types";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  Compass,
  Globe,
  Loader2,
  MapPin,
  Moon,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Tent,
  Trash2,
  UserCheck,
} from "lucide-react";

interface ExpeditionTrackerProps {
  expedition: ExpeditionData;
  targetLevel: AwardLevelId;
  activityStartDate: string;
  onUpdateExpedition: (
    updated: ExpeditionData
  ) => Promise<{ success: boolean; message: string }>;
}

export default function ExpeditionTracker({
  expedition,
  targetLevel,
  activityStartDate,
  onUpdateExpedition,
}: ExpeditionTrackerProps) {
  const targetReq = AWARD_LEVELS[targetLevel] || AWARD_LEVELS.bronze_medal;
  const [formData, setFormData] = useState<ExpeditionData>(expedition);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  // Sync local formData when parent `expedition` prop updates externally (unless user has unsaved edits)
  useEffect(() => {
    if (!isDirty) {
      setFormData(expedition);
    }
  }, [expedition, isDirty]);

  const handleFieldChange = <K extends keyof ExpeditionData>(
    key: K,
    value: ExpeditionData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsDirty(true);
    if (saveFeedback) setSaveFeedback(null);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await onUpdateExpedition(formData);
      if (res.success) {
        setIsDirty(false);
        setSaveFeedback({
          type: "success",
          message: "Saved successfully!",
        });
        setTimeout(() => {
          setSaveFeedback((curr) =>
            curr?.type === "success" ? null : curr
          );
        }, 3000);
      } else {
        setSaveFeedback({
          type: "error",
          message: res.message || "Failed to save expedition changes.",
        });
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setFormData(expedition);
    setIsDirty(false);
    setSaveFeedback(null);
  };

  // In-person day handlers
  const handleAddDayLog = () => {
    const nextDayNum = formData.inPersonDays.length + 1;
    const baseDate =
      formData.startDate ||
      activityStartDate ||
      new Date().toISOString().slice(0, 10);
    const newDay: InPersonDayLog = {
      id: `exp-day-${Date.now()}`,
      dayNumber: nextDayNum,
      date: baseDate,
      startTime: "08:00",
      endTime: "15:00",
      activeHours: 7.0,
      locationOrRoute: "",
      activitiesSummary: "",
      overnightLocation: "",
    };
    handleFieldChange("inPersonDays", [...formData.inPersonDays, newDay]);
  };

  const handleUpdateDayLog = (id: string, patch: Partial<InPersonDayLog>) => {
    const updatedDays = formData.inPersonDays.map((day) => {
      if (day.id !== id) return day;
      const merged = { ...day, ...patch };
      if (patch.startTime !== undefined || patch.endTime !== undefined) {
        const calc = calculateTimeSpanHours(merged.startTime, merged.endTime);
        if (calc > 0) {
          merged.activeHours = calc;
        }
      }
      return merged;
    });
    handleFieldChange("inPersonDays", updatedDays);
  };

  const handleDeleteDayLog = (id: string) => {
    const filtered = formData.inPersonDays
      .filter((d) => d.id !== id)
      .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    handleFieldChange("inPersonDays", filtered);
  };

  // Virtual activity checklist handlers
  const handleAddVirtualActivity = () => {
    const newAct: VirtualActivityItem = {
      id: `v-act-${Date.now()}`,
      title: "",
      resourceOrUrl: "",
      dateCompleted:
        formData.startDate || new Date().toISOString().slice(0, 10),
      hoursSpent: 6.0,
      completed: false,
      notes: "",
    };
    handleFieldChange("virtualActivities", [
      ...formData.virtualActivities,
      newAct,
    ]);
  };

  const handleUpdateVirtualActivity = (
    id: string,
    patch: Partial<VirtualActivityItem>
  ) => {
    const updated = formData.virtualActivities.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    handleFieldChange("virtualActivities", updated);
  };

  const handleDeleteVirtualActivity = (id: string) => {
    handleFieldChange(
      "virtualActivities",
      formData.virtualActivities.filter((a) => a.id !== id)
    );
  };

  // Virtual reflection handler
  const handleUpdateReflection = (questionIndex: number, answer: string) => {
    const updated = formData.virtualReflections.map((r) =>
      r.questionIndex === questionIndex ? { ...r, answer } : r
    );
    handleFieldChange("virtualReflections", updated);
  };

  // Packing & Planning checklist handlers
  const handleToggleChecklist = (id: string) => {
    const updated = formData.packingAndPlanningChecklist.map((c) =>
      c.id === id ? { ...c, checked: !c.checked } : c
    );
    handleFieldChange("packingAndPlanningChecklist", updated);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;
    handleFieldChange("packingAndPlanningChecklist", [
      ...formData.packingAndPlanningChecklist,
      {
        id: `chk-${Date.now()}`,
        label: newChecklistLabel.trim(),
        checked: false,
      },
    ]);
    setNewChecklistLabel("");
  };

  const isStartDateBeforeOfficial =
    Boolean(activityStartDate) &&
    Boolean(formData.startDate) &&
    formData.startDate < activityStartDate;

  return (
    <div className="space-y-6">
      {/* Top Mode & Type Switcher Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full mb-1.5">
              <Compass className="w-3.5 h-3.5" />
              4th Program Area • Target: {targetReq.name}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Expedition / Exploration Planner & Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Requirement:{" "}
              <strong className="text-slate-800">
                {targetReq.expeditionDescription}
              </strong>{" "}
              (6–8 hours of active daily immersion, planned and executed by the participant)
            </p>
          </div>

          {/* Mode Toggle + Explicit Save Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => handleFieldChange("mode", "in_person")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.mode === "in_person"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Tent className="w-3.5 h-3.5" />
                In-Person (6–8h Daily Log)
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange("mode", "virtual")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formData.mode === "virtual"
                    ? "bg-purple-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Virtual (Checklist + 7 Reflections)
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
        </div>

        {/* Save Status Banner */}
        {saveFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              saveFeedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {saveFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
        )}

        {/* Core Metadata Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Category Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                handleFieldChange(
                  "type",
                  e.target.value as "Expedition" | "Exploration"
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
            >
              <option value="Expedition">
                Expedition (Wilderness / Outdoor / Camping)
              </option>
              <option value="Exploration">
                Exploration (Cultural / Historical / Immersive)
              </option>
            </select>
          </div>

          <div className="sm:col-span-1 lg:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Expedition / Exploration Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="e.g., Shenandoah National Park Backcountry Ridge Trek"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Destination / Route / Virtual Theme
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.locationOrTheme}
                onChange={(e) =>
                  handleFieldChange("locationOrTheme", e.target.value)
                }
                placeholder="Location, park district, or cultural region..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              min={activityStartDate || undefined}
              value={formData.startDate}
              onChange={(e) => handleFieldChange("startDate", e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                isStartDateBeforeOfficial
                  ? "border-red-400 bg-red-50 text-red-900"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            />
            {isStartDateBeforeOfficial && (
              <span className="text-[11px] text-red-600 font-medium block mt-1">
                Cannot be before Start Date ({activityStartDate})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                min={formData.startDate || activityStartDate || undefined}
                value={formData.endDate}
                onChange={(e) => handleFieldChange("endDate", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Nights ({targetReq.expeditionNights} req)
              </label>
              <input
                type="number"
                min={0}
                max={14}
                value={formData.nightsCount}
                onChange={(e) =>
                  handleFieldChange(
                    "nightsCount",
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Participant-Led Planning & Experience Overview
          </label>
          <textarea
            rows={2}
            value={formData.overview}
            onChange={(e) => handleFieldChange("overview", e.target.value)}
            placeholder="Summarize how you planned the itinerary, food/equipment, route logistics, and learning objectives..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      {/* Mode-Specific Section: IN-PERSON vs VIRTUAL */}
      {formData.mode === "in_person" ? (
        <div className="space-y-5">
          {/* Daily 6-8 Hour Timestamped Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  In-Person Daily Timestamped Log (6–8 Hours/Day Guideline)
                </h3>
                <p className="text-xs text-slate-500">
                  Target for {targetReq.name}:{" "}
                  <strong>{targetReq.expeditionDays} consecutive day(s)</strong>{" "}
                  and <strong>{targetReq.expeditionNights} consecutive night(s)</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDayLog}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Day #{formData.inPersonDays.length + 1} Log
              </button>
            </div>

            <div className="space-y-4">
              {formData.inPersonDays.map((day) => {
                const isCompliantHours =
                  day.activeHours >= 6 && day.activeHours <= 10;
                const isUnderHours = day.activeHours < 6;
                const isBeforeStart =
                  Boolean(activityStartDate) && day.date < activityStartDate;

                return (
                  <div
                    key={day.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">
                          Day #{day.dayNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isCompliantHours
                              ? "bg-emerald-100 text-emerald-800"
                              : isUnderHours
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isCompliantHours ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          {day.activeHours} Active Hours{" "}
                          {isUnderHours
                            ? "(Official guideline requires 6–8 hrs/day)"
                            : "(Meets 6–8 hr/day guideline)"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDayLog(day.id)}
                        className="text-xs text-slate-400 hover:text-red-600 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Day
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          min={activityStartDate || undefined}
                          value={day.date}
                          onChange={(e) =>
                            handleUpdateDayLog(day.id, { date: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                        {isBeforeStart && (
                          <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                            Before Start Date ({activityStartDate})
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Start Timestamp
                        </label>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            handleUpdateDayLog(day.id, {
                              startTime: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          End Timestamp
                        </label>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            handleUpdateDayLog(day.id, {
                              endTime: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Active Hours (6–8h)
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0.5"
                          max="18"
                          value={day.activeHours}
                          onChange={(e) =>
                            handleUpdateDayLog(day.id, {
                              activeHours: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Route / Trail / Daily Location
                        </label>
                        <input
                          type="text"
                          value={day.locationOrRoute}
                          onChange={(e) =>
                            handleUpdateDayLog(day.id, {
                              locationOrRoute: e.target.value,
                            })
                          }
                          placeholder="e.g., Thornton Gap to Byrds Nest #3 Shelter (8.8 mi)"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                          Overnight Campsite / Lodging
                        </label>
                        <div className="relative">
                          <Moon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={day.overnightLocation}
                            onChange={(e) =>
                              handleUpdateDayLog(day.id, {
                                overnightLocation: e.target.value,
                              })
                            }
                            placeholder="e.g., Byrds Nest #3 Backcountry Tent Site"
                            className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Daily Schedule, Meal Prep & Immersion Activities
                      </label>
                      <textarea
                        rows={2}
                        value={day.activitiesSummary}
                        onChange={(e) =>
                          handleUpdateDayLog(day.id, {
                            activitiesSummary: e.target.value,
                          })
                        }
                        placeholder="Detail what you did, skills used, navigation, camp setup, meal preparation..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participant-Led Planning & Packing Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              In-Person Planning & Safety Checklist
            </h3>
            <div className="space-y-2">
              {formData.packingAndPlanningChecklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleChecklist(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span
                    className={
                      item.checked ? "line-through text-slate-400" : "font-medium"
                    }
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                placeholder="Add custom planning or gear item..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Add Item
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* VIRTUAL MODE: Activity Checklists + 7 Official Reflection Questions */
        <div className="space-y-5">
          {/* Virtual Immersion Activity Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  Virtual Expedition / Exploration Activity Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  Track virtual tours, lectures, language/cultural workshops, and interactive modules
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddVirtualActivity}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Virtual Activity
              </button>
            </div>

            <div className="space-y-3">
              {formData.virtualActivities.map((act, idx) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={act.completed}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            completed: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-purple-600"
                      />
                      <span className="text-xs font-bold text-slate-900">
                        Activity #{idx + 1}{" "}
                        {act.completed ? "(Completed)" : "(In Progress)"}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteVirtualActivity(act.id)}
                      className="text-xs text-slate-400 hover:text-red-600 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Activity / Immersion Module Title
                      </label>
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g., Smithsonian Virtual Biodiversity Seminar"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Date Completed
                      </label>
                      <input
                        type="date"
                        min={activityStartDate || undefined}
                        value={act.dateCompleted}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            dateCompleted: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Hours Spent
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={act.hoursSpent}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            hoursSpent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Resource / Institution / URL
                      </label>
                      <input
                        type="text"
                        value={act.resourceOrUrl}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            resourceOrUrl: e.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                        Field Notes & Key Learnings
                      </label>
                      <input
                        type="text"
                        value={act.notes}
                        onChange={(e) =>
                          handleUpdateVirtualActivity(act.id, {
                            notes: e.target.value,
                          })
                        }
                        placeholder="What did you observe, create, or document?"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7 Official Reflection Questions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Official 7 Virtual Reflection Questions
                </h3>
                <p className="text-xs text-slate-500">
                  Complete all 7 structured reflection responses for your Virtual Expedition/Exploration submission
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                {
                  formData.virtualReflections.filter(
                    (r) => r.answer.trim().length > 10
                  ).length
                }{" "}
                / 7 Answered
              </span>
            </div>

            <div className="space-y-4">
              {formData.virtualReflections.map((item) => {
                const isDone = item.answer.trim().length > 10;
                return (
                  <div
                    key={item.questionIndex}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="text-xs font-bold text-slate-900 leading-snug">
                        {item.question}
                      </label>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isDone ? "Completed" : "Needs Response"}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={item.answer}
                      onChange={(e) =>
                        handleUpdateReflection(
                          item.questionIndex,
                          e.target.value
                        )
                      }
                      placeholder="Write a thorough reflection detailing your experience..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expedition Adult Validator Card & Explicit Save Footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Expedition / Exploration Adult Validator (Non-Family)
            </h3>
          </div>
          {formData.validator.isNonFamilyConfirmed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Non-Family Adult
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              Confirmation Required
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Validator Name *
            </label>
            <input
              type="text"
              value={formData.validator.name}
              onChange={(e) =>
                handleFieldChange("validator", {
                  ...formData.validator,
                  name: e.target.value,
                })
              }
              placeholder="e.g., Ranger Thomas Gallagher"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Role / Qualifications *
            </label>
            <input
              type="text"
              value={formData.validator.role}
              onChange={(e) =>
                handleFieldChange("validator", {
                  ...formData.validator,
                  role: e.target.value,
                })
              }
              placeholder="e.g., Scout Leader, Park Ranger, Teacher"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Validator Email *
            </label>
            <input
              type="email"
              value={formData.validator.email}
              onChange={(e) =>
                handleFieldChange("validator", {
                  ...formData.validator,
                  email: e.target.value,
                })
              }
              placeholder="validator@example.org"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={formData.validator.isNonFamilyConfirmed}
            onChange={(e) =>
              handleFieldChange("validator", {
                ...formData.validator,
                isNonFamilyConfirmed: e.target.checked,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-xs text-slate-700">
            <strong>Official Non-Family Adult Confirmation:</strong> I confirm this Expedition/Exploration Validator is an adult who is{" "}
            <span className="underline font-semibold">
              not a parent, relative, family member, or peer
            </span>
            .
          </span>
        </label>

        {/* Bottom Explicit Save Button Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-h-[28px] flex items-center">
            {saveFeedback && (
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                  saveFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {saveFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{saveFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
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
        </div>
      </div>
    </div>
  );
}
