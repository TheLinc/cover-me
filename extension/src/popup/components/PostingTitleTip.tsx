import { LightbulbIcon } from './icons'

// The summary uses the posting's title, not the user's own (#218, #244).
// Shown on the result and in the editor so it doesn't look like a mistake.
export default function PostingTitleTip({ title }: { title: string }) {
  return (
    <p className="tip">
      <LightbulbIcon />
      <span><strong>Optimized for recruiter search.</strong> Your summary uses this posting&apos;s title, {title}, so searches for it find you. Your job titles are unchanged.</span>
    </p>
  )
}
