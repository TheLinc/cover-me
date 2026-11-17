import type { PostingTitle } from '../../lib/resume-edit'
import { LightbulbIcon } from './icons'

// The summary uses the posting's title, or opens with a shorter form of it,
// not the user's own (#218, #244, #253). Shown on the result and in the editor
// so it doesn't look like a mistake.
export default function PostingTitleTip({ title, shorter }: PostingTitle) {
  return (
    <p className="tip">
      <LightbulbIcon />
      <span>
        <strong>Optimized for recruiter search.</strong>{' '}
        {shorter
          ? `Your summary opens with ${title}, a shorter form of this posting's title, so searches for ${title} find you.`
          : `Your summary uses ${title} from this posting's title, so searches for it find you.`}
        {' '}Your job titles are unchanged.
      </span>
    </p>
  )
}
