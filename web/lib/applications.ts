// Pro history from the applications Edge Function (the same data the
// extension's History shows). Server-side only: called with the user's token.
export interface Application {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  coverLetters: { id: string; letter: string; createdAt: string }[]
  tailoredResumes: { id: string; resume: { atsScore?: number; atsGaps?: string[] }; createdAt: string }[]
}

// null on any failure (not Pro, paused project, network): the dashboard
// renders without the section.
export async function fetchApplications(supabaseUrl: string, accessToken: string): Promise<Application[] | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/applications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { applications?: Application[] }
    return Array.isArray(data.applications) ? data.applications : null
  } catch {
    return null
  }
}

export function summarizeApplication(app: Application): { letters: number; resumes: number; bestScore: number | null; gaps: string[] } {
  let best: Application['tailoredResumes'][number] | null = null
  for (const tr of app.tailoredResumes) {
    if (typeof tr.resume.atsScore === 'number' && (best === null || tr.resume.atsScore > (best.resume.atsScore ?? -1))) best = tr
  }
  return {
    letters: app.coverLetters.length,
    resumes: app.tailoredResumes.length,
    bestScore: best?.resume.atsScore ?? null,
    gaps: best?.resume.atsGaps ?? [],
  }
}
