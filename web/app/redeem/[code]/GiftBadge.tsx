import { GiftIcon } from '@phosphor-icons/react/dist/ssr'

export function GiftBadge() {
  return (
    <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand-strong shadow-[inset_0_0_0_1px_#DCDCFE]">
      <GiftIcon size={30} weight="duotone" aria-hidden />
    </span>
  )
}
