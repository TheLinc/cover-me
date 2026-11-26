// Usage: node parser-299.mjs <web dir>. Prints the keywords the ATS checker reads from a made-up posting.
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
registerHooks({ resolve(s, c, n) { try { return n(s, c) } catch (e) { if (!s.startsWith('.')) throw e; return n(`${s}.ts`, c) } } })
const { readPosting } = await import(pathToFileURL(`${process.argv[2]}/lib/ats-checker/keywords.ts`).href)
const posting = `Account Executive at Northwind
Requirements
- 3+ years selling SaaS
- Salesforce and HubSpot
What we'll offer
Our compensation package plays a big part in how we recognize you.
- Mental health, wellness & fitness benefits
- Potential compensation is $102,855 to $136,000 OTE USD, plus RSUs.
To all recruitment agencies: Northwind does not accept agency resumes.`
for (const k of readPosting(posting).keywords) console.log(`${k.level.padEnd(9)} ${k.name}`)
