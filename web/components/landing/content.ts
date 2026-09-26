// Landing page copy, moved verbatim from app/page.tsx.

export const STEPS = [
  {
    n: "01",
    title: "Install and configure in 60 seconds",
    body: "Add the extension from the Chrome Web Store. Upload your resume — PDF or DOCX, text is extracted locally on your device and never stored raw. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 5 free hosted letters per day. No credit card required.",
  },
  {
    n: "02",
    title: "Navigate to any job posting",
    body: "Open a job on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby. Cover Me reads the page automatically. If the scraper doesn't catch it, paste the description manually — it takes five seconds and works on any page.",
  },
  {
    n: "03",
    title: "Generate, edit, and apply",
    body: "Click Generate Cover Letter for an ATS-optimized letter, or Tailor Resume to Job to have AI rewrite your resume bullets to match the role's keywords — then see your ATS match score and the exact gaps the role demands. Edit the result directly inside the extension with no round-trips to a text editor, copy to clipboard, or download either document as a formatted PDF instantly.",
  },
];

export const FEATURES: {
  title: string;
  body: string;
}[] = [
  {
    title: "Bring Your Own Key",
    body: "Use your own Claude or OpenAI API key for unlimited, free generation. No account, no subscription — your key, your cost, your terms.",
  },
  {
    title: "Local & encrypted by default",
    body: "In BYOK mode your resume is AES-GCM encrypted on-device. Cloud storage is opt-in only when you create a hosted account.",
  },
  {
    title: "Fully open source",
    body: "MIT licensed. Read every line of the extension and backend. Self-host with your own Supabase and Stripe — zero lock-in.",
  },
  {
    title: "Edit before you send",
    body: "Every letter is fully editable directly inside the extension — no round-trips to a text editor. Adjust tone, length, or specific details in-place before copying or exporting.",
  },
  {
    title: "Full letter history",
    body: "Every generated letter is saved locally. Review, copy, or regenerate any previous letter — even weeks after it was created.",
  },
  {
    title: "Supplemental context",
    body: "Add a note about what you want to emphasize — a recent promotion, a side project, a specific achievement. Cover Me weaves it into the letter alongside your resume and the job requirements.",
  },
  {
    title: "AI resume tailoring",
    body: "Cover Me rewrites your resume bullets to match the ATS keywords and requirements of the specific role — without inventing skills or changing your job history. Your experience, optimized for each application.",
  },
  {
    title: "Compact to one page",
    body: "Some roles require a single-page resume. Enable compact mode and Cover Me trims your tailored resume to one page automatically — keeping the most relevant content for that role.",
  },
  {
    title: "Keywords from the posting, built in",
    body: "Cover Me reads the job description to find the exact skills, tools, and terms the role demands, then weaves them into both your cover letter and your rewritten resume bullets — so you surface in ATS filters for every application.",
  },
];

export const FREE_FEATURES = [
  "5 AI generations/day — cover letters + resumes",
  "BYOK — your key, unlimited & free",
  "All major job boards",
  "Edit & export to PDF",
  "Local cover letter history",
];

export const PRO_FEATURES = [
  "Unlimited cover letters and resume tailoring",
  "All major job boards",
  "Edit & export to PDF",
  "Cover letter history synced cross-device",
  "Priority access to new features",
];

export type CellVal = string | boolean;

export const COMPARE_COLS = ["Cover Me", "AI Chatbots", "AI Writing Tools"] as const;

export const COMPARE_ROWS: { feature: string; vals: CellVal[] }[] = [
  { feature: "Price",                           vals: ["Free / $8/mo", "Free / $20/mo", "$39–$49/mo"] },
  { feature: "Auto-reads job posting",          vals: [true, false, false] },
  { feature: "Cover letter generation",         vals: [true, true, true] },
  { feature: "AI resume tailoring to role",     vals: [true, false, false] },
  { feature: "ATS match score & gap analysis",  vals: [true, false, false] },
  { feature: "Works inside your browser",       vals: [true, false, false] },
  { feature: "On-device privacy / BYOK mode",   vals: [true, false, false] },
  { feature: "Open source & auditable",         vals: [true, false, false] },
];

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
    a: "Yes. In BYOK mode, your resume lives entirely on your device — nothing is ever sent to Cover Me servers. In hosted mode, your resume is encrypted with AES-256-GCM before being stored. Cover Me has no ads, no telemetry, and does not use your resume for AI training.",
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
