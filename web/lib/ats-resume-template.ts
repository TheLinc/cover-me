import type { TailoredResume } from './pdf/types'

export const ATS_RESUME_TEMPLATE: TailoredResume = {
  name: 'Your Name',
  location: 'City, State',
  phone: '(555) 555-0100',
  email: 'your.name@example.com',
  website: '',
  links: ['linkedin.com/in/your-name'],
  summary: "Two or three sentences about you: your field, your years of experience and the results you're best at. Use the job posting's words where they're true for you.",
  experience: [
    {
      title: 'Job Title',
      company: 'Company Name',
      location: 'City, State',
      dates: 'Mon YYYY - Present',
      bullets: [
        'Start with a verb and end with the result, such as: Grew sign-ups 40% in 12 months by rebuilding the email program.',
        'Name the skills and tools from the job posting that you used in this job.',
        'Keep three to five bullets for your current job, most important first.',
      ],
    },
    {
      title: 'Previous Job Title',
      company: 'Company Name',
      location: 'City, State',
      dates: 'Mon YYYY - Mon YYYY',
      bullets: [
        'Put a number on the result where you can: money, time, people or a percentage.',
        "Cut any bullet that doesn't help with the job you're applying for.",
      ],
    },
  ],
  education: [{ institution: 'School Name', degree: 'Degree', location: 'City, State', dates: 'YYYY - YYYY', bullets: [] }],
  skills: 'Skill from the posting, Another skill, Software you use, Certification',
}
