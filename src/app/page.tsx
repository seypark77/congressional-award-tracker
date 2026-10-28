"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AWARD_LEVELS } from "@/lib/constants";
import { SAMPLE_STARTER_DATA } from "@/lib/sampleData";
import { generateOfficialHourLogCsv } from "@/lib/awardUtils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  DEFAULT_SHARED_PROFILE_ID,
  fetchStateFromSupabase,
  syncStateToSupabase,
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
  Award,
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

export default function HomePage() {
  const [state, setState] = useState<CongressionalAwardState>(
    SAMPLE_STARTER_DATA
  );
  const [profileId, setProfileId] = useState<string>(DEFAULT_SHARED_PROFILE_ID);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error" | "local_only"
  >(isSupabaseConfigured ? "idle" : "local_only");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Prevent echo loops when applying remote Supabase updates
  const isApplyingRemoteRef = useRef(false);

  // Pull latest state from Supabase
  const pullFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus("local_only");
      return {
        success: false,
        message:
          "Supabase environment variables are not configured. Running in LocalStorage mode.",
      };
    }

    setSyncStatus("syncing");
    const result = await fetchStateFromSupabase();
    if (result.error) {
      setSyncStatus("error");
      return {
        success: false,
        message: `Supabase error: ${result.error}. Using LocalStorage fallback.`,
      };
    }

    if (result.state && result.profileId) {
      isApplyingRemoteRef.current = true;
      setState(result.state);
      setProfileId(result.profileId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state));
        localStorage.setItem(PROFILE_ID_STORAGE_KEY, result.profileId);
      } catch {
        // Ignore storage quota errors
      }
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncedAt(timeStr);
      setSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 150);
      return {
        success: true,
        message: `Loaded latest cloud data (${result.state.logs.length} logs, ${result.state.goals.length} goals) from Supabase.`,
      };
    }

    setSyncStatus("idle");
    return {
      success: false,
      message:
        "No profile found in Supabase yet. Click 'Sync LocalStorage to Supabase' to push your current data!",
    };
  }, []);

  // Push current state (or LocalStorage state) to Supabase
  const pushToSupabase = useCallback(
    async (stateToSync: CongressionalAwardState, currentProfId: string) => {
      if (!isSupabaseConfigured || !supabase) {
        setSyncStatus("local_only");
        return {
          success: false,
          message:
            "Supabase credentials are not set in .env.local yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        };
      }

      setSyncStatus("syncing");
      const res = await syncStateToSupabase(stateToSync, currentProfId);
      if (res.success) {
        if (res.profileId) {
          setProfileId(res.profileId);
          try {
            localStorage.setItem(PROFILE_ID_STORAGE_KEY, res.profileId);
          } catch {
            // Ignore
          }
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
      return {
        success: res.success,
        message: res.message,
      };
    },
    []
  );

  // Initial load: LocalStorage baseline + Supabase Cloud fetch (if configured)
  useEffect(() => {
    let localBaseline = SAMPLE_STARTER_DATA;
    let storedProfileId = DEFAULT_SHARED_PROFILE_ID;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.profile && Array.isArray(parsed.logs)) {
          localBaseline = parsed;
          setState(parsed);
        }
      }
      const savedProfId = localStorage.getItem(PROFILE_ID_STORAGE_KEY);
      if (savedProfId) {
        storedProfileId = savedProfId;
        setProfileId(savedProfId);
      }
    } catch (err) {
      console.error("Failed to read state from localStorage:", err);
    } finally {
      setIsHydrated(true);
    }

    if (isSupabaseConfigured && supabase) {
      (async () => {
        setSyncStatus("syncing");
        const cloud = await fetchStateFromSupabase();
        if (cloud.state && cloud.profileId) {
          isApplyingRemoteRef.current = true;
          setState(cloud.state);
          setProfileId(cloud.profileId);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud.state));
            localStorage.setItem(PROFILE_ID_STORAGE_KEY, cloud.profileId);
          } catch {
            // Ignore
          }
          setLastSyncedAt(new Date().toLocaleTimeString());
          setSyncStatus("synced");
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 150);
        } else if (!cloud.error) {
          // Database is reachable but empty: automatically seed with localBaseline
          const seedRes = await syncStateToSupabase(
            localBaseline,
            storedProfileId
          );
          if (seedRes.success) {
            setLastSyncedAt(new Date().toLocaleTimeString());
            setSyncStatus("synced");
          } else {
            setSyncStatus("error");
          }
        } else {
          setSyncStatus("error");
        }
      })();
    } else {
      setSyncStatus("local_only");
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-blocking PWA service worker registration
      });
    }
  }, []);

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
          if (!isApplyingRemoteRef.current) pullFromSupabase();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals" },
        () => {
          if (!isApplyingRemoteRef.current) pullFromSupabase();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          if (!isApplyingRemoteRef.current) pullFromSupabase();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expeditions" },
        () => {
          if (!isApplyingRemoteRef.current) pullFromSupabase();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [pullFromSupabase]);

  // Persist to LocalStorage AND auto-sync to Supabase whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save state to localStorage:", err);
    }

    if (
      !isSupabaseConfigured ||
      !supabase ||
      isApplyingRemoteRef.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      pushToSupabase(state, profileId);
    }, 500);

    return () => clearTimeout(timer);
  }, [state, isHydrated, profileId, pushToSupabase]);

  const handleTargetLevelChange = (newLevel: AwardLevelId) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        targetLevel: newLevel,
      },
    }));
  };

  const handleUpdateProfile = (updatedProfile: ParticipantProfile) => {
    setState((prev) => ({
      ...prev,
      profile: updatedProfile,
    }));
  };

  const handleAddLog = (newEntry: Omit<HourLogEntry, "id" | "createdAt">) => {
    const entry: HourLogEntry = {
      ...newEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      logs: [entry, ...prev.logs],
    }));
  };

  const handleUpdateLog = (updated: HourLogEntry) => {
    setState((prev) => ({
      ...prev,
      logs: prev.logs.map((l) => (l.id === updated.id ? updated : l)),
    }));
  };

  const handleDeleteLog = (id: string) => {
    setState((prev) => ({
      ...prev,
      logs: prev.logs.filter((l) => l.id !== id),
    }));
  };

  const handleSaveGoal = (goal: GoalItem) => {
    setState((prev) => {
      const exists = prev.goals.some((g) => g.id === goal.id);
      const updatedGoals = exists
        ? prev.goals.map((g) => (g.id === goal.id ? goal : g))
        : [...prev.goals, goal];
      return {
        ...prev,
        goals: updatedGoals,
      };
    });
  };

  const handleDeleteGoal = (id: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  };

  const handleUpdateExpedition = (updatedExpedition: ExpeditionData) => {
    setState((prev) => ({
      ...prev,
      expedition: updatedExpedition,
    }));
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

  const handleResetSampleData = () => {
    setState(SAMPLE_STARTER_DATA);
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
    return await pushToSupabase(dataToSync, profileId);
  };

  const targetReq = AWARD_LEVELS[state.profile.targetLevel];

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
                    <span>Local Fallback</span>
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
            onImportState={(newState) => setState(newState)}
            onResetSampleData={handleResetSampleData}
            onSyncLocalToSupabase={handleSyncLocalStorageToSupabase}
            onPullFromSupabase={pullFromSupabase}
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
      </main>

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
