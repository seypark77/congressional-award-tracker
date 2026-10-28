"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AWARD_LEVELS } from "@/lib/constants";
import { SAMPLE_STARTER_DATA } from "@/lib/sampleData";
import { generateOfficialHourLogCsv } from "@/lib/awardUtils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  addLogInSupabase,
  DEFAULT_SHARED_PROFILE_ID,
  deleteGoalInSupabase,
  deleteLogInSupabase,
  EMPTY_AWARD_STATE,
  fetchStateFromSupabase,
  saveGoalInSupabase,
  syncStateToSupabase,
  updateExpeditionInSupabase,
  updateLogInSupabase,
  updateProfileInSupabase,
} from "@/lib/supabaseSync";
import {
  AwardLevelId,
  CongressionalAwardState,
  ExpeditionData,
  GoalItem,
  HourLogEntry,
  ParticipantProfile,
} from "@/lib/types";
import DashboardOverview from "@/components/DashboardOverview";
import HourLogTable from "@/components/HourLogTable";
import GoalsValidatorsView from "@/components/GoalsValidatorsView";
import ExpeditionTracker from "@/components/ExpeditionTracker";
import ProfileAdvisorView from "@/components/ProfileAdvisorView";
import ExportAndSubmittableView from "@/components/ExportAndSubmittableView";
import QuickLogForm from "@/components/QuickLogForm";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardList,
  Cloud,
  CloudOff,
  Compass,
  Copy,
  Download,
  LayoutDashboard,
  Loader2,
  PlusCircle,
  Target,
  User,
  X,
} from "lucide-react";

const STORAGE_KEY = "congressional_award_tracker_state_v1";
const PROFILE_ID_STORAGE_KEY = "congressional_award_supabase_profile_id_v1";

type NavTab =
  | "dashboard"
  | "logs"
  | "goals"
  | "expedition"
  | "export"
  | "profile";

interface ToastMessage {
  type: "loading" | "success" | "error";
  message: string;
}

