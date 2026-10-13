// Runs searches so only the latest one's result is shown: schedule() waits
// for typing to pause, now() runs at once. Both abort the previous request
// at once (a stale response, or a load-more for an old query, is dropped).
export function createLatestSearch<Q, R>(
  fetcher: (q: Q, signal: AbortSignal) => Promise<R>,
  onResult: (q: Q, result: { ok: true; value: R } | { ok: false }) => void,
  delayMs = 300,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: AbortController | undefined

  function cancel() {
    clearTimeout(timer)
    current?.abort()
    current = undefined
  }

  function now(q: Q) {
    cancel()
    const controller = new AbortController()
    current = controller
    fetcher(q, controller.signal).then(
      (value) => { if (current === controller) onResult(q, { ok: true, value }) },
      () => { if (current === controller) onResult(q, { ok: false }) },
    )
  }

  return {
    schedule(q: Q) {
      cancel()
      timer = setTimeout(() => now(q), delayMs)
    },
    now,
    cancel,
  }
}
