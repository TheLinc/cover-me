export function delayedRuns(delayMs: number, onDone: (key: string, error?: string) => void) {
  const waiting = new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> }>()
  let queue = Promise.resolve()

  const fire = (key: string) => {
    const entry = waiting.get(key)
    if (!entry) return
    clearTimeout(entry.timer)
    waiting.delete(key)
    queue = queue.then(entry.run).then(
      () => onDone(key),
      (err: unknown) => onDone(key, err instanceof Error ? err.message : String(err)),
    )
  }

  return {
    schedule(key: string, run: () => Promise<void>) {
      waiting.set(key, { run, timer: setTimeout(() => fire(key), delayMs) })
    },
    cancel(key: string) {
      clearTimeout(waiting.get(key)?.timer)
      waiting.delete(key)
    },
    flush() {
      for (const key of [...waiting.keys()]) fire(key)
    },
  }
}
