// Content scripts run in pages Cover Me doesn't control, so of their messages
// only the answer box's rewrite is accepted (#355)
export function acceptsMessage(type: unknown, sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false
  return type === 'ANSWER_REWRITE' || !!sender.url?.startsWith(chrome.runtime.getURL(''))
}
