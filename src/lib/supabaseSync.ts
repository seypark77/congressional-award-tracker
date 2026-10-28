import { VIRTUAL_REFLECTION_QUESTIONS } from "./constants";
import { SAMPLE_STARTER_DATA } from "./sampleData";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  AwardLevelId,
  CongressionalAwardState,
  ExpeditionData,
  GoalItem,
  HourLogEntry,
  InPersonDayLog,
  ProgramAreaId,
  VirtualActivityItem,
  VirtualReflectionAnswer,
} from "./types";

// Default shared profile UUID so desktop and mobile devices sync the same participant record out-of-the-box
export const DEFAULT_SHARED_PROFILE_ID = "00000000-0000-4000-8000-000000000001";

export interface SupabaseSyncResult {
  success: boolean;
  profileId?: string;
  message: string;
  counts?: {
    goals: number;
    logs: number;
  };
}

/**
 * Loads the complete CongressionalAwardState from Supabase tables:
 * profiles, goals, activity_logs, expeditions
 */
export async function fetchStateFromSupabase(): Promise<{
  state: CongressionalAwardState | null;
  profileId: string | null;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { state: null, profileId: null, error: "Supabase not configured" };
  }

  try {
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (profileErr) {
      throw new Error(profileErr.message);
    }

    if (!profiles || profiles.length === 0) {
      return { state: null, profileId: null };
    }

    const pRow = profiles[0];
    const profileId: string = pRow.id;

    const [goalsRes, logsRes, expRes] = await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .eq("profile_id", profileId)
        .order("goal_number", { ascending: true }),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("profile_id", profileId)
        .order("date", { ascending: false }),
      supabase
        .from("expeditions")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle(),
    ]);

    if (goalsRes.error) throw new Error(goalsRes.error.message);
    if (logsRes.error) throw new Error(logsRes.error.message);
    if (expRes.error) throw new Error(expRes.error.message);

    const mappedGoals: GoalItem[] = (goalsRes.data || []).map((g) => ({
      id: String(g.id),
      area: (g.program_area as ProgramAreaId) || "VPS",
      goalNumber: Number(g.goal_number) || 1,
      title: g.smart_goal || "",
      description: g.activities || "",
      organizationDefault: g.organization_default || "",
      validator: {
        name: g.validator_name || "",
        role: g.validator_role || "",
        email: g.validator_email || "",
        phone: g.validator_phone || "",
        isNonFamilyConfirmed:
          typeof g.validator_non_family_confirmed === "boolean"
            ? g.validator_non_family_confirmed
            : true,
      },
    }));

    const mappedLogs: HourLogEntry[] = (logsRes.data || []).map((l) => ({
      id: String(l.id),
      date: String(l.date),
      area: (l.program_area as ProgramAreaId) || "VPS",
      goalNumber: Number(l.goal_number) || 1,
      activityDescription: l.activity || "",
      organization: l.organization || "",
      hours: Number(l.hours) || 0,
      isIndirectService: Boolean(l.is_indirect),
      createdAt: l.created_at || new Date().toISOString(),
    }));

    const expRow = expRes.data;
    const itineraryObj =
      expRow?.itinerary_json && typeof expRow.itinerary_json === "object"
        ? expRow.itinerary_json
        : {};

    const inPersonDays: InPersonDayLog[] = Array.isArray(
      itineraryObj.inPersonDays
    )
      ? itineraryObj.inPersonDays
      : SAMPLE_STARTER_DATA.expedition.inPersonDays;

    const packingAndPlanningChecklist = Array.isArray(
      itineraryObj.packingAndPlanningChecklist
    )
      ? itineraryObj.packingAndPlanningChecklist
      : SAMPLE_STARTER_DATA.expedition.packingAndPlanningChecklist;

    const virtualActivities: VirtualActivityItem[] = Array.isArray(
      itineraryObj.virtualActivities
    )
      ? itineraryObj.virtualActivities
      : SAMPLE_STARTER_DATA.expedition.virtualActivities;

    const virtualReflections: VirtualReflectionAnswer[] =
      Array.isArray(expRow?.reflections_json) &&
      expRow.reflections_json.length > 0
        ? expRow.reflections_json
        : VIRTUAL_REFLECTION_QUESTIONS.map((q, idx) => ({
            questionIndex: idx + 1,
            question: q,
            answer: "",
          }));

    const mappedExpedition: ExpeditionData = expRow
      ? {
          mode:
            expRow.mode ||
            (itineraryObj.mode as "in_person" | "virtual") ||
            "in_person",
          type:
            (expRow.type as "Expedition" | "Exploration") || "Expedition",
          title: expRow.title || itineraryObj.title || "",
          locationOrTheme: expRow.location || "",
          startDate: expRow.start_date || "",
          endDate: expRow.end_date || "",
          nightsCount: Number(expRow.total_nights) || 0,
          overview: expRow.overview || itineraryObj.overview || "",
          validator: {
            name: expRow.validator_name || "",
            role: expRow.validator_role || itineraryObj.validatorRole || "",
            email: expRow.validator_email || "",
            isNonFamilyConfirmed:
              typeof expRow.validator_non_family_confirmed === "boolean"
                ? expRow.validator_non_family_confirmed
                : true,
          },
          inPersonDays,
          packingAndPlanningChecklist,
          virtualActivities,
          virtualReflections,
        }
      : SAMPLE_STARTER_DATA.expedition;

    const state: CongressionalAwardState = {
      profile: {
        name: pRow.participant_name || "Participant",
        activityStartDate: pRow.activity_start_date || "2025-09-01",
        targetLevel:
          (pRow.target_award_level as AwardLevelId) || "bronze_medal",
        stateOrDistrict: pRow.state_or_district || "",
        advisor: {
          name: pRow.advisor_name || "",
          email: pRow.advisor_email || "",
          role: pRow.advisor_role || "",
          phone: pRow.advisor_phone || "",
          isNonFamilyConfirmed:
            typeof pRow.advisor_non_family_confirmed === "boolean"
              ? pRow.advisor_non_family_confirmed
              : true,
        },
      },
      goals: mappedGoals,
      logs: mappedLogs,
      expedition: mappedExpedition,
    };

    return { state, profileId };
  } catch (err) {
    return {
      state: null,
      profileId: null,
      error: err instanceof Error ? err.message : "Failed to load from Supabase",
    };
  }
}

