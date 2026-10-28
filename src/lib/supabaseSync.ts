import { VIRTUAL_REFLECTION_QUESTIONS } from "./constants";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  AwardLevelId,
  CongressionalAwardState,
  ExpeditionData,
  GoalItem,
  HourLogEntry,
  InPersonDayLog,
  ParticipantProfile,
  ProgramAreaId,
  VirtualActivityItem,
  VirtualReflectionAnswer,
} from "./types";

// Default shared profile UUID so desktop and mobile devices query the same participant record
export const DEFAULT_SHARED_PROFILE_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Clean, empty state used when Supabase tables are empty.
 * Never injects mock data unless the user explicitly clicks "Reset to Demo Data".
 */
export const EMPTY_AWARD_STATE: CongressionalAwardState = {
  profile: {
    name: "",
    activityStartDate: new Date().toISOString().slice(0, 10),
    targetLevel: "bronze_medal",
    stateOrDistrict: "",
    advisor: {
      name: "",
      role: "",
      email: "",
      phone: "",
      isNonFamilyConfirmed: false,
    },
  },
  goals: [],
  logs: [],
  expedition: {
    mode: "in_person",
    type: "Expedition",
    title: "",
    locationOrTheme: "",
    startDate: "",
    endDate: "",
    nightsCount: 0,
    overview: "",
    validator: {
      name: "",
      role: "",
      email: "",
      phone: "",
      isNonFamilyConfirmed: false,
    },
    inPersonDays: [],
    packingAndPlanningChecklist: [],
    virtualActivities: [],
    virtualReflections: VIRTUAL_REFLECTION_QUESTIONS.map((q, idx) => ({
      questionIndex: idx + 1,
      question: q,
      answer: "",
    })),
  },
};

export interface SupabaseSyncResult {
  success: boolean;
  profileId?: string;
  message: string;
  counts?: {
    goals: number;
    logs: number;
  };
}

export interface CrudResult {
  success: boolean;
  message: string;
}

/**
 * Ensures the parent `profiles` row exists in Supabase before inserting child rows
 * that reference `profile_id`.
 */
async function ensureProfileRowExists(
  profile: ParticipantProfile,
  targetProfileId?: string | null
): Promise<string> {
  const pid = targetProfileId || DEFAULT_SHARED_PROFILE_ID;
  if (!isSupabaseConfigured || !supabase) return pid;

  const { data: existing, error: selectErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", pid)
    .maybeSingle();

  if (selectErr) {
    console.error("[Supabase ensureProfileRowExists select error]:", selectErr);
  }

  if (!existing) {
    const { error: insertErr } = await supabase.from("profiles").upsert(
      {
        id: pid,
        participant_name: profile.name || "Participant",
        activity_start_date:
          profile.activityStartDate || new Date().toISOString().slice(0, 10),
        target_award_level: profile.targetLevel || "bronze_medal",
        state_or_district: profile.stateOrDistrict || "",
        advisor_name: profile.advisor.name || "",
        advisor_email: profile.advisor.email || "",
        advisor_role: profile.advisor.role || "",
        advisor_phone: profile.advisor.phone || "",
        advisor_non_family_confirmed: Boolean(
          profile.advisor.isNonFamilyConfirmed
        ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (insertErr) {
      console.error(
        "[Supabase ensureProfileRowExists upsert error]:",
        insertErr
      );
    }
  }

  return pid;
}

/**
 * Loads the complete CongressionalAwardState from Supabase tables:
 * profiles, goals, activity_logs, expeditions.
 * If tables are empty, returns EMPTY_AWARD_STATE (never overwrites or injects mock data).
 */
export async function fetchStateFromSupabase(): Promise<{
  state: CongressionalAwardState;
  profileId: string;
  isEmpty: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      state: EMPTY_AWARD_STATE,
      profileId: DEFAULT_SHARED_PROFILE_ID,
      isEmpty: true,
      error: "Supabase not configured",
    };
  }

  try {
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (profileErr) {
      console.error("[Supabase fetchState profiles error]:", profileErr);
      throw new Error(profileErr.message);
    }

    if (!profiles || profiles.length === 0) {
      return {
        state: EMPTY_AWARD_STATE,
        profileId: DEFAULT_SHARED_PROFILE_ID,
        isEmpty: true,
      };
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

    if (goalsRes.error) {
      console.error("[Supabase fetchState goals error]:", goalsRes.error);
      throw new Error(goalsRes.error.message);
    }
    if (logsRes.error) {
      console.error("[Supabase fetchState activity_logs error]:", logsRes.error);
      throw new Error(logsRes.error.message);
    }
    if (expRes.error) {
      console.error("[Supabase fetchState expeditions error]:", expRes.error);
      throw new Error(expRes.error.message);
    }

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
      : [];

    const packingAndPlanningChecklist = Array.isArray(
      itineraryObj.packingAndPlanningChecklist
    )
      ? itineraryObj.packingAndPlanningChecklist
      : [];

    const virtualActivities: VirtualActivityItem[] = Array.isArray(
      itineraryObj.virtualActivities
    )
      ? itineraryObj.virtualActivities
      : [];

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
                : false,
          },
          inPersonDays,
          packingAndPlanningChecklist,
          virtualActivities,
          virtualReflections,
        }
      : EMPTY_AWARD_STATE.expedition;

    const state: CongressionalAwardState = {
      profile: {
        name: pRow.participant_name || "",
        activityStartDate:
          pRow.activity_start_date || new Date().toISOString().slice(0, 10),
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
              : false,
        },
      },
      goals: mappedGoals,
      logs: mappedLogs,
      expedition: mappedExpedition,
    };

    return { state, profileId, isEmpty: false };
  } catch (err) {
    console.error("[Supabase fetchStateFromSupabase error]:", err);
    return {
      state: EMPTY_AWARD_STATE,
      profileId: DEFAULT_SHARED_PROFILE_ID,
      isEmpty: true,
      error: err instanceof Error ? err.message : "Failed to load from Supabase",
    };
  }
}

