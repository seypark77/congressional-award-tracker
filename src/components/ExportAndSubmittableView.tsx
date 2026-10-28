"use client";

import React, { useRef, useState } from "react";
import {
  generateOfficialHourLogCsv,
  generateSubmittableSections,
} from "@/lib/awardUtils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CongressionalAwardState, ProgramAreaId } from "@/lib/types";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudUpload,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";

interface ExportAndSubmittableViewProps {
  state: CongressionalAwardState;
  onImportState: (newState: CongressionalAwardState) => void;
  onResetSampleData: () => void;
  onSyncLocalToSupabase: () => Promise<{
    success: boolean;
    message: string;
  }>;
  onPullFromSupabase: () => Promise<{
    success: boolean;
    message: string;
  }>;
  syncStatus: "idle" | "syncing" | "synced" | "error" | "local_only";
  lastSyncedAt: string | null;
}

export default function ExportAndSubmittableView({
  state,
  onImportState,
  onResetSampleData,
  onSyncLocalToSupabase,
  onPullFromSupabase,
  syncStatus,
  lastSyncedAt,
}: ExportAndSubmittableViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [cloudBanner, setCloudBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const submittable = generateSubmittableSections(state);

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleOneClickSupabaseSync = async () => {
    setIsMigrating(true);
    setCloudBanner(null);
    try {
      const res = await onSyncLocalToSupabase();
      setCloudBanner({
        type: res.success ? "success" : "error",
        message: res.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handlePullCloud = async () => {
    setIsMigrating(true);
    setCloudBanner(null);
    try {
      const res = await onPullFromSupabase();
      setCloudBanner({
        type: res.success ? "success" : "error",
        message: res.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDownloadOfficialCsv = (areaFilter?: ProgramAreaId) => {
    const logsToExport = areaFilter
      ? state.logs.filter((l) => l.area === areaFilter)
      : state.logs;
    const csvContent = generateOfficialHourLogCsv(logsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = areaFilter ? areaFilter : "All_Areas";
    a.download = `Official_Congressional_Award_Hour_Log_${suffix}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonBackup = () => {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Congressional_Award_Backup_${(
      state.profile.name || "Participant"
    ).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result));
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !parsed.profile ||
          !Array.isArray(parsed.logs) ||
          !Array.isArray(parsed.goals) ||
          !parsed.expedition
        ) {
          throw new Error(
            "Invalid backup file structure. Expected profile, goals, logs, and expedition."
          );
        }
        onImportState(parsed as CongressionalAwardState);
        setImportFeedback({
          type: "success",
          message: `Successfully restored ${parsed.logs.length} hour logs and ${parsed.goals.length} goals from backup!`,
        });
      } catch (err) {
        setImportFeedback({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not parse JSON backup file.",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Supabase Cloud Sync & Migration Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl border border-blue-900/50 p-5 sm:p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
              {isSupabaseConfigured ? (
                <Cloud className="w-5 h-5" />
              ) : (
                <CloudOff className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Supabase Real-Time Cloud Sync & Migration
                </h2>
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <CheckCircle2 className="w-3 h-3" /> Cloud Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    LocalStorage Fallback Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isSupabaseConfigured
                  ? "Your profile, goals, hour logs, and expedition records automatically sync with Supabase across mobile and desktop devices."
                  : "Supabase credentials are currently using placeholder values in .env.local — your data is safely stored in browser LocalStorage until you connect Supabase."}
              </p>
              {lastSyncedAt && (
                <p className="text-[11px] text-emerald-300 mt-1">
                  Last synced with Supabase: {lastSyncedAt}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOneClickSupabaseSync}
              disabled={isMigrating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              {isMigrating || syncStatus === "syncing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>Sync LocalStorage to Supabase</span>
            </button>

            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handlePullCloud}
                disabled={isMigrating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pull from Cloud</span>
              </button>
            )}
          </div>
        </div>

        {cloudBanner && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              cloudBanner.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
                : "bg-amber-950/80 border-amber-500/40 text-amber-200"
            }`}
          >
            {cloudBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <span>{cloudBanner.message}</span>
          </div>
        )}
      </div>

      {/* Official CSV Export & JSON Backup Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Official CSV Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Official Hour Log CSV Export
              </h2>
              <p className="text-xs text-slate-500">
                Exact columns: Date, Program Area, Goal Number, Activity Description, Organization, Hours
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
            Date, Program Area, Goal Number, Activity Description, Organization, Hours
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownloadOfficialCsv()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Complete Official CSV ({state.logs.length} rows)
            </button>
            {(["VPS", "PD", "PF"] as ProgramAreaId[]).map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => handleDownloadOfficialCsv(area)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {area} Only
              </button>
            ))}
          </div>
        </div>

        {/* LocalStorage JSON Backup & Restore Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                JSON Backup Export / Import (LocalStorage Sync)
              </h2>
              <p className="text-xs text-slate-500">
                Save a full portable JSON backup of your profile, goals, validators, logs, and expedition
              </p>
            </div>
          </div>

          {importFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                importFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importFeedback.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportJsonBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Export JSON Backup
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJsonFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Import JSON Backup
            </button>

            <button
              type="button"
              onClick={onResetSampleData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to Sample Data
            </button>
          </div>
        </div>
      </div>

      {/* Submittable Copy Helper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Submittable Copy Helper (Official Submission Format)
              </h2>
              <p className="text-xs text-slate-500">
                One-click copy structured blocks for each Goal, Validator, Active Month Span, and Expedition into Submittable
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handleCopyText("full-packet", submittable.fullPacketText)
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
          >
            {copiedId === "full-packet" ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied Full Recordbook Packet!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                Copy Entire Recordbook Summary
              </>
            )}
          </button>
        </div>

        {/* Participant & Advisor Copy Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Participant & Advisor Information Block
            </h3>
            <button
              type="button"
              onClick={() =>
                handleCopyText("profile-block", submittable.profileHeaderText)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              {copiedId === "profile-block" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Block
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {submittable.profileHeaderText}
          </pre>
        </div>

        {/* Per-Area & Per-Goal Copy Blocks */}
        <div className="space-y-4">
          {submittable.areaSummaries.map((areaSum) => (
            <div
              key={areaSum.areaId}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    {areaSum.areaName} ({areaSum.areaId})
                  </span>
                  <p className="text-xs text-slate-600">
                    {areaSum.stats.totalHours.toFixed(2)} /{" "}
                    {areaSum.stats.requiredHours} hrs •{" "}
                    {areaSum.stats.distinctMonthsCount} /{" "}
                    {areaSum.stats.requiredMonths} active months
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `area-${areaSum.areaId}`,
                      areaSum.overallAreaText
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  {copiedId === `area-${areaSum.areaId}` ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied All{" "}
                      {areaSum.areaId} Goals!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy All {areaSum.areaId}{" "}
                      Summary
                    </>
                  )}
                </button>
              </div>

              {areaSum.goalBlocks.map((gb) => (
                <div key={gb.goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {areaSum.areaId} Goal #{gb.goal.goalNumber}:{" "}
                      {gb.goal.title}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(`goal-${gb.goal.id}`, gb.textBlock)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold"
                    >
                      {copiedId === `goal-${gb.goal.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied
                          Goal #{gb.goal.goalNumber}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Goal #
                          {gb.goal.goalNumber}
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-60">
                    {gb.textBlock}
                  </pre>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Expedition / Exploration Copy Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Expedition / Exploration Submittable Block
            </h3>
            <button
              type="button"
              onClick={() =>
                handleCopyText("expedition-block", submittable.expeditionText)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
            >
              {copiedId === "expedition-block" ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied Expedition Summary!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Expedition Block
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {submittable.expeditionText}
          </pre>
        </div>
      </div>
    </div>
  );
}