export default function HomePage() {
  const [state, setState] = useState<CongressionalAwardState>(
    EMPTY_AWARD_STATE
  );
  const [profileId, setProfileId] = useState<string>(DEFAULT_SHARED_PROFILE_ID);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error" | "local_only"
  >(isSupabaseConfigured ? "syncing" : "local_only");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expeditionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  // Prevent Realtime echo while a local CRUD request is in flight
  const isMutatingRef = useRef(false);

  const showToast = useCallback(
    (type: ToastMessage["type"], message: string, durationMs = 3000) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast({ type, message });
      if (type !== "loading") {
        toastTimeoutRef.current = setTimeout(() => {
          setToast(null);
        }, durationMs);
      }
    },
    []
  );

  const saveToLocalCache = useCallback(
    (nextState: CongressionalAwardState, nextProfileId?: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        if (nextProfileId) {
          localStorage.setItem(PROFILE_ID_STORAGE_KEY, nextProfileId);
        }
      } catch (err) {
        console.error("Failed to save state to localStorage:", err);
      }
    },
    []
  );

  // Pull authoritative state directly from Supabase
  const pullFromSupabase = useCallback(
    async (silent = false) => {
      if (!isSupabaseConfigured || !supabase) {
        setSyncStatus("local_only");
        return {
          success: false,
          message:
            "Supabase environment variables are not configured. Running in LocalStorage mode.",
        };
      }

      if (!silent) {
        setSyncStatus("syncing");
      }

      const result = await fetchStateFromSupabase();
      if (result.error) {
        console.error("[Supabase pullFromSupabase error]:", result.error);
        setSyncStatus("error");
        return {
          success: false,
          message: `Supabase error: ${result.error}`,
        };
      }

      setState(result.state);
      setProfileId(result.profileId);
      saveToLocalCache(result.state, result.profileId);
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");

      return {
        success: true,
        message: result.isEmpty
          ? "Connected to Supabase (database is currently empty)."
          : `Loaded ${result.state.logs.length} activity logs and ${result.state.goals.length} goals from Supabase.`,
      };
    },
    [saveToLocalCache]
  );

  // Single Source of Truth on Mount:
  // When Supabase is configured, query Supabase directly and NEVER overwrite with mock data.
  useEffect(() => {
    let isMounted = true;

    async function initializeData() {
      if (isSupabaseConfigured && supabase) {
        setSyncStatus("syncing");
        const cloud = await fetchStateFromSupabase();
        if (!isMounted) return;

        if (!cloud.error) {
          // Use exact Supabase state (even if tables are empty — do NOT re-seed mock data!)
          setState(cloud.state);
          setProfileId(cloud.profileId);
          saveToLocalCache(cloud.state, cloud.profileId);
          setLastSyncedAt(new Date().toLocaleTimeString());
          setSyncStatus("synced");
        } else {
          console.error(
            "[Supabase mount fetch failed, falling back to localStorage]:",
            cloud.error
          );
          setSyncStatus("error");
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.profile && Array.isArray(parsed.logs)) {
                setState(parsed);
              }
            }
          } catch (err) {
            console.error("Failed to read fallback localStorage:", err);
          }
        }
      } else {
        // Offline / LocalStorage-only mode (no Supabase env vars set)
        setSyncStatus("local_only");
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.profile && Array.isArray(parsed.logs)) {
              setState(parsed);
            }
          } else {
            // Only in purely local mode on very first visit with no storage, initialize empty state
            setState(EMPTY_AWARD_STATE);
          }
        } catch (err) {
          console.error("Failed to read state from localStorage:", err);
        }
      }

      if (isMounted) {
        setIsInitialLoading(false);
      }
    }

    initializeData();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-blocking PWA service worker registration
      });
    }

    return () => {
      isMounted = false;
    };
  }, [saveToLocalCache]);

  // Subscribe to Supabase Realtime changes for cross-device live syncing
  useEffect(() => {
    const sb = supabase;
    if (!isSupabaseConfigured || !sb) return;

    const channel = sb
      .channel("congressional-award-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (!isMutatingRef.current) pullFromSupabase(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals" },
        () => {
          if (!isMutatingRef.current) pullFromSupabase(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          if (!isMutatingRef.current) pullFromSupabase(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expeditions" },
        () => {
          if (!isMutatingRef.current) pullFromSupabase(true);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [pullFromSupabase]);

  // ============================================================================
  // DIRECT REAL-TIME SUPABASE CRUD HANDLERS
  // ============================================================================

  const handleTargetLevelChange = async (newLevel: AwardLevelId) => {
    const updatedProfile: ParticipantProfile = {
      ...state.profile,
      targetLevel: newLevel,
    };
    const nextState: CongressionalAwardState = {
      ...state,
      profile: updatedProfile,
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Updating target award level in Supabase...");
    const res = await updateProfileInSupabase(updatedProfile, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", "Target award level updated in Supabase");
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleUpdateProfile = (updatedProfile: ParticipantProfile) => {
    const nextState: CongressionalAwardState = {
      ...state,
      profile: updatedProfile,
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    if (profileDebounceRef.current) {
      clearTimeout(profileDebounceRef.current);
    }
    setSyncStatus("syncing");
    profileDebounceRef.current = setTimeout(async () => {
      isMutatingRef.current = true;
      showToast("loading", "Saving profile to Supabase...");
      const res = await updateProfileInSupabase(updatedProfile, profileId);
      isMutatingRef.current = false;

      if (res.success) {
        setLastSyncedAt(new Date().toLocaleTimeString());
        setSyncStatus("synced");
        showToast("success", "Profile saved to Supabase");
      } else {
        setSyncStatus("error");
        showToast("error", res.message, 5000);
      }
    }, 500);
  };

  const handleAddLog = async (
    newEntry: Omit<HourLogEntry, "id" | "createdAt">
  ) => {
    const entry: HourLogEntry = {
      ...newEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const nextState: CongressionalAwardState = {
      ...state,
      logs: [entry, ...state.logs],
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Saving activity log to Supabase...");
    const res = await addLogInSupabase(entry, state.profile, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleUpdateLog = async (updated: HourLogEntry) => {
    const nextState: CongressionalAwardState = {
      ...state,
      logs: state.logs.map((l) => (l.id === updated.id ? updated : l)),
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Updating activity log in Supabase...");
    const res = await updateLogInSupabase(updated);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleDeleteLog = async (id: string) => {
    const nextState: CongressionalAwardState = {
      ...state,
      logs: state.logs.filter((l) => l.id !== id),
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Deleting activity log from Supabase...");
    const res = await deleteLogInSupabase(id);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleSaveGoal = async (goal: GoalItem) => {
    const exists = state.goals.some((g) => g.id === goal.id);
    const updatedGoals = exists
      ? state.goals.map((g) => (g.id === goal.id ? goal : g))
      : [...state.goals, goal];
    const nextState: CongressionalAwardState = {
      ...state,
      goals: updatedGoals,
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Saving goal to Supabase...");
    const res = await saveGoalInSupabase(goal, state.profile, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const nextState: CongressionalAwardState = {
      ...state,
      goals: state.goals.filter((g) => g.id !== id),
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Deleting goal from Supabase...");
    const res = await deleteGoalInSupabase(id);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleUpdateExpedition = (updatedExpedition: ExpeditionData) => {
    const nextState: CongressionalAwardState = {
      ...state,
      expedition: updatedExpedition,
    };
    setState(nextState);
    saveToLocalCache(nextState);

    if (!isSupabaseConfigured) return;

    if (expeditionDebounceRef.current) {
      clearTimeout(expeditionDebounceRef.current);
    }
    setSyncStatus("syncing");
    expeditionDebounceRef.current = setTimeout(async () => {
      isMutatingRef.current = true;
      showToast("loading", "Saving expedition changes to Supabase...");
      const res = await updateExpeditionInSupabase(
        updatedExpedition,
        state.profile,
        profileId
      );
      isMutatingRef.current = false;

      if (res.success) {
        setLastSyncedAt(new Date().toLocaleTimeString());
        setSyncStatus("synced");
        showToast("success", res.message);
      } else {
        setSyncStatus("error");
        showToast("error", res.message, 5000);
      }
    }, 500);
  };

  const handleExportOfficialCsv = () => {
    const csv = generateOfficialHourLogCsv(state.logs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Official_Congressional_Award_Hour_Log_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Explicit "Reset to Demo Data" action — only loads SAMPLE_STARTER_DATA when user clicks this button
  const handleResetSampleData = async () => {
    setState(SAMPLE_STARTER_DATA);
    saveToLocalCache(SAMPLE_STARTER_DATA);

    if (!isSupabaseConfigured) {
      showToast("success", "Reset to Demo Data in LocalStorage");
      return;
    }

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Loading Demo Data into Supabase...");
    const res = await syncStateToSupabase(SAMPLE_STARTER_DATA, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", "Demo Data loaded and synced to Supabase!");
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleImportJsonState = async (newState: CongressionalAwardState) => {
    setState(newState);
    saveToLocalCache(newState);

    if (!isSupabaseConfigured) {
      showToast("success", "Imported JSON backup into LocalStorage");
      return;
    }

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Syncing imported JSON backup to Supabase...");
    const res = await syncStateToSupabase(newState, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", "Imported JSON backup and synced to Supabase!");
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }
  };

  const handleSyncLocalStorageToSupabase = async () => {
    let dataToSync = state;
    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && parsed.profile && Array.isArray(parsed.logs)) {
          dataToSync = parsed;
        }
      }
    } catch {
      // Fallback to in-memory state
    }

    isMutatingRef.current = true;
    setSyncStatus("syncing");
    showToast("loading", "Syncing LocalStorage data to Supabase...");
    const res = await syncStateToSupabase(dataToSync, profileId);
    isMutatingRef.current = false;

    if (res.success) {
      if (res.profileId) {
        setProfileId(res.profileId);
      }
      setState(dataToSync);
      saveToLocalCache(dataToSync, res.profileId);
      setLastSyncedAt(new Date().toLocaleTimeString());
      setSyncStatus("synced");
      showToast("success", res.message);
    } else {
      setSyncStatus("error");
      showToast("error", res.message, 5000);
    }

    return {
      success: res.success,
      message: res.message,
    };
  };

  const targetReq =
    AWARD_LEVELS[state.profile.targetLevel] || AWARD_LEVELS.bronze_medal;

  const navItems: {
    id: NavTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      shortLabel: "Home",
      icon: LayoutDashboard,
    },
    {
      id: "logs",
      label: `Hour Log (${state.logs.length})`,
      shortLabel: "Hour Log",
      icon: ClipboardList,
    },
    {
      id: "goals",
      label: `Goals & Validators (${state.goals.length})`,
      shortLabel: "Goals",
      icon: Target,
    },
    {
      id: "expedition",
      label: "Expedition / Exploration",
      shortLabel: "Expedition",
      icon: Compass,
    },
    {
      id: "export",
      label: "Submittable & Backup",
      shortLabel: "Submit",
      icon: Copy,
    },
    {
      id: "profile",
      label: "Profile & Advisor",
      shortLabel: "Profile",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-10">
      {/* Top Sticky Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base tracking-tight leading-none flex items-center gap-2">
                  <span>Congressional Award</span>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {targetReq.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Official Workbook & Hour Log Tracker
                </p>
              </div>
            </button>

            {/* Quick Action Buttons & Cloud Status Indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("export")}
                title="View Supabase Cloud Sync & Backup settings"
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors ${
                  syncStatus === "synced"
                    ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                    : syncStatus === "syncing"
                    ? "bg-blue-500/15 border-blue-400/30 text-blue-300"
                    : syncStatus === "error"
                    ? "bg-amber-500/15 border-amber-400/30 text-amber-300"
                    : "bg-white/10 border-white/15 text-slate-300"
                }`}
              >
                {syncStatus === "syncing" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Syncing...</span>
                  </>
                ) : syncStatus === "synced" ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Supabase Live</span>
                  </>
                ) : syncStatus === "error" ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sync Error</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>LocalStorage Mode</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQuickLogModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Quick Log</span>
              </button>

              <button
                type="button"
                onClick={handleExportOfficialCsv}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
                title="Download Official CSV Hour Log"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Desktop Tab Bar */}
          <nav className="hidden lg:flex items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {isInitialLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <h2 className="text-base font-bold text-slate-900">
              Loading Congressional Award Recordbook...
            </h2>
            <p className="text-xs text-slate-500">
              {isSupabaseConfigured
                ? "Fetching latest data from Supabase cloud database..."
                : "Loading local workspace..."}
            </p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardOverview
                state={state}
                onTargetLevelChange={handleTargetLevelChange}
                onAddLog={handleAddLog}
                onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                onExportCsv={handleExportOfficialCsv}
              />
            )}

            {activeTab === "logs" && (
              <HourLogTable
                logs={state.logs}
                goals={state.goals}
                activityStartDate={state.profile.activityStartDate}
                onUpdateLog={handleUpdateLog}
                onDeleteLog={handleDeleteLog}
              />
            )}

            {activeTab === "goals" && (
              <GoalsValidatorsView
                goals={state.goals}
                logs={state.logs}
                onSaveGoal={handleSaveGoal}
                onDeleteGoal={handleDeleteGoal}
              />
            )}

            {activeTab === "expedition" && (
              <ExpeditionTracker
                expedition={state.expedition}
                targetLevel={state.profile.targetLevel}
                activityStartDate={state.profile.activityStartDate}
                onUpdateExpedition={handleUpdateExpedition}
              />
            )}

            {activeTab === "export" && (
              <ExportAndSubmittableView
                state={state}
                onImportState={handleImportJsonState}
                onResetSampleData={handleResetSampleData}
                onSyncLocalToSupabase={handleSyncLocalStorageToSupabase}
                onPullFromSupabase={() => pullFromSupabase(false)}
                syncStatus={syncStatus}
                lastSyncedAt={lastSyncedAt}
              />
            )}

            {activeTab === "profile" && (
              <ProfileAdvisorView
                profile={state.profile}
                logs={state.logs}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </>
        )}
      </main>

      {/* Real-time Supabase Operation Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === "loading"
                ? "bg-slate-900 text-white border-slate-700"
                : toast.type === "success"
                ? "bg-emerald-950 text-emerald-100 border-emerald-600/50"
                : "bg-red-950 text-red-100 border-red-500/50"
            }`}
          >
            {toast.type === "loading" ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            ) : toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white ml-1"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="grid grid-cols-6 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "text-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="truncate max-w-full px-1">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick Log Modal (Accessible from Header on any screen) */}
      {showQuickLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setShowQuickLogModal(false)}
              className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              title="Close Quick Log"
            >
              <X className="w-4 h-4" />
            </button>
            <QuickLogForm
              goals={state.goals}
              logs={state.logs}
              activityStartDate={state.profile.activityStartDate}
              onAddLog={(entry) => {
                handleAddLog(entry);
              }}
              onNavigateToGoals={() => {
                setShowQuickLogModal(false);
                setActiveTab("goals");
              }}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
