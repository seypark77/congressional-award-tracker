import { AwardLevelId, AwardLevelRequirement, ProgramAreaId } from "./types";

export const AWARD_LEVELS: Record<AwardLevelId, AwardLevelRequirement> = {
  bronze_cert: {
    id: "bronze_cert",
    name: "Bronze Certificate",
    tier: "Certificate",
    metal: "Bronze",
    vpsHours: 30,
    pdHours: 15,
    pfHours: 15,
    minMonths: 6,
    expeditionDays: 1,
    expeditionNights: 0,
    expeditionDescription: "1 Day (at least 6–8 hours)",
    badgeColor: "from-amber-700 to-amber-600",
  },
  silver_cert: {
    id: "silver_cert",
    name: "Silver Certificate",
    tier: "Certificate",
    metal: "Silver",
    vpsHours: 60,
    pdHours: 30,
    pfHours: 30,
    minMonths: 12,
    expeditionDays: 2,
    expeditionNights: 1,
    expeditionDescription: "2 Consecutive Days (1 Overnight)",
    badgeColor: "from-slate-500 to-slate-400",
  },
  gold_cert: {
    id: "gold_cert",
    name: "Gold Certificate",
    tier: "Certificate",
    metal: "Gold",
    vpsHours: 90,
    pdHours: 45,
    pfHours: 45,
    minMonths: 18,
    expeditionDays: 3,
    expeditionNights: 2,
    expeditionDescription: "3 Consecutive Days (2 Consecutive Nights)",
    badgeColor: "from-yellow-500 to-amber-500",
  },
  bronze_medal: {
    id: "bronze_medal",
    name: "Bronze Medal",
    tier: "Medal",
    metal: "Bronze",
    vpsHours: 100,
    pdHours: 50,
    pfHours: 50,
    minMonths: 7,
    expeditionDays: 2,
    expeditionNights: 1,
    expeditionDescription: "2 Consecutive Days (1 Overnight)",
    badgeColor: "from-amber-800 to-orange-700",
  },
  silver_medal: {
    id: "silver_medal",
    name: "Silver Medal",
    tier: "Medal",
    metal: "Silver",
    vpsHours: 200,
    pdHours: 100,
    pfHours: 100,
    minMonths: 12,
    expeditionDays: 3,
    expeditionNights: 2,
    expeditionDescription: "3 Consecutive Days (2 Consecutive Nights)",
    badgeColor: "from-slate-600 to-zinc-500",
  },
  gold_medal: {
    id: "gold_medal",
    name: "Gold Medal",
    tier: "Medal",
    metal: "Gold",
    vpsHours: 400,
    pdHours: 200,
    pfHours: 200,
    minMonths: 24,
    expeditionDays: 5,
    expeditionNights: 4,
    expeditionDescription: "5 Consecutive Days (4 Consecutive Nights)",
    badgeColor: "from-yellow-600 via-amber-500 to-yellow-500",
  },
};

export const PROGRAM_AREAS: Record<
  ProgramAreaId,
  {
    id: ProgramAreaId;
    name: string;
    shortName: string;
    maxGoals: number;
    description: string;
    color: string;
    bgLight: string;
    textColor: string;
    borderColor: string;
    progressBarColor: string;
  }
> = {
  VPS: {
    id: "VPS",
    name: "Voluntary Public Service",
    shortName: "Public Service (VPS)",
    maxGoals: 4,
    description:
      "Sharing your time and talent to help others and your community without compensation. Up to 4 goals allowed; Indirect Service should not exceed 25% of total hours.",
    color: "blue",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    progressBarColor: "bg-blue-600",
  },
  PD: {
    id: "PD",
    name: "Personal Development",
    shortName: "Personal Dev (PD)",
    maxGoals: 2,
    description:
      "Developing personal interests, social skills, or career skills that expand your horizons. Maximum of 2 goals allowed.",
    color: "emerald",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    progressBarColor: "bg-emerald-600",
  },
  PF: {
    id: "PF",
    name: "Physical Fitness",
    shortName: "Physical Fitness (PF)",
    maxGoals: 2,
    description:
      "Improving your quality of life through physical conditioning, recreational sports, or athletic training. Maximum of 2 goals allowed.",
    color: "rose",
    bgLight: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    progressBarColor: "bg-rose-600",
  },
};

export const VIRTUAL_REFLECTION_QUESTIONS: string[] = [
  "1. What was the overarching theme or focus of your Virtual Expedition/Exploration, and why did you select it?",
  "2. Describe your itinerary and immersion activities: What virtual resources, tours, interviews, or workshops did you complete?",
  "3. How did you demonstrate personal initiative and self-reliance in researching, scheduling, and executing this project?",
  "4. What obstacles, technical challenges, or unexpected hurdles arose during your experience, and how did you overcome them?",
  "5. How did this experience challenge you or push you outside of your normal daily routine and comfort zone?",
  "6. What specific cultural, historical, environmental, or wilderness insights did you gain from this immersion?",
  "7. Looking back on the entire experience, what was your biggest takeaway, and what would you modify if planning it again?",
];
