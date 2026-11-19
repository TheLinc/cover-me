import type { PostingTitle } from '../../lib/resume-edit'
import { LightbulbIcon } from './icons'

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