// ============================================================================
// DIRECT REAL-TIME SUPABASE CRUD OPERATIONS
// ============================================================================

/**
 * 1. Direct Profile Update / Upsert in Supabase
 */
export async function updateProfileInSupabase(
  profile: ParticipantProfile,
  targetProfileId?: string | null
): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Saved profile to LocalStorage" };
  }

  const pid = targetProfileId || DEFAULT_SHARED_PROFILE_ID;

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", pid)
      .maybeSingle();

    const payload = {
      participant_name: profile.name,
      activity_start_date:
        profile.activityStartDate || new Date().toISOString().slice(0, 10),
      target_award_level: profile.targetLevel,
      state_or_district: profile.stateOrDistrict || "",
      advisor_name: profile.advisor.name,
      advisor_email: profile.advisor.email,
      advisor_role: profile.advisor.role,
      advisor_phone: profile.advisor.phone || "",
      advisor_non_family_confirmed: profile.advisor.isNonFamilyConfirmed,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("id", pid)
      : await supabase.from("profiles").insert({ id: pid, ...payload });

    if (error) {
      console.error("[Supabase updateProfile error]:", error);
      return { success: false, message: `Profile update failed: ${error.message}` };
    }

    return { success: true, message: "Profile saved to Supabase" };
  } catch (err) {
    console.error("[Supabase updateProfile exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update profile",
    };
  }
}

/**
 * 2. Direct Add Activity Log (.insert()) in Supabase
 */
export async function addLogInSupabase(
  entry: HourLogEntry,
  profile: ParticipantProfile,
  targetProfileId?: string | null
): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Logged activity to LocalStorage" };
  }

  try {
    const pid = await ensureProfileRowExists(profile, targetProfileId);

    const { error } = await supabase.from("activity_logs").insert({
      id: entry.id,
      profile_id: pid,
      date: entry.date,
      program_area: entry.area,
      goal_number: entry.goalNumber,
      activity: entry.activityDescription,
      organization: entry.organization || "",
      hours: Number(entry.hours) || 0,
      is_indirect: Boolean(entry.isIndirectService),
      created_at: entry.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.error("[Supabase addLog error]:", error);
      return { success: false, message: `Add log failed: ${error.message}` };
    }

    return {
      success: true,
      message: `Logged ${entry.hours.toFixed(2)}h (${entry.area} #${entry.goalNumber}) to Supabase`,
    };
  } catch (err) {
    console.error("[Supabase addLog exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add activity log",
    };
  }
}

/**
 * 3. Direct Update Activity Log (.update().eq('id', id)) in Supabase
 */
export async function updateLogInSupabase(
  entry: HourLogEntry
): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Updated activity log in LocalStorage" };
  }

  try {
    const { error } = await supabase
      .from("activity_logs")
      .update({
        date: entry.date,
        program_area: entry.area,
        goal_number: entry.goalNumber,
        activity: entry.activityDescription,
        organization: entry.organization || "",
        hours: Number(entry.hours) || 0,
        is_indirect: Boolean(entry.isIndirectService),
      })
      .eq("id", entry.id);

    if (error) {
      console.error("[Supabase updateLog error]:", error);
      return { success: false, message: `Update log failed: ${error.message}` };
    }

    return { success: true, message: "Activity log updated in Supabase" };
  } catch (err) {
    console.error("[Supabase updateLog exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update activity log",
    };
  }
}

/**
 * 4. Direct Delete Activity Log (.delete().eq('id', id)) in Supabase
 */
export async function deleteLogInSupabase(id: string): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Deleted activity log from LocalStorage" };
  }

  try {
    const { error } = await supabase
      .from("activity_logs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Supabase deleteLog error]:", error);
      return { success: false, message: `Delete log failed: ${error.message}` };
    }

    return { success: true, message: "Activity log deleted from Supabase" };
  } catch (err) {
    console.error("[Supabase deleteLog exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete activity log",
    };
  }
}

/**
 * 5. Direct Save/Update Goal (.update() / .insert()) in Supabase
 */
