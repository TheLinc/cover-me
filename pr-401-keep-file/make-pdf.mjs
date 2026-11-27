// node make-pdf.mjs <out.pdf>: a made-up one-page resume with a clickable project link.
import { createRequire } from 'node:module'
const require = createRequire('F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/extension/package.json')
const { chromium } = require('playwright')

const html = `<!doctype html><html><body style="font-family: Arial; font-size: 11pt; margin: 40px">
<h1 style="margin:0">Robin Example</h1>
<p>robin@example.com | (555) 010-7788 | Halifax, NS</p>
<h2>Experience</h2>
<p><b>Software Engineer, Northwind Traders</b><br>2021 - Present</p>
<ul><li>Built an order tracking service in TypeScript that handles 2 million requests a day</li>
<li>Moved nightly batch jobs to an event queue and cut report delays from hours to minutes</li></ul>
<h2>Projects</h2>
<p><b><a href="https://github.com/robin-example/shelf">Shelf</a></b>: a reading list app with offline sync</p>
<h2>Education</h2>
<p>BSc Computer Science, Dalhousie University, 2021</p>
<h2>Skills</h2>
<p>TypeScript, Node.js, PostgreSQL, Kafka, Docker</p>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html)
await page.pdf({ path: process.argv[2], format: 'Letter' })
await browser.close()
