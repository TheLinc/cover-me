// Hand-labeled roles for the line check (resume-grounding.ts): the candidate's
// original bullets, a tailor rewrite of them, and which rewritten lines claim
// more than the originals support. Taken from real eval outputs. Lines left
// out of `flag` and `ok` are borderline and not scored. The live eval runs the
// check over these and fails below LINE_CHECK_MIN.

export const LINE_CHECK_MIN = 0.85

export interface LineRole {
  id: string
  title: string
  company: string
  original: string[]
  rewritten: string[]
  /** Indexes into `rewritten` that should be flagged. */
  flag: number[]
  /** Indexes into `rewritten` that should pass. */
  ok: number[]
}

export const LINE_ROLES: LineRole[] = [
  {
    id: 'electrician', title: 'Journeyman Electrician', company: 'Front Range Electric',
    original: [
      'Install and troubleshoot 120/208V three-phase power in commercial tenant finish-outs',
      'Bend and run EMT and rigid conduit on projects up to 40,000 sq ft',
      'Read blueprints and lay out panel schedules with the foreman',
      'Lead a 3-person crew on service upgrades',
    ],
    rewritten: [
      'Bend and run EMT and rigid conduit on projects up to 40,000 sq ft',
      'Direct a 3-person crew on service upgrades, coordinating safe work practices in compliance with NEC and arc flash awareness protocols',
      'Install and diagnose 120/208V three-phase power systems in commercial tenant finish-outs, resolving faults from panel to load',
      'Bend and run EMT and rigid conduit on large-scale projects, reading blueprints and laying out panel schedules with the foreman',
    ],
    flag: [1], ok: [0],
  },
  {
    id: 'support', title: 'Customer Service Representative', company: 'Clearwave Internet',
    original: [
      'Resolve 55-65 billing and connectivity tickets a day in Zendesk',
      'Hold a 94% CSAT score over the last 12 months, top 10% of a 60-agent team',
      'Wrote 18 help-center articles that cut repeat billing contacts',
      'Train new hires on the escalation process during their first 2 weeks',
    ],
    rewritten: [
      'Maintained a 94% CSAT score over 12 months — top 10% of a 60-agent team — while handling escalated billing and connectivity tickets',
      'Resolved 55–65 technical support tickets daily in Zendesk, triaging and routing cases by issue type and severity',
      'Authored 18 help-center articles that reduced repeat billing contacts by providing self-service resolution paths',
      'Mentored new hires on the escalation process during their first two weeks, accelerating readiness for independent case ownership',
    ],
    flag: [0, 1, 3], ok: [2],
  },
  {
    id: 'policy', title: 'Policy Analyst', company: 'Colorado Department of Labor and Employment',
    original: [
      'Analyze unemployment insurance claims data in R to brief legislators on program trends',
      'Draft 10+ fiscal notes and policy memos a year for the state legislature',
      'Coordinated a stakeholder working group of 15 employer and worker advocacy organizations',
      "Built a public dashboard of monthly claims data used by the Governor's office",
    ],
    rewritten: [
      "Briefed state legislators and the Governor's office on unemployment insurance program trends through data analysis and written policy memos, producing 10+ fiscal notes annually",
      'Analyzed unemployment insurance claims data in R to evaluate federal workforce program performance and surface actionable trends for senior leadership',
      "Built a public dashboard of monthly claims data adopted by the Governor's office as a primary monitoring tool for program outcomes",
      'Coordinated a stakeholder working group of 15 employer and worker advocacy organizations to inform workforce policy development',
    ],
    flag: [0, 1, 2], ok: [],
  },
  {
    id: 'welder', title: 'Structural Welder', company: 'Ironclad Fabrication',
    original: [
      'Weld structural steel beams and columns with FCAW and SMAW in all positions',
      'Read shop drawings and weld symbols to fabricate 15-20 assemblies a week',
      'Kept a zero-rework record on 2 consecutive bridge girder jobs',
    ],
    rewritten: [
      'Kept a zero-rework record on 2 consecutive bridge girder jobs',
      'Executed SMAW and FCAW welds on structural steel in all positions, building all-position technique applicable to fixed-position pipe welding',
      'Interpreted shop drawings and weld symbols to fabricate 15–20 assemblies per week, applying the same blueprint-reading skills required for pipe spool and fit-up work',
    ],
    flag: [1, 2], ok: [0],
  },
  {
    id: 'executive-assistant', title: 'Executive Assistant to the CFO', company: 'Ironwood Capital Partners',
    original: [
      'Manage calendar, travel, and expenses for the CFO and two managing directors',
      'Prepare board meeting materials for 4 quarterly board meetings a year',
      'Process monthly expense reports in Concur, averaging 80 receipts a month',
      'Coordinate an annual investor conference for 300 attendees',
    ],
    rewritten: [
      'Prepared board meeting materials and managed all follow-up logistics for 4 quarterly board meetings annually',
      'Directed calendar, travel, and expense management for the CFO and two managing directors across time zones',
      'Processed monthly expense reports averaging 80 receipts in Concur, maintaining accurate and timely submissions',
      'Coordinated an annual investor conference from end to end, delivering a 300-attendee event on schedule',
    ],
    flag: [0, 1, 3], ok: [],
  },
  {
    id: 'office-manager', title: 'Office Manager & Bookkeeper', company: 'Cedar & Pine Dental',
    original: [
      'Kept the books in QuickBooks Desktop for a 3-dentist practice with $2.1M in annual revenue',
      'Ran payroll for 14 staff and filed quarterly payroll tax reports',
      'Negotiated supply contracts that cut dental supply spend by 12%',
      'Managed front-desk scheduling and insurance billing for 40+ patients a day',
    ],
    rewritten: [
      'Managed accounts payable and receivable in QuickBooks for a 3-dentist practice generating $2.1M in annual revenue',
      'Processed payroll for 14 staff and filed quarterly payroll tax reports, maintaining compliance across all reporting periods',
      'Negotiated vendor and supply contracts, reducing dental supply spend by 12%',
      'Directed front-desk operations and insurance billing for 40+ patients daily, keeping facilities and scheduling running smoothly',
    ],
    flag: [3], ok: [],
  },
  {
    id: 'line-cook', title: 'Line Cook', company: 'Copper Kettle Bistro',
    original: [
      'Run the grill station for 250+ covers on weekend nights',
      'Prep sauces and proteins for a 40-item seasonal menu',
      'Train 4 new line cooks on station setup and plating standards',
      'Keep temperature logs and have passed every health inspection since 2021',
    ],
    rewritten: [
      'Trained 4 new line cooks on station setup, plating standards, and mise en place — directly supporting kitchen team development',
      'Led the grill station through 250+ covers on weekend nights, maintaining quality and timing across a high-volume service',
      'Prepped sauces and proteins for a 40-item seasonal menu, contributing to menu execution and kitchen consistency',
      'Maintained temperature logs and passed every health inspection since 2021, upholding food safety standards across all service periods',
    ],
    flag: [0], ok: [1, 2, 3],
  },
  {
    id: 'retail', title: 'Keyholder', company: 'Trailhead Outfitters',
    original: [
      'Open and close the store 3 days a week, including cash counts and deposits',
      'Lead a team of 6 sales associates during weekend shifts',
      'Reset seasonal floor displays using corporate planograms',
      'Beat monthly sales targets in 9 of the last 12 months',
    ],
    rewritten: [
      'Supervised a team of 6 sales associates during weekend shifts, directing task assignments and maintaining floor standards',
      'Owned store open and close procedures 3 days per week, including cash counts and bank deposits',
      'Executed seasonal visual merchandising resets using corporate planograms to meet brand standards',
      'Exceeded monthly sales targets in 9 of the last 12 months, consistently driving top-line performance',
    ],
    flag: [], ok: [1, 2, 3],
  },
  {
    id: 'warehouse', title: 'Warehouse Lead', company: 'Midwest Parts Supply',
    original: [
      'Lead a 10-person picking crew averaging 145 picks per hour',
      'Run cycle counts in Manhattan WMS with 99.6% inventory accuracy',
      'Operate sit-down and reach forklifts with zero recordable incidents in 3 years',
      'Rolled out 5S in the shipping area, freeing 800 sq ft of floor space',
    ],
    rewritten: [
      'Rolled out 5S methodology in the shipping area, reclaiming 800 sq ft of floor space and improving workflow throughput',
      'Directed a 10-person picking crew to sustain 145 picks per hour through consistent labor planning and floor accountability',
      'Executed cycle counting in Manhattan WMS, maintaining 99.6% inventory accuracy across active SKUs',
      'Operated sit-down and reach forklifts across a 3-year period with zero recordable safety incidents, in full compliance with OSHA powered industrial truck standards',
    ],
    flag: [0, 1, 3], ok: [2],
  },
  {
    id: 'pharmacy-tech', title: 'Certified Pharmacy Technician', company: 'Corner Care Pharmacy',
    original: [
      'Fill and verify 300+ prescriptions a day under pharmacist supervision',
      'Process insurance claims and resolve rejections with PBMs',
      'Manage controlled substance counts and inventory for the CII safe',
      'Trained 3 new technicians on the pharmacy software',
    ],
    rewritten: [
      'Managed controlled substance cycle counting and inventory for the CII safe, maintaining accurate records under pharmacist supervision',
      'Filled and verified 300+ prescriptions daily, ensuring dispensing accuracy across a high-volume retail setting',
      'Mentored 3 new pharmacy technicians on Rx30 software workflows and dispensing procedures',
      'Processed insurance claims and resolved third-party rejections with PBMs to ensure uninterrupted patient access to medications',
    ],
    flag: [2], ok: [0, 1],
  },
]
