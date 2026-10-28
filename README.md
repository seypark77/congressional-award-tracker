# The Congressional Award Tracker (PWA)

A mobile-first, responsive web application (PWA-ready) built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, and **Lucide React** to track all requirements for **The Congressional Award** based on the official Program Workbook and Hour Log guidelines.

## Key Features & Domain Logic

1. **Participant Profile & Advisor Verification**
   - Tracks Participant Name, State/District, and **Official Activity Start Date** (validates and blocks logging activities prior to this date).
   - Supports all 6 target levels: **Bronze, Silver, and Gold Certificates** and **Bronze, Silver, and Gold Medals**.
   - Tracks non-family adult **Advisor** information (`Name`, `Role`, `Email`, `Phone`, and mandatory non-family verification).

2. **Program Areas & Goal Limits**
   - **Voluntary Public Service (VPS)**: Up to **4 goals** allowed. Tracks **Direct vs. Indirect Service** hours and triggers a real-time warning if Indirect Service exceeds **25%** of total VPS hours.
   - **Personal Development (PD)**: Up to **2 goals** allowed.
   - **Physical Fitness (PF)**: Up to **2 goals** allowed.
   - **Adult Validator Tracking**: Every goal requires a verified non-family adult Validator (`Name`, `Role/Title`, `Email`, and non-family confirmation).

3. **Expedition / Exploration Tracker**
   - **In-Person Mode**: Daily 6–8 hour timestamped activity logs (`Date`, `Start Time`, `End Time`, `Active Hours`, `Route/Location`, `Overnight Lodging/Campsite`, `Activities Summary`) + participant-led planning & safety checklist.
   - **Virtual Mode**: Virtual immersion activity checklists + the **7 Official Reflection Questions**.

4. **Official Hour Log Structure & Exports**
   - Logs `Date`, `Program Area`, `Goal Number`, `Activity Description`, `Organization (Optional)`, and `Hours (decimal format)`.
   - Real-time calculation of cumulative hours and **distinct active months** per area toward the target award level.
   - **Submittable Copy Helper**: Structured one-click copy-paste summaries formatted for the official Submittable application.
   - **Official CSV Export**: Exports data matching the exact columns of the official Hour Log (`Date, Program Area, Goal Number, Activity Description, Organization, Hours`).
   - **Hybrid Cloud + LocalStorage Persistence**: Syncs in real time with **Supabase** (`profiles`, `goals`, `activity_logs`, `expeditions`) when configured, and falls back seamlessly to browser `LocalStorage` when offline or unconfigured.

## Supabase Cloud Database Setup

1. **Run the Database Schema**:
   - Open your project in the Supabase Dashboard (`SQL Editor` -> `New query`).
   - Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run** to create the `profiles`, `goals`, `activity_logs`, and `expeditions` tables, RLS policies, and Realtime publications.

2. **Configure API Credentials**:
   - Copy your **Project URL** and **anon public key** from `Project Settings -> API` in Supabase.
   - Update [`.env.local`](.env.local) (modeled on [`.env.example`](.env.example)):
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
     ```
   - Restart the dev server (`npm run dev`) and click **"Sync LocalStorage to Supabase"** in the **Submittable & Backup** tab to migrate existing local data.

