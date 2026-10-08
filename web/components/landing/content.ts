// Landing FAQ copy. The same items feed the FAQPage JSON-LD.

export const FAQ_ITEMS = [
  {
    q: "Is Cover Me free to use?",
    a: "Yes. Cover Me is free forever. In BYOK mode you use your own Claude or OpenAI API key — unlimited cover letters and resume tailoring at your own API cost, with no account required. The hosted free tier gives you 5 AI generations per day — cover letters and resume tailoring combined. Pro ($8/month) removes the daily limit and adds cross-device history sync.",
  },
  {
    q: "Can Cover Me tailor my resume too?",
    a: "Yes — click \"Tailor Resume to Job\" on any posting and Cover Me rewrites your resume bullets to match that role's ATS keywords, scores your match percentage, and surfaces the exact skill gaps. It never invents skills or changes your job history. Download the result as a formatted PDF instantly, or enable \"Compact to one page\" if the role requires a single-page resume.",
  },
  {
    q: "What is the ATS match score?",
    a: "The ATS match score is a percentage showing how well your tailored resume matches a specific job's requirements — for example, 78%. After tailoring, Cover Me breaks down exactly which keywords and skills you already match versus which are gaps, so you know where you stand before applying and can re-tailor with a stronger version if needed.",
  },
  {
    q: "What job boards does Cover Me support?",
    a: "Cover Me auto-scrapes job descriptions on LinkedIn, Indeed, Greenhouse, Lever, Workday, and Ashby. For any other job board or ATS, you can paste the job description manually — it works on any page in seconds.",
  },
  {
    q: "How is Cover Me different from using ChatGPT or Claude directly?",
    a: "Cover Me is purpose-built for job applications — it does things a general AI chatbot can't. It reads the job posting automatically, generates a tailored cover letter, and rewrites your resume bullets to match the role's ATS keywords, all without you copying or pasting anything. It also scores your resume against the role and surfaces the exact gaps. One click, done in seconds.",
  },
  {
    q: "Is my resume data private?",
    a: "Yes. In BYOK mode, your resume lives entirely on your device — nothing is ever sent to Cover Me servers. In hosted mode, your resume is encrypted with AES-256-GCM before being stored. The extension has no ads, analytics, or telemetry, and Cover Me never uses your resume for AI training.",
  },
  {
    q: "Do I need an account to use Cover Me?",
    a: "No account is needed for BYOK mode — install the extension, add your resume and API key, and start generating immediately. You only need an account for the hosted free tier (5 letters/day) or Pro ($8/month).",
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