/**
 * Pushes/upserts the entire CongressionalAwardState (profile, goals, activity_logs, expeditions)
 * to Supabase. Used for both automatic persistence and the one-click
 * "Sync LocalStorage to Supabase" migration button.
 */
export async function syncStateToSupabase(
  state: CongressionalAwardState,
  targetProfileId?: string | null
): Promise<SupabaseSyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      message:
        "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured yet.",
    };
  }

  const profileId = targetProfileId || DEFAULT_SHARED_PROFILE_ID;

  try {
    // 1. Upsert profile row
    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: profileId,
        participant_name: state.profile.name,
        activity_start_date:
          state.profile.activityStartDate ||
          new Date().toISOString().slice(0, 10),
        target_award_level: state.profile.targetLevel,
        state_or_district: state.profile.stateOrDistrict || "",
        advisor_name: state.profile.advisor.name,
        advisor_email: state.profile.advisor.email,
        advisor_role: state.profile.advisor.role,
        advisor_phone: state.profile.advisor.phone || "",
        advisor_non_family_confirmed:
          state.profile.advisor.isNonFamilyConfirmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileErr) throw new Error(`Profiles table: ${profileErr.message}`);

    // 2. Sync goals table
    const { data: existingGoals } = await supabase
      .from("goals")
      .select("id")
      .eq("profile_id", profileId);

    const currentGoalIds = new Set(state.goals.map((g) => g.id));
    const goalsToDelete = (existingGoals || [])
      .map((g) => String(g.id))
      .filter((id) => !currentGoalIds.has(id));

    if (goalsToDelete.length > 0) {
      await supabase.from("goals").delete().in("id", goalsToDelete);
    }

    if (state.goals.length > 0) {
      const goalRows = state.goals.map((g) => ({
        id: g.id,
        profile_id: profileId,
        program_area: g.area,
        goal_number: g.goalNumber,
        smart_goal: g.title,
        activities: g.description,
        improvement: "",
        impact: "",
        organization_default: g.organizationDefault || "",
        validator_name: g.validator.name,
        validator_email: g.validator.email,
        validator_role: g.validator.role,
        validator_phone: g.validator.phone || "",
        validator_non_family_confirmed: g.validator.isNonFamilyConfirmed,
      }));

      const { error: goalsErr } = await supabase
        .from("goals")
        .upsert(goalRows, { onConflict: "id" });

      if (goalsErr) throw new Error(`Goals table: ${goalsErr.message}`);
    }

    // 3. Sync activity_logs table
    const { data: existingLogs } = await supabase
      .from("activity_logs")
      .select("id")
      .eq("profile_id", profileId);

    const currentLogIds = new Set(state.logs.map((l) => l.id));
    const logsToDelete = (existingLogs || [])
      .map((l) => String(l.id))
      .filter((id) => !currentLogIds.has(id));

    if (logsToDelete.length > 0) {
      await supabase.from("activity_logs").delete().in("id", logsToDelete);
    }

    if (state.logs.length > 0) {
      const logRows = state.logs.map((l) => ({
        id: l.id,
        profile_id: profileId,
        date: l.date,
        program_area: l.area,
        goal_number: l.goalNumber,
        activity: l.activityDescription,
        organization: l.organization || "",
        hours: Number(l.hours) || 0,
        is_indirect: Boolean(l.isIndirectService),
        created_at: l.createdAt || new Date().toISOString(),
      }));

      const { error: logsErr } = await supabase
        .from("activity_logs")
        .upsert(logRows, { onConflict: "id" });

      if (logsErr) throw new Error(`Activity logs table: ${logsErr.message}`);
    }

    // 4. Sync expeditions table
    const exp = state.expedition;
    const totalDays =
      exp.mode === "in_person"
        ? Math.max(1, exp.inPersonDays.length)
        : Math.max(1, exp.virtualActivities.length);

    const { error: expErr } = await supabase.from("expeditions").upsert(
      {
        profile_id: profileId,
        mode: exp.mode,
        type: exp.type,
        title: exp.title,
        location: exp.locationOrTheme,
        start_date: exp.startDate || null,
        end_date: exp.endDate || null,
        total_days: totalDays,
        total_nights: exp.nightsCount,
        overview: exp.overview,
        itinerary_json: {
          mode: exp.mode,
          title: exp.title,
          overview: exp.overview,
          validatorRole: exp.validator.role,
          inPersonDays: exp.inPersonDays,
          packingAndPlanningChecklist: exp.packingAndPlanningChecklist,
          virtualActivities: exp.virtualActivities,
        },
        reflections_json: exp.virtualReflections,
        validator_name: exp.validator.name,
        validator_email: exp.validator.email,
        validator_role: exp.validator.role,
        validator_non_family_confirmed: exp.validator.isNonFamilyConfirmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (expErr) throw new Error(`Expeditions table: ${expErr.message}`);

    return {
      success: true,
      profileId,
      message: `Synced profile, ${state.goals.length} goals, ${state.logs.length} activity logs, and expedition data to Supabase!`,
      counts: {
        goals: state.goals.length,
        logs: state.logs.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Unknown error while syncing to Supabase.",
    };
  }
}
