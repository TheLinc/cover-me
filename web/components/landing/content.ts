// Landing FAQ copy. The same items feed the FAQPage JSON-LD.

export const FAQ_ITEMS = [
  {
    q: "Is Cover Me free to use?",
    a: "Yes. With your own Claude or OpenAI API key, Cover Me is free and unlimited, and you pay the provider for what you use. No account is needed. The hosted free plan gives you 10 AI generations to start, then 5 a week, with cover letters and resume tailoring counted together. Pro is $15 a month or $35 every 3 months for up to 25 generations a day, with every application saved and searchable on your dashboard. On the free plan and with your own key, the extension keeps your last 50 letters and 20 tailored resumes.",
  },
  {
    q: "Can Cover Me tailor my resume too?",
    a: "Yes. Click \"Tailor Resume to Job\" on any posting and Cover Me rewrites your resume bullets, summary and skills around that role's keywords, scores the match, and lists the keywords you're missing. A check removes any skill or claim your original resume doesn't support, and your job titles, employers and dates stay as they are. Download the result as a PDF, or turn on \"Compact to one page\" for a single-page resume.",
  },
  {
    q: "What is the ATS match score?",
    a: "It's a score from 0 to 100 for how well your tailored resume covers a specific posting's keywords. The AI reports which of the posting's keywords your resume covers, and Cover Me calculates the score in code: must-have keywords are worth 70 points, nice-to-have keywords 30, and each unmet hard requirement takes off 10, up to 25. The same keyword coverage always gives the same score, and you see every matched and missing keyword.",
  },
  {
    q: "What job boards does Cover Me support?",
    a: "Cover Me reads the job description when you click, on LinkedIn, Indeed, Greenhouse, Lever, Workday and Ashby, including postings that company career pages embed from those systems. On any other site, paste the job description into Cover Me.",
  },
  {
    q: "How is Cover Me different from using ChatGPT or Claude directly?",
    a: "Cover Me is built only for job applications. It reads the posting when you click, so there's nothing to copy or paste, and it keeps your resume saved so you don't upload it for every job. It writes the cover letter and tailors your resume to the same posting, scores the match in code, and removes skills your resume doesn't support. A general chatbot can do parts of this, but you paste the posting and resume each time and check every line for added skills yourself.",
  },
  {
    q: "Is my resume data private?",
    a: "Yes. With your own API key, your resume and key never reach Cover Me's servers. Your resume goes only to the AI provider whose key you use. Since version 1.3.0, once you agree, the only thing sent to Cover Me is the job page you click on, so the posting can be read, and no copy of the page is kept. On hosted plans, your resume is encrypted with AES-256-GCM before it's stored, and sent to Anthropic only to read it and write your documents. The extension has no ads, analytics or telemetry, and your resume is never used to train AI models.",
  },
  {
    q: "Do I need an account to use Cover Me?",
    a: "No. With your own API key, install the extension, add your resume and key, and start generating. You only need an account for the hosted free plan or Pro.",
  },
];

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};
