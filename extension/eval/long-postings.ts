// Long postings. Real postings run 4,500 to 12,000 characters (the scraper
// fixtures), and the prompts now read 15,000 of them. Every other eval case
// is under 1,000, so these two re-run a base case with its posting grown to a
// realistic length: company background first, the original posting in the
// middle, and after the old 4,000-character cut a "nice to have" list the
// candidate lacks (added to failTerms) plus company figures a letter must not
// claim as the candidate's. They test what the longer cap exposes: more
// requirements the candidate lacks, more numbers to borrow.

import type { EvalCase } from './fixtures'

interface Extension {
  base: string
  before: string
  after: string
  failTerms: string[]
  warnTerms?: string[]
}

const EXTENSIONS: Extension[] = [
  {
    base: 'new-grad-data-analyst',
    before: `About Beacon Retail Group

Beacon Retail Group operates 214 home and garden stores across 11 states, along with a growing e-commerce business that now accounts for nearly a fifth of sales. Founded in 1987 as a single garden center in Columbus, Ohio, we have grown by staying close to the communities we serve: most of our store managers started on the sales floor, and our merchandising teams spend time in stores every quarter. Our 9,800 team members share one goal, which is to help customers finish the project they started, whether that is a balcony herb garden or a full backyard renovation.

Our analytics team sits inside the merchandising organization. We are a group of fourteen analysts, data engineers and a data scientist who support buying, pricing, inventory planning and store operations. The work is practical: a buyer wants to know whether a new line of planters is cannibalizing an existing one, a regional director wants to understand why one district's weekend traffic dropped, or the pricing team wants to read the results of a markdown test before the season ends. We value analysts who ask good questions before writing queries, who check their numbers twice, and who can explain a result to someone who has never opened a spreadsheet.

The role

`,
    after: `

What a typical week looks like
- Monday: refresh the weekly category performance pack and flag anything unusual to the category managers before their Tuesday review.
- Midweek: work through two or three ad hoc requests from buyers and planners, usually a SQL pull, a short analysis and a written summary of a page or less.
- Thursday: pair with a senior analyst on the current pricing or promotion test, from checking the test design to reading the results.
- Friday: document what you learned, update the team's query library, and plan the next week with your manager.

You will report to the Senior Manager, Merchandising Analytics, and work most closely with the home decor and outdoor living category teams. In your first ninety days you will learn our data model, take ownership of two recurring reports, and complete one end-to-end analysis that goes to a category director.

Who you will work with
Category managers decide what we sell and at what price. Inventory planners decide how much of it goes to which store and when. Store operations leaders want to know what is working on the floor and what is not. Each group asks different questions and works at a different pace: a buyer preparing for a vendor meeting needs an answer by tomorrow, while the planning team works on a seasonal calendar months ahead. Part of this role is learning which questions are urgent, which are important, and which can wait for the next weekly pack, and telling your partners honestly when an answer will take longer than they hoped.

How we work
We keep our analysis close to the business. Every recurring report has an owner, a short written description of what it measures, and a list of the decisions it supports. When a number looks wrong, we would rather pause a report for a day than send something we cannot explain. Analysts review each other's queries before anything goes to a director, and we hold a short show-and-tell every other Friday where someone walks the team through a recent analysis, including what did not work. New analysts are paired with a senior analyst for their first six months, and we budget time every week for learning, whether that is a statistics refresher, a course on experiment design, or reading through another team's models.

Growth
Junior analysts who do well here typically move to Analyst within eighteen to twenty-four months, and from there into a senior analyst, data science or category management track depending on their interests. Several of our current category managers started on the analytics team. We will support you with a learning budget of $1,000 a year, time to attend one regional conference, and regular career conversations with your manager that are separate from performance reviews.

Nice to have
- Experience with Looker or Power BI in addition to Tableau
- Familiarity with dbt models and a cloud warehouse such as Snowflake
- Exposure to retail planning concepts: sell-through, weeks of supply, open-to-buy
- Experience with Google Analytics 4 or other web analytics tools

Pay and benefits
The pay range for this role is $58,000 to $68,000 a year, depending on experience. Beacon offers medical, dental and vision coverage from your first month, a 401(k) with a 4% company match, 15 days of paid time off plus 9 holidays, a 20% team member discount, and tuition assistance of up to $5,250 a year. This is a hybrid role based at our Columbus support center, with three days a week in the office.

Our commitment
Beacon Retail Group is an equal opportunity employer. We welcome applicants of every background and do not discriminate on the basis of race, color, religion, sex, sexual orientation, gender identity, national origin, age, disability, veteran status, or any other protected characteristic. If you need an accommodation at any stage of the hiring process, contact our talent team and we will work with you.

How to apply
Submit your resume and a short cover letter. Applications are reviewed on a rolling basis, and we aim to reply to every applicant within two weeks. Our process is a 30-minute recruiter call, a take-home SQL exercise of about two hours, and a final round with the analytics team and one category manager.`,
    failTerms: ['Looker', 'Power BI', 'dbt', 'Snowflake', 'Google Analytics'],
    warnTerms: ['214', '9,800', 'sell-through'],
  },
  {
    base: 'nurse-missing-certs',
    before: `About Cascade Health

Cascade Health is a 412-bed nonprofit teaching hospital and Level II trauma center serving the greater Spokane region. We have held Magnet recognition for nursing excellence since 2014, and our nurses lead shared governance councils on every unit. Each year we care for more than 28,000 inpatients and 96,000 emergency visits, and our residency program welcomes about 120 new graduate nurses.

The intensive care unit is a mixed medical-surgical ICU staffed at a 1:2 nurse-to-patient ratio, with 24-hour intensivist coverage, a dedicated pharmacist on day shift, and respiratory therapists in the unit around the clock. Night shift runs from 7 p.m. to 7:30 a.m. with self-scheduling in six-week blocks. Our nurses have a strong voice in how the unit runs: the night shift council recently redesigned the handoff process and cut handoff time by a third.

The opportunity

Nurses on our ICU care for patients after major surgery, patients with sepsis and respiratory failure, and trauma patients who need close monitoring in the first days after injury. The work is fast and the patients are sick, but the unit is known across the hospital for its teamwork: charge nurses carry a reduced assignment so they can support the floor, and every night shift has a resource nurse who helps with admissions, transfers and emergencies. Our rapid response and code teams are led by ICU nurses, and we run monthly mock codes so that every nurse practices the skills they use least often.

We invest in the nurses who join us. New ICU nurses complete a structured orientation that combines classroom sessions on hemodynamics, ventilator management and vasoactive medications with supervised shifts alongside an experienced preceptor. Progress is reviewed every two weeks, and orientation is extended for anyone who needs more time; we would rather take an extra month than rush a nurse into a full assignment before they are ready. After orientation, nurses join a peer group that meets monthly to review difficult cases and share what they have learned.

Our nursing culture is built on shared governance. Staff nurses sit on the unit practice council, the hospital-wide quality council and the professional development council, and their recommendations shape policy. In the last two years, unit nurses have led projects that reduced central line infections, improved early mobility for ventilated patients, and introduced a family presence policy during rounds. We expect every nurse to bring ideas, and we give protected time to pursue them.

`,
    after: `

What we offer
- A 12-week ICU orientation with a dedicated preceptor, followed by a six-month fellowship with monthly case reviews and simulation days.
- Clinical ladder advancement with a pay increase at each level, and full reimbursement for one specialty certification exam a year.
- Night shift differential of $6.50 an hour and weekend differential of $3.00 an hour.
- Medical, dental and vision coverage, a 403(b) with up to 6% employer contribution, and tuition support for BSN-to-MSN programs.

Schedule and pay
This is a full-time position, three 12-hour night shifts a week, with every third weekend. The base pay range is $41.20 to $58.75 an hour depending on experience, plus differentials. A sign-on bonus is available for nurses with at least two years of acute care experience.

A typical night
Shift starts with a bedside handoff using our unit's structured report, followed by a safety huddle where the charge nurse reviews staffing, expected admissions and any patients at risk of deterioration. Most nurses spend the first hours on assessments, medication passes and family updates, then settle into the steady work of monitoring, titrating infusions and documenting. Early morning brings labs, chest films and preparation for day-shift rounds, where night nurses present overnight events to the intensivist.

Preferred qualifications
- TNCC or a comparable trauma nursing course
- Experience with CRRT or other continuous renal replacement therapy
- PALS certification, for occasional pediatric overflow
- NIHSS certification for stroke assessment

Cascade Health is an equal opportunity employer and a drug-free workplace. We are committed to building a workforce that reflects the communities we serve, and we encourage applications from people of every background. Applicants who need an accommodation during the application or interview process can contact our recruitment office.

To apply, submit your resume and a brief letter describing your clinical background. Our nurse recruiters review applications every week, and shortlisted candidates are invited to shadow on the unit for four hours before the panel interview.`,
    failTerms: ['TNCC', 'CRRT', 'PALS', 'NIHSS'],
    warnTerms: ['412', 'Magnet', 'trauma'],
  },
]

export function longPostingCases(base: EvalCase[]): EvalCase[] {
  return EXTENSIONS.map((x) => {
    const c = base.find((b) => b.id === x.base)
    if (!c) throw new Error(`long-postings.ts: no base case "${x.base}"`)
    const description = x.before + c.job.description + x.after
    return {
      ...c,
      id: `long-${c.id}`,
      job: { ...c.job, description },
      failTerms: [...c.failTerms, ...x.failTerms],
      warnTerms: [...c.warnTerms, ...(x.warnTerms ?? [])],
    }
  })
}
