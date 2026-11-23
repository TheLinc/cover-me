import { createRequire } from 'node:module'
import animate from 'tailwindcss-animate'
import { expect, test } from 'vitest'

test("Node's own require loads the Tailwind config with the animate plugin", () => {
  const nodeRequire = createRequire(import.meta.url)
  const config = nodeRequire('./tailwind.config.ts').default

  expect(config.plugins).toEqual([animate])
})
