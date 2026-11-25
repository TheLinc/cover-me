export interface Notice {
  id: string
  label: string
  text: string
  href: string
  until: string
}

type NoticeStore = Pick<Storage, 'getItem' | 'setItem'>

export const NOTICES: Notice[] = []

const closedKey = (id: string) => `cover-me:notice-closed:${id}`

export function openNotice(notices: Notice[], now: Date, store: NoticeStore): Notice | null {
  return notices.findLast((n) => now < new Date(n.until) && !store.getItem(closedKey(n.id))) ?? null
}

export function closeNotice(id: string, store: NoticeStore) {
  store.setItem(closedKey(id), '1')
}