export async function saveGoalInSupabase(
  goal: GoalItem,
  profile: ParticipantProfile,
  targetProfileId?: string | null
): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Saved goal to LocalStorage" };
  }

  try {
    const pid = await ensureProfileRowExists(profile, targetProfileId);

    const { data: existing } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goal.id)
      .maybeSingle();

    const payload = {
      profile_id: pid,
      program_area: goal.area,
      goal_number: goal.goalNumber,
      smart_goal: goal.title,
      activities: goal.description,
      improvement: "",
      impact: "",
      organization_default: goal.organizationDefault || "",
      validator_name: goal.validator.name,
      validator_email: goal.validator.email,
      validator_role: goal.validator.role,
      validator_phone: goal.validator.phone || "",
      validator_non_family_confirmed: goal.validator.isNonFamilyConfirmed,
    };

    const { error } = existing
      ? await supabase.from("goals").update(payload).eq("id", goal.id)
      : await supabase.from("goals").insert({ id: goal.id, ...payload });

    if (error) {
      console.error("[Supabase saveGoal error]:", error);
      return { success: false, message: `Save goal failed: ${error.message}` };
    }

    return {
      success: true,
      message: `Saved ${goal.area} Goal #${goal.goalNumber} to Supabase`,
    };
  } catch (err) {
    console.error("[Supabase saveGoal exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save goal",
    };
  }
}

/**
 * 6. Direct Delete Goal (.delete().eq('id', id)) in Supabase
 */
export async function deleteGoalInSupabase(id: string): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Deleted goal from LocalStorage" };
  }

  try {
    const { error } = await supabase.from("goals").delete().eq("id", id);

    if (error) {
      console.error("[Supabase deleteGoal error]:", error);
      return { success: false, message: `Delete goal failed: ${error.message}` };
    }

    return { success: true, message: "Goal deleted from Supabase" };
  } catch (err) {
    console.error("[Supabase deleteGoal exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete goal",
    };
  }
}

/**
 * 7. Direct Update Expedition (.update() / .insert()) in Supabase
 */
export async function updateExpeditionInSupabase(
  exp: ExpeditionData,
  profile: ParticipantProfile,
  targetProfileId?: string | null
): Promise<CrudResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: "Saved expedition to LocalStorage" };
  }

  try {
    const pid = await ensureProfileRowExists(profile, targetProfileId);
    const totalDays =
      exp.mode === "in_person"
        ? Math.max(1, exp.inPersonDays.length)
        : Math.max(1, exp.virtualActivities.length);

    const payload = {
      profile_id: pid,
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
    };

    const { data: existing } = await supabase
      .from("expeditions")
      .select("id")
      .eq("profile_id", pid)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("expeditions")
          .update(payload)
          .eq("profile_id", pid)
      : await supabase.from("expeditions").insert(payload);

    if (error) {
      console.error("[Supabase updateExpedition error]:", error);
      return {
        success: false,
        message: `Expedition update failed: ${error.message}`,
      };
    }

    return { success: true, message: "Expedition saved to Supabase" };
  } catch (err) {
    console.error("[Supabase updateExpedition exception]:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save expedition",
    };
  }
}

/**
 * Bulk migration helper: Only invoked when the user explicitly clicks
 * "Sync LocalStorage to Supabase", "Import JSON Backup", or "Reset to Demo Data".
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

    if (profileErr) {
      console.error("[Supabase syncStateToSupabase profile error]:", profileErr);
      throw new Error(`Profiles table: ${profileErr.message}`);
    }

    // 2. Replace goals for this profile
    const { error: delGoalsErr } = await supabase
      .from("goals")
      .delete()
      .eq("profile_id", profileId);

    if (delGoalsErr) {
      console.error("[Supabase syncStateToSupabase delete goals error]:", delGoalsErr);
      throw new Error(`Goals delete: ${delGoalsErr.message}`);
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
        .insert(goalRows);

      if (goalsErr) {
        console.error("[Supabase syncStateToSupabase insert goals error]:", goalsErr);
        throw new Error(`Goals table: ${goalsErr.message}`);
      }
    }

    // 3. Replace activity_logs for this profile
    const { error: delLogsErr } = await supabase
      .from("activity_logs")
      .delete()
      .eq("profile_id", profileId);

    if (delLogsErr) {
      console.error("[Supabase syncStateToSupabase delete logs error]:", delLogsErr);
      throw new Error(`Activity logs delete: ${delLogsErr.message}`);
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
        .insert(logRows);

      if (logsErr) {
        console.error("[Supabase syncStateToSupabase insert logs error]:", logsErr);
        throw new Error(`Activity logs table: ${logsErr.message}`);
      }
    }

    // 4. Upsert expedition row
    const expRes = await updateExpeditionInSupabase(
      state.expedition,
      state.profile,
      profileId
    );
    if (!expRes.success) {
      throw new Error(expRes.message);
    }

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
    console.error("[Supabase syncStateToSupabase exception]:", err);
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Unknown error while syncing to Supabase.",
    };
  }
}
