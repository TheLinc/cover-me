import type { PostingTitle } from '../../lib/resume-edit'
import { LightbulbIcon } from './icons'

// The summary uses the posting's title, or a shorter form of it, not the
// user's own (#218, #244, #253). Shown on the result and in the editor so it
// doesn't look like a mistake.
export default function PostingTitleTip({ title, shorter }: PostingTitle) {
  return (
    <p className="tip">
      <LightbulbIcon />
      <span>
        <strong>Optimized for recruiter search.</strong>{' '}
        {shorter
          ? <>Your summary uses {title}, a shorter form of this posting&apos;s title, so searches for it find you.</>
          : <>Your summary uses {title} from this posting&apos;s title, so searches for it find you.</>}
        {' '}Your job titles are unchanged.
      </span>
    </p>
  )
}
