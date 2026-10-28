"use client";

import React from "react";
import { AWARD_LEVELS } from "@/lib/constants";
import {
  AwardLevelId,
  HourLogEntry,
  ParticipantProfile,
} from "@/lib/types";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  MapPin,
} from "lucide-react";

interface ProfileAdvisorViewProps {
  profile: ParticipantProfile;
  logs: HourLogEntry[];
  onUpdateProfile: (updated: ParticipantProfile) => void;
}

export default function ProfileAdvisorView({
  profile,
  logs,
  onUpdateProfile,
}: ProfileAdvisorViewProps) {
  const logsBeforeStartDate = logs.filter(
    (l) => profile.activityStartDate && l.date < profile.activityStartDate
  );

  const handleField = <K extends keyof ParticipantProfile>(
    key: K,
    val: ParticipantProfile[K]
  ) => {
    onUpdateProfile({
      ...profile,
      [key]: val,
    });
  };

  return (
    <div className="space-y-6">
      {/* Participant Profile & Activity Start Date */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Participant Profile & Official Activity Start Date
              </h2>
              <p className="text-xs text-slate-500">
                Hours cannot be logged prior to your official registration / Activity Start Date
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Participant Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleField("name", e.target.value)}
              placeholder="e.g., Alex Rivera"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Official Activity Start Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={profile.activityStartDate}
                onChange={(e) =>
                  handleField("activityStartDate", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              State & Congressional District
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={profile.stateOrDistrict || ""}
                onChange={(e) => handleField("stateOrDistrict", e.target.value)}
                placeholder="e.g., VA-11"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {logsBeforeStartDate.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-xs text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">
                Start Date Validation Notice:
              </strong>{" "}
              You have {logsBeforeStartDate.length} existing log entry(s) dated before your current Activity Start Date ({profile.activityStartDate}). Please review them in the Hour Log History table or verify your official start date.
            </div>
          </div>
        )}
      </div>

      {/* Advisor Information Card (Must not be a family member) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Official Advisor Information
              </h2>
              <p className="text-xs text-slate-500">
                Your Advisor guides your goal setting and reviews your recordbook •{" "}
                <strong className="text-slate-700">
                  Must not be a parent, relative, or peer
                </strong>
              </p>
            </div>
          </div>

          {profile.advisor.isNonFamilyConfirmed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Non-Family Adult Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" /> Non-Family Verification Needed
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Advisor Full Name *
            </label>
            <input
              type="text"
              value={profile.advisor.name}
              onChange={(e) =>
                handleField("advisor", {
                  ...profile.advisor,
                  name: e.target.value,
                })
              }
              placeholder="e.g., Dr. Elena Vance"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Advisor Title / Relationship *
            </label>
            <input
              type="text"
              value={profile.advisor.role}
              onChange={(e) =>
                handleField("advisor", {
                  ...profile.advisor,
                  role: e.target.value,
                })
              }
              placeholder="e.g., Teacher, Guidance Counselor, Mentor"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Advisor Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={profile.advisor.email}
                onChange={(e) =>
                  handleField("advisor", {
                    ...profile.advisor,
                    email: e.target.value,
                  })
                }
                placeholder="advisor@school.edu"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Advisor Phone (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={profile.advisor.phone || ""}
                onChange={(e) =>
                  handleField("advisor", {
                    ...profile.advisor,
                    phone: e.target.value,
                  })
                }
                placeholder="(555) 000-0000"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={profile.advisor.isNonFamilyConfirmed}
            onChange={(e) =>
              handleField("advisor", {
                ...profile.advisor,
                isNonFamilyConfirmed: e.target.checked,
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          <span className="text-xs text-slate-700">
            <strong>Official Advisor Eligibility Confirmation:</strong> I verify that my Congressional Award Advisor is an adult and is{" "}
            <span className="underline font-semibold">
              NOT a parent, guardian, relative, family member, or peer
            </span>
            .
          </span>
        </label>
      </div>

      {/* Target Award Level Selector & Official Requirements Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Target Level Selection (Certificates & Medals)
          </h2>
          <p className="text-xs text-slate-500">
            Select your target award level below. Hours and active months carry over as you advance from Bronze to Gold!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(Object.keys(AWARD_LEVELS) as AwardLevelId[]).map((levelId) => {
            const req = AWARD_LEVELS[levelId];
            const isSelected = profile.targetLevel === levelId;
            return (
              <button
                key={levelId}
                type="button"
                onClick={() => handleField("targetLevel", levelId)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-2 border-blue-600 bg-blue-50/30 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${req.badgeColor}`}
                    >
                      {req.tier}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1">
                      {req.name}
                    </h3>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                      <CheckCircle2 className="w-4 h-4" /> Target
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between">
                    <span>Voluntary Public Service:</span>
                    <strong className="text-slate-900">
                      {req.vpsHours} hrs
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Personal Development:</span>
                    <strong className="text-slate-900">{req.pdHours} hrs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Physical Fitness:</span>
                    <strong className="text-slate-900">{req.pfHours} hrs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Active Months:</span>
                    <strong className="text-emerald-700">
                      {req.minMonths} mos / area
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Expedition / Exploration:</span>
                    <strong className="text-purple-700">
                      {req.expeditionDays}d / {req.expeditionNights}n
                    </strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
