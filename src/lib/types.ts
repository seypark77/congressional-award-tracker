export type AwardLevelId =
  | "bronze_cert"
  | "silver_cert"
  | "gold_cert"
  | "bronze_medal"
  | "silver_medal"
  | "gold_medal";

export type ProgramAreaId = "VPS" | "PD" | "PF";

export interface AwardLevelRequirement {
  id: AwardLevelId;
  name: string;
  tier: "Certificate" | "Medal";
  metal: "Bronze" | "Silver" | "Gold";
  vpsHours: number;
  pdHours: number;
  pfHours: number;
  minMonths: number;
  expeditionDays: number;
  expeditionNights: number;
  expeditionDescription: string;
  badgeColor: string;
}

export interface ValidatorInfo {
  name: string;
  role: string;
  email: string;
  phone?: string;
  isNonFamilyConfirmed: boolean;
}

export interface AdvisorInfo {
  name: string;
  role: string;
  email: string;
  phone?: string;
  isNonFamilyConfirmed: boolean;
}

export interface ParticipantProfile {
  name: string;
  activityStartDate: string; // YYYY-MM-DD
  targetLevel: AwardLevelId;
  stateOrDistrict?: string;
  advisor: AdvisorInfo;
}

export interface GoalItem {
  id: string;
  area: ProgramAreaId;
  goalNumber: number; // 1..4 for VPS, 1..2 for PD & PF
  title: string;
  description: string;
  organizationDefault?: string;
  validator: ValidatorInfo;
}

export interface HourLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  area: ProgramAreaId;
  goalNumber: number;
  activityDescription: string;
  organization: string;
  hours: number; // Decimal format, e.g., 2.5
  isIndirectService?: boolean; // Relevant for VPS (warn if > 25% of VPS hours)
  createdAt: string;
}

export interface InPersonDayLog {
  id: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm e.g. "08:30"
  endTime: string; // HH:mm e.g. "16:00"
  activeHours: number; // Should be 6-8 hours for official guidelines
  locationOrRoute: string;
  activitiesSummary: string;
  overnightLocation: string;
}

export interface VirtualActivityItem {
  id: string;
  title: string;
  resourceOrUrl: string;
  dateCompleted: string;
  hoursSpent: number;
  completed: boolean;
  notes: string;
}

export interface VirtualReflectionAnswer {
  questionIndex: number; // 1..7
  question: string;
  answer: string;
}

export interface ExpeditionData {
  mode: "in_person" | "virtual";
  type: "Expedition" | "Exploration";
  title: string;
  locationOrTheme: string;
  startDate: string;
  endDate: string;
  nightsCount: number;
  overview: string;
  validator: ValidatorInfo;
  // In-person specific
  inPersonDays: InPersonDayLog[];
  packingAndPlanningChecklist: { id: string; label: string; checked: boolean }[];
  // Virtual specific
  virtualActivities: VirtualActivityItem[];
  virtualReflections: VirtualReflectionAnswer[];
}

export interface CongressionalAwardState {
  profile: ParticipantProfile;
  goals: GoalItem[];
  logs: HourLogEntry[];
  expedition: ExpeditionData;
}
