// A nurse's resume with the fields long master resumes added outside tech: a
// headline, skills in labelled groups and an awards section of entries, so the
// headline guard, grouped skills and entries run on a non-tech resume against
// a real model. Made up; no real person or employer (#190).

import type { ParsedResume } from '../src/types'
import type { EvalCase } from './fixtures'

const roles = [
  {
    title: 'Registered Nurse', company: 'Mercy General Hospital', location: 'Columbus, OH', dates: 'Aug 2021 – Present',
    bullets: [
      'Provide care for 5–6 patients a shift on a 32-bed medical-surgical unit',
      'Monitored telemetry for up to 4 cardiac step-down overflow patients a shift and escalated rhythm changes to the rapid response team',
      'Reduced the unit\'s hospital-acquired pressure injuries from 9 to 3 a quarter by leading a two-hour turning and skin-check protocol',
      'Precepted 3 new graduate nurses through their 12-week orientation',
      'Administer IV medications and blood products and document in Epic',
      'Taught heart failure discharge education using teach-back, with 30-day readmissions for those patients falling from 18% to 12%',
      'Served on the unit practice council and rewrote the fall-prevention huddle checklist',
    ],
  },
  {
    title: 'Patient Care Technician', company: 'Riverside Methodist Hospital', location: 'Columbus, OH', dates: 'Jun 2019 – Jul 2021',
    bullets: [
      'Recorded vital signs and blood glucose for 10–12 patients a shift on a cardiac step-down unit',
      'Placed 12-lead ECGs and reported abnormal readings to the assigned nurse',
      'Assisted registered nurses with patient mobility, bathing and feeding',
      'Stocked supply rooms and restocked crash carts after each code',
    ],
  },
]

const awards = [
  { name: 'DAISY Award for Extraordinary Nurses', subtitle: 'Mercy General Hospital', dates: '2023', bullets: ['Nominated by a patient\'s family for discharge teaching'] },
  { name: 'Unit Nurse of the Quarter', subtitle: '4 West Medical-Surgical', dates: 'Q2 2022', bullets: [] },
]

const certifications = ['Registered Nurse, State of Ohio', 'Basic Life Support (BLS), American Heart Association']

const skillsText = 'Clinical: Medication administration, IV therapy, Telemetry monitoring, Wound care, Patient education\nSystems: Epic, Pyxis, Omnicell\nLanguages: Spanish (conversational)'

const nurseText = `Maria Okafor
Registered Nurse
maria.okafor@example.com | (555) 482-1170 | Columbus, OH

EXPERIENCE

${roles.map((r) => `${r.title} — ${r.company}, ${r.location} (${r.dates})\n${r.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n')}

EDUCATION

Bachelor of Science in Nursing — The Ohio State University, Columbus, OH (2017 – 2021)

LICENSES AND CERTIFICATIONS
${certifications.map((c) => `- ${c}`).join('\n')}

AWARDS AND RECOGNITION

${awards.map((a) => `${a.name} | ${a.subtitle} | ${a.dates}${a.bullets.map((b) => `\n- ${b}`).join('')}`).join('\n\n')}

SKILLS
${skillsText}`

const nurseParsed: ParsedResume = {
  name: 'Maria Okafor',
  email: 'maria.okafor@example.com',
  phone: '(555) 482-1170',
  website: '',
  location: 'Columbus, OH',
  headline: 'Registered Nurse',
  experience: roles.map((r) => ({ ...r, bullets: [...r.bullets] })),
  education: [{ institution: 'The Ohio State University', degree: 'Bachelor of Science in Nursing', location: 'Columbus, OH', dates: '2017 – 2021', bullets: [] }],
  certifications: [...certifications],
  skills: skillsText,
  otherSections: [{ heading: 'AWARDS AND RECOGNITION', lines: [], entries: awards.map((a) => ({ ...a, bullets: [...a.bullets] })) }],
  sectionOrder: ['summary', 'experience', 'education', 'certifications', 'other', 'skills'],
}

export const NURSE_GROUPED_CASE: EvalCase = {
  id: 'nurse-headline-grouped-skills',
  industry: 'Healthcare',
  fieldNotes: 'Nursing: licensure and certifications, unit type and patient ratios, EHR system, patient safety and education. Med-surg experience with telemetry overflow must not be recast as a cardiac unit, ICU or charge role; the headline stays "Registered Nurse" with at most a specialty the bullets show.',
  job: {
    title: 'Registered Nurse - Cardiac Telemetry',
    company: 'Lakeshore Heart Institute',
    url: 'https://example.com/jobs/rn-telemetry',
    description: `Lakeshore Heart Institute is hiring a Registered Nurse for our 28-bed cardiac telemetry unit.

What you'll do:
- Care for 4–5 cardiac patients a shift, interpreting telemetry and escalating rhythm changes
- Administer IV medications, including cardiac drips, and document in Epic
- Teach patients and families heart failure self-care before discharge
- Precept new nurses and take charge nurse shifts as needed

Requirements:
- Active RN license
- BLS and ACLS certification
- 1+ year of acute care experience

Preferred:
- PCCN certification
- Charge nurse experience`,
  },
  resumeText: nurseText,
  parsed: nurseParsed,
  failTerms: ['ACLS', 'PCCN'],
  resumeFailTerms: ['Charge Nurse'],
  warnTerms: ['cardiac'],
  mustKeepSkills: ['Epic', 'Telemetry monitoring', 'Patient education'],
  summaryTitle: 'Registered Nurse',
}
