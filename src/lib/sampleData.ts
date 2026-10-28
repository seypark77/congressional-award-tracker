import { VIRTUAL_REFLECTION_QUESTIONS } from "./constants";
import { CongressionalAwardState } from "./types";

export const SAMPLE_STARTER_DATA: CongressionalAwardState = {
  profile: {
    name: "Alex Rivera",
    activityStartDate: "2025-09-01",
    targetLevel: "bronze_medal",
    stateOrDistrict: "VA-11",
    advisor: {
      name: "Dr. Elena Vance",
      role: "AP Government Teacher & Faculty Sponsor",
      email: "evance@oakridgehigh.edu",
      phone: "(703) 555-0194",
      isNonFamilyConfirmed: true,
    },
  },
  goals: [
    {
      id: "goal-vps-1",
      area: "VPS",
      goalNumber: 1,
      title: "Direct Food Distribution & Pantry Operations",
      description:
        "Volunteer weekly at the Community Harvest Food Bank sorting fresh produce, assembling family nutrition boxes, and directly assisting client check-in for 75+ hours.",
      organizationDefault: "Community Harvest Food Bank",
      validator: {
        name: "Marcus Holloway",
        role: "Volunteer Operations Coordinator",
        email: "mholloway@communityharvest.org",
        phone: "(703) 555-0142",
        isNonFamilyConfirmed: true,
      },
    },
    {
      id: "goal-vps-2",
      area: "VPS",
      goalNumber: 2,
      title: "STEM & Robotics Peer Mentorship at Public Library",
      description:
        "Lead Saturday youth coding and robotics workshops for middle school students at the County Public Library branch and prepare take-home STEM kits.",
      organizationDefault: "Fairfax County Public Library - Youth STEM Lab",
      validator: {
        name: "Priya Nair",
        role: "Youth Services Librarian",
        email: "priya.nair@fcpl.org",
        phone: "(703) 555-0188",
        isNonFamilyConfirmed: true,
      },
    },
    {
      id: "goal-pd-1",
      area: "PD",
      goalNumber: 1,
      title: "Full-Stack Web Development & Civic Tech Certification",
      description:
        "Complete structured coursework in TypeScript, React, and accessibility standards, culminating in building an open-source civic resource locator.",
      organizationDefault: "CodeForYouth Academy",
      validator: {
        name: "David Chen",
        role: "Senior Software Instructor",
        email: "dchen@codeforyouth.org",
        phone: "(703) 555-0161",
        isNonFamilyConfirmed: true,
      },
    },
    {
      id: "goal-pd-2",
      area: "PD",
      goalNumber: 2,
      title: "Conversational Spanish Fluency (B1 to B2 Level)",
      description:
        "Practice structured grammar, listening comprehension, and weekly conversational immersion sessions to advance from intermediate B1 to B2 proficiency.",
      organizationDefault: "Instituto Cervantes Language Circle",
      validator: {
        name: "Sofia Morales",
        role: "Spanish Language Instructor",
        email: "smorales@cervantescircle.org",
        isNonFamilyConfirmed: true,
      },
    },
    {
      id: "goal-pf-1",
      area: "PF",
      goalNumber: 1,
      title: "Half-Marathon Endurance & Lower-Pace Training",
      description:
        "Train 3–4 times per week to improve 5K pace from 9:30/mi to 8:15/mi and complete a sanctioned 10K and Half-Marathon race without stopping.",
      organizationDefault: "Potomac Valley Track & Striders",
      validator: {
        name: "Coach Terrence Brooks",
        role: "Head Cross-Country & Distance Coach",
        email: "tbrooks@pvstriders.org",
        phone: "(703) 555-0129",
        isNonFamilyConfirmed: true,
      },
    },
  ],
  logs: [
    // VPS Logs across 6 distinct months
    {
      id: "log-1",
      date: "2025-09-13",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Sorted 800 lbs of donated produce and assisted 45 families at the Saturday morning client pantry distribution line.",
      organization: "Community Harvest Food Bank",
      hours: 6.5,
      isIndirectService: false,
      createdAt: "2025-09-13T16:00:00Z",
    },
    {
      id: "log-2",
      date: "2025-09-27",
      area: "VPS",
      goalNumber: 2,
      activityDescription:
        "Designed and assembled take-home circuit boards and flyers at home for upcoming library STEM workshops (Indirect preparation).",
      organization: "Fairfax County Public Library - Youth STEM Lab",
      hours: 5.0,
      isIndirectService: true,
      createdAt: "2025-09-27T17:00:00Z",
    },
    {
      id: "log-3",
      date: "2025-10-11",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Managed cold-storage inventory check-in and staffed the bilingual family welcome desk during weekend food distribution.",
      organization: "Community Harvest Food Bank",
      hours: 8.0,
      isIndirectService: false,
      createdAt: "2025-10-11T16:00:00Z",
    },
    {
      id: "log-4",
      date: "2025-10-25",
      area: "VPS",
      goalNumber: 2,
      activityDescription:
        "Co-taught introductory Python & micro:bit sensors workshop for 18 middle school participants.",
      organization: "Fairfax County Public Library - Youth STEM Lab",
      hours: 4.5,
      isIndirectService: false,
      createdAt: "2025-10-25T16:30:00Z",
    },
    {
      id: "log-5",
      date: "2025-11-15",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Assisted with Thanksgiving Holiday Basket distribution event, loading vehicles and assisting senior citizens.",
      organization: "Community Harvest Food Bank",
      hours: 9.5,
      isIndirectService: false,
      createdAt: "2025-11-15T18:00:00Z",
    },
    {
      id: "log-6",
      date: "2025-11-22",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Organized canned food drive collection bins at school to donate to the pantry (Indirect collection drive).",
      organization: "Community Harvest Food Bank",
      hours: 4.0,
      isIndirectService: true,
      createdAt: "2025-11-22T15:00:00Z",
    },
    {
      id: "log-7",
      date: "2025-12-13",
      area: "VPS",
      goalNumber: 2,
      activityDescription:
        "Mentored 4 student teams during the Winter Robotics Mini-Challenge and helped debug autonomous navigation sensors.",
      organization: "Fairfax County Public Library - Youth STEM Lab",
      hours: 7.5,
      isIndirectService: false,
      createdAt: "2025-12-13T17:00:00Z",
    },
    {
      id: "log-8",
      date: "2026-01-17",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Packaged emergency winter shelf-stable meal boxes and assisted direct walk-in distribution.",
      organization: "Community Harvest Food Bank",
      hours: 8.5,
      isIndirectService: false,
      createdAt: "2026-01-17T16:00:00Z",
    },
    {
      id: "log-9",
      date: "2026-02-14",
      area: "VPS",
      goalNumber: 2,
      activityDescription:
        "Led hands-on Scratch-to-Python bridge workshop and provided 1-on-1 tutoring for 14 youth attendees.",
      organization: "Fairfax County Public Library - Youth STEM Lab",
      hours: 6.5,
      isIndirectService: false,
      createdAt: "2026-02-14T16:30:00Z",
    },
    {
      id: "log-10",
      date: "2026-03-14",
      area: "VPS",
      goalNumber: 1,
      activityDescription:
        "Directed weekend produce market distribution and trained 3 new high school volunteers on food safety.",
      organization: "Community Harvest Food Bank",
      hours: 8.0,
      isIndirectService: false,
      createdAt: "2026-03-14T16:30:00Z",
    },

    // PD Logs across 6 distinct months
    {
      id: "log-11",
      date: "2025-09-18",
      area: "PD",
      goalNumber: 1,
      activityDescription:
        "Completed semantic HTML5, WCAG 2.1 AA accessibility modules, and responsive layout labs.",
      organization: "CodeForYouth Academy",
      hours: 6.5,
      createdAt: "2025-09-18T20:00:00Z",
    },
    {
      id: "log-12",
      date: "2025-10-16",
      area: "PD",
      goalNumber: 1,
      activityDescription:
        "Built interactive state management components in TypeScript and attended live code review with instructor.",
      organization: "CodeForYouth Academy",
      hours: 7.5,
      createdAt: "2025-10-16T20:00:00Z",
    },
    {
      id: "log-13",
      date: "2025-11-19",
      area: "PD",
      goalNumber: 2,
      activityDescription:
        "Completed subjunctive mood grammar workshops and 3 hours of live Spanish conversation partner sessions.",
      organization: "Instituto Cervantes Language Circle",
      hours: 6.0,
      createdAt: "2025-11-19T19:30:00Z",
    },
    {
      id: "log-14",
      date: "2025-12-18",
      area: "PD",
      goalNumber: 1,
      activityDescription:
        "Developed civic food-pantry map prototype integrating geolocation filtering and keyboard navigation.",
      organization: "CodeForYouth Academy",
      hours: 8.0,
      createdAt: "2025-12-18T21:00:00Z",
    },
    {
      id: "log-15",
      date: "2026-01-22",
      area: "PD",
      goalNumber: 2,
      activityDescription:
        "Participated in weekly Spanish debate roundtable and completed B2 reading comprehension assessments.",
      organization: "Instituto Cervantes Language Circle",
      hours: 5.5,
      createdAt: "2026-01-22T19:30:00Z",
    },
    {
      id: "log-16",
      date: "2026-02-20",
      area: "PD",
      goalNumber: 1,
      activityDescription:
        "Conducted usability testing and deployed open-source civic directory project.",
      organization: "CodeForYouth Academy",
      hours: 6.5,
      createdAt: "2026-02-20T20:30:00Z",
    },

    // PF Logs across 6 distinct months
    {
      id: "log-17",
      date: "2025-09-20",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Base mileage conditioning: 4x weekly runs totaling 18 miles plus core stability circuits.",
      organization: "Potomac Valley Track & Striders",
      hours: 7.0,
      createdAt: "2025-09-20T11:00:00Z",
    },
    {
      id: "log-18",
      date: "2025-10-18",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Track interval workouts (800m repeats) and Sunday progressive long distance run (8 miles).",
      organization: "Potomac Valley Track & Striders",
      hours: 7.5,
      createdAt: "2025-10-18T11:00:00Z",
    },
    {
      id: "log-19",
      date: "2025-11-28",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Tempo runs, hill repeats, and completed official Autumn 10K race in 51:40 (8:19/mi pace).",
      organization: "Potomac Valley Track & Striders",
      hours: 8.0,
      createdAt: "2025-11-28T12:00:00Z",
    },
    {
      id: "log-20",
      date: "2025-12-20",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Winter endurance maintenance: long trail runs and dynamic mobility/injury-prevention training.",
      organization: "Potomac Valley Track & Striders",
      hours: 6.5,
      createdAt: "2025-12-20T12:00:00Z",
    },
    {
      id: "log-21",
      date: "2026-01-24",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Half-marathon build phase: 10-mile long runs and mid-week lactate threshold sessions.",
      organization: "Potomac Valley Track & Striders",
      hours: 7.5,
      createdAt: "2026-01-24T12:00:00Z",
    },
    {
      id: "log-22",
      date: "2026-02-28",
      area: "PF",
      goalNumber: 1,
      activityDescription:
        "Peak 12-mile training run and negative-split pacing drills with track club.",
      organization: "Potomac Valley Track & Striders",
      hours: 6.0,
      createdAt: "2026-02-28T12:00:00Z",
    },
  ],
  expedition: {
    mode: "in_person",
    type: "Expedition",
    title: "Shenandoah National Park Backcountry Ridge Trek",
    locationOrTheme: "Shenandoah National Park, Virginia (Central District)",
    startDate: "2026-04-11",
    endDate: "2026-04-12",
    nightsCount: 1,
    overview:
      "A 2-day, 1-night self-reliant backpacking expedition covering 16.4 miles across the Appalachian Trail and Nicholson Hollow circuit. Planned route topography, water filtration stops, camp stove meals, and backcountry permit logistics.",
    validator: {
      name: "Ranger Thomas Gallagher",
      role: "Backcountry Outdoor Leader & Wilderness First Responder",
      email: "tgallagher@blueridgeoutdoor.org",
      phone: "(540) 555-0173",
      isNonFamilyConfirmed: true,
    },
    inPersonDays: [
      {
        id: "exp-day-1",
        dayNumber: 1,
        date: "2026-04-11",
        startTime: "08:00",
        endTime: "15:30",
        activeHours: 7.5,
        locationOrRoute: "Thornton Gap to Byrds Nest #3 Shelter via Pass Mountain & Appalachian Trail (8.8 miles)",
        activitiesSummary:
          "Completed gear weigh-in and safety check at trailhead (08:00), navigated 2,100 ft elevation gain using topographic map & compass, filtered stream water at Hughes River gap, pitched tent and cooked dehydrated camp dinner before dusk.",
        overnightLocation: "Byrds Nest #3 Backcountry Campsite (Tent camping)",
      },
      {
        id: "exp-day-2",
        dayNumber: 2,
        date: "2026-04-12",
        startTime: "07:30",
        endTime: "14:30",
        activeHours: 7.0,
        locationOrRoute: "Byrds Nest #3 via Old Rag Fire Road & Corbin Cabin Cutoff back to Trailhead (7.6 miles)",
        activitiesSummary:
          "Broke camp following Leave No Trace principles (07:30), prepared hot oatmeal breakfast, navigated descent through Nicholson Hollow, documented native flora and granite formations, completed post-hike gear inspection at 14:30.",
        overnightLocation: "Completed trek / Returned home",
      },
    ],
    packingAndPlanningChecklist: [
      { id: "chk-1", label: "Mapped daily itinerary with 6–8 hours of active engagement per day", checked: true },
      { id: "chk-2", label: "Secured backcountry camping permit / lodging confirmation", checked: true },
      { id: "chk-3", label: "Prepared nutrition plan, water filtration, and cooking supplies", checked: true },
      { id: "chk-4", label: "Packed First Aid kit, rain gear, topographic map, and emergency contacts", checked: true },
      { id: "chk-5", label: "Reviewed Leave No Trace & safety protocols with Adult Validator", checked: true },
    ],
    virtualActivities: [
      {
        id: "v-act-1",
        title: "Smithsonian National Museum of Natural History Virtual Deep-Dive & Curatorial Seminars",
        resourceOrUrl: "https://naturalhistory.si.edu/visit/virtual-tour",
        dateCompleted: "2026-04-11",
        hoursSpent: 6.5,
        completed: true,
        notes: "Explored Biodiversity & North American Ecosystems halls, took detailed field sketches of Appalachian specimens.",
      },
      {
        id: "v-act-2",
        title: "National Park Service GIS Conservation Mapping Workshop & Live Ranger Q&A",
        resourceOrUrl: "https://www.nps.gov/shen/learn/index.htm",
        dateCompleted: "2026-04-12",
        hoursSpent: 6.5,
        completed: true,
        notes: "Analyzed hemlock woolly adelgid forest conservation data and completed virtual watershed restoration module.",
      },
    ],
    virtualReflections: VIRTUAL_REFLECTION_QUESTIONS.map((q, idx) => ({
      questionIndex: idx + 1,
      question: q,
      answer:
        idx === 0
          ? "My virtual exploration focused on Appalachian Forest Ecology and Conservation Science in the Blue Ridge Mountains. I chose this theme to understand how climate resilience and invasive species management protect public lands."
          : idx === 1
          ? "Across two full days (13 hours total), I completed virtual museum specimen studies, interactive USGS/NPS topographic watershed labs, and attended a recorded conservation biology symposium while maintaining an illustrated field journal."
          : "",
    })),
  },
};
