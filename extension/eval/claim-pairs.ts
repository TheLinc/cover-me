// Hand-labeled pairs for the skill-claim checker (resume-grounding.ts): would a
// careful human editor accept this skill label from this resume evidence?
// The live eval runs the checker over these and fails below CLAIM_CHECK_MIN.
// Keep the checker prompt's own examples out of this list, or it grades itself.

export const CLAIM_CHECK_MIN = 0.9

export const CLAIM_PAIRS: Array<{ skill: string; evidence: string; ok: boolean }> = [
  // Honest connections: category labels, synonyms, the posting's wording for real work.
  { skill: 'State Management', evidence: 'Zustand', ok: true },
  { skill: 'Testing', evidence: 'Jest and React Testing Library suites reaching 85% coverage', ok: true },
  { skill: 'Paid Acquisition', evidence: 'Run Google Ads search campaigns with a $15,000 monthly budget', ok: true },
  { skill: 'EHR documentation', evidence: 'Chart assessments, medications, and care plans in Epic EHR', ok: true },
  { skill: 'clinical precepting', evidence: 'Precepted 3 newly graduated nurses through their first 12 weeks', ok: true },
  { skill: 'family education', evidence: 'Lead patient and family education for post-surgical discharge planning', ok: true },
  { skill: 'acute care', evidence: 'Manage a caseload of 6-7 patients per 12-hour shift on a 28-bed med-surg unit', ok: true },
  { skill: 'Expense Reporting', evidence: 'Process monthly expense reports in Concur', ok: true },
  { skill: 'Brand Systems', evidence: 'Design brand identities, packaging, and print collateral for 20+ consumer brands', ok: true },
  { skill: 'Legislative Briefing', evidence: 'Analyze unemployment insurance claims data in R to brief legislators on program trends', ok: true },
  { skill: 'Data Visualization', evidence: 'Built demand charts in matplotlib for a city council transportation briefing', ok: true },
  { skill: 'team training', evidence: 'Train 4 new line cooks on station setup and plating standards', ok: true },
  { skill: 'team supervision', evidence: 'Lead a team of 6 sales associates during weekend shifts', ok: true },
  { skill: 'Project Planning', evidence: 'Maintained project plans in MS Project and tracked risks in a weekly RAID log', ok: true },
  { skill: 'Requirements Elicitation', evidence: 'Gathered requirements from 6 department leads for a new carrier scheduling tool', ok: true },
  { skill: 'Quality Management', evidence: 'Achieved ISO 9001 recertification with zero major findings', ok: true },
  { skill: 'Help Article Authoring', evidence: 'Wrote 18 help-center articles that cut repeat billing contacts', ok: true },
  { skill: 'Relational Databases', evidence: 'Postgres', ok: true },
  { skill: 'Cycle Counting', evidence: 'Run cycle counts in Manhattan WMS with 99.6% inventory accuracy', ok: true },
  { skill: 'Lean', evidence: 'Rolled out 5S in the shipping area, freeing 800 sq ft of floor space', ok: true },
  // Inflation: real evidence that doesn't show the claimed skill, scope, domain, or credential.
  { skill: 'annual fund campaigns', evidence: 'Recruited and scheduled 45 volunteers for the annual fundraising gala', ok: false },
  { skill: 'Enterprise SaaS Sales', evidence: 'Closed $1.4M in new annual recurring revenue in 2024, 118% of quota', ok: false },
  { skill: 'Leave Administration', evidence: 'Updated the employee handbook for Colorado paid leave law changes', ok: false },
  { skill: 'KPI tracking', evidence: '100% accountability across 3 inspections', ok: false },
  { skill: 'Cell-Based Assays', evidence: 'Run qPCR and ELISA assays supporting 3 preclinical oncology programs', ok: false },
  { skill: 'ADDIE model', evidence: 'Designed a 9th-grade biology curriculum of 36 units aligned to state standards', ok: false },
  { skill: 'food cost control', evidence: 'Prep sauces and proteins for a 40-item seasonal menu', ok: false },
  { skill: 'Executive reporting', evidence: 'Coordinated schedules, budgets, and status reporting for 4 concurrent software rollout projects', ok: false },
  { skill: 'Program Evaluation', evidence: 'Analyze unemployment insurance claims data in R to brief legislators on program trends', ok: false },
  { skill: 'GLP Documentation', evidence: 'Document experiments in Benchling and present results at weekly project meetings', ok: false },
  { skill: 'New-Logo Acquisition', evidence: 'Ran full sales cycles for mid-market companies with 50-500 employees', ok: false },
  { skill: 'Claims Operations', evidence: 'Maintained weekly claims volume reports in Excel for 3 underwriting teams', ok: false },
  { skill: 'Enterprise Sales Cycles', evidence: 'Ran full sales cycles for mid-market companies with 50-500 employees', ok: false },
  { skill: 'Meta Ads', evidence: 'Run Google Ads search campaigns', ok: false },
  { skill: 'ACLS', evidence: 'Basic Life Support (BLS) — American Heart Association', ok: false },
  { skill: 'continuous patient monitoring', evidence: 'Manage a caseload of 6-7 patients per 12-hour shift', ok: false },
  { skill: 'Motor Control Troubleshooting', evidence: 'Install and troubleshoot 120/208V three-phase power in commercial tenant finish-outs', ok: false },
  { skill: 'shrink reduction', evidence: 'Open and close the store 3 days a week, including cash counts and deposits', ok: false },
]
