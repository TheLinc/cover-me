import { scrapeJobPage } from 'F:/worktrees/cover-me/feat-346-generate-job-c-52a42573a8488441/extension/src/content/scrapers/index.ts'
import { postingLogo } from 'F:/worktrees/cover-me/feat-346-generate-job-c-52a42573a8488441/extension/src/content/logo.ts'
export function read() {
  try {
    const job = scrapeJobPage()
    return { title: job.title, company: job.company, url: location.href, logo: postingLogo(job.company) }
  } catch (e) {
    return { error: String(e), url: location.href }
  }
}
