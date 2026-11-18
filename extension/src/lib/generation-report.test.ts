import { describe, expect, test } from 'vitest'
import { buildGenerationReport, type GenerationReport, type ReportEnv, type ReportForm, type ReportTarget } from './generation-report'
import type { ParsedResume, TailoredResume } from '../types'

// The user's details come from their parsed resume (report-resume.ts reads it),
// so each test names the person through `parsed`.
const job = {
  title: 'Platform Engineer',
  company: 'Northwind',
  description: 'Run our Kubernetes fleet.',
  url: 'https://www.linkedin.com/jobs/view/4012345678/?trk=abc',
}

const parsed: ParsedResume = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '(416) 555-0199',
  website: 'janedoe.dev',
  links: ['janedoe.dev', 'linkedin.com/in/janedoe'],
  location: 'Toronto, ON',
  experience: [{ title: 'SRE', company: 'Acme', location: 'Toronto, ON', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
  education: [],
  otherSections: [{ heading: 'Awards', lines: ['MLH Hackathon 2023 First Place'] }, { heading: 'Personal Details', lines: ['Date of Birth: 12/04/1995'] }],
  sectionOrder: ['experience', 'education', 'other'],
}

const env = (over: Partial<ReportEnv> = {}): ReportEnv => ({ mode: 'byok', provider: 'openai', version: '1.9.0', parsed, ...over })
const form: ReportForm = { category: 'generic', comment: 'Sounds like a template', sendSource: false, contact: false }
const invented: ReportForm = { ...form, category: 'invented', sendSource: true }

const tailored: TailoredResume = {
  name: 'Jane Doe', phone: '(416) 555-0199', email: 'jane.doe@example.com', website: 'janedoe.dev',
  links: ['janedoe.dev'], location: 'Toronto, ON',
  summary: 'Platform engineer.',
  experience: [{ title: 'SRE', company: 'Acme', location: 'Toronto, ON', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
  education: [],
  atsScore: 72,
  atsGaps: ['Terraform'],
}

const letter = (output: string, e: ReportEnv = env()) => buildGenerationReport({ kind: 'letter', output, job }, form, e).output as string
const resume = (output: TailoredResume, e: ReportEnv = env()) => buildGenerationReport({ kind: 'resume', output, job }, form, e).output as Record<string, unknown>
const source = (e: ReportEnv, target: ReportTarget = { kind: 'letter', output: 'Hi', job }) => buildGenerationReport(target, invented, e).sourceResume

// A persona's details: none may appear anywhere in what's sent.
const leaks = (report: GenerationReport, details: string[]) => {
  const sent = JSON.stringify({ output: report.output, sourceResume: report.sourceResume })
  return details.filter((d) => sent.toLowerCase().includes(d.toLowerCase()))
}

describe('buildGenerationReport', () => {
  test('a letter goes with its posting, site name only, mode, provider and version', () => {
    expect(buildGenerationReport({ kind: 'letter', output: 'Dear team,\n\nI ran 40 clusters.', job }, form, env())).toEqual({
      category: 'generic',
      comment: 'Sounds like a template',
      kind: 'letter',
      output: 'Dear team,\n\nI ran 40 clusters.',
      job: { title: 'Platform Engineer', company: 'Northwind', description: 'Run our Kubernetes fleet.', site: 'linkedin.com' },
      mode: 'byok',
      provider: 'openai',
      version: '1.9.0',
      contact: false,
    })
  })

  test('hosted reports say the provider is Claude; a pasted posting or one at an IP address has no site', () => {
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, form, env({ mode: 'hosted' }))).toMatchObject({ mode: 'hosted', provider: 'claude' })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: '' } }, form, env()).job.site).toBe('')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: 'http://10.0.0.1/jobs/1' } }, form, env()).job.site).toBe('')
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job: { ...job, url: 'https://careers_portal.example.com/1' } }, form, env()).job.site).toBe('')
  })

  test("a resume drops its contact fields, Word file hash, deleted sections and personal sections, and keeps its score and gaps", () => {
    const out = resume({
      ...tailored, sourceHash: 'abc123', deletedSections: [{ key: 'summary', index: 0, summary: 'x' }],
      otherSections: [{ heading: 'Contact', lines: ['jane.doe@example.com'] }, { heading: 'References', lines: ['Sam Lee, 555-0100'] }, { heading: 'Awards', lines: ['Dean’s List'] }],
    })
    expect(out).toEqual({
      summary: 'Platform engineer.',
      experience: [{ title: 'SRE', company: 'Acme', location: '[location]', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
      education: [],
      atsScore: 72,
      atsGaps: ['Terraform'],
      otherSections: [{ heading: 'Awards', lines: ['Dean’s List'] }],
    })
  })

  test("the original resume goes only for \"added things that aren't true\", ticked, as the parse without contact or personal details", () => {
    expect(source(env())).toEqual({
      experience: [{ title: 'SRE', company: 'Acme', location: '[location]', dates: '2019 - 2024', bullets: ['Ran 40 clusters'] }],
      education: [],
      otherSections: [{ heading: 'Awards', lines: ['MLH Hackathon 2023 First Place'] }],
      sectionOrder: ['experience', 'education', 'other'],
    })
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...invented, sendSource: false }, env()).sourceResume).toBeUndefined()
    expect(buildGenerationReport({ kind: 'letter', output: 'Hi', job }, { ...form, sendSource: true }, env()).sourceResume).toBeUndefined()
  })

  describe('names', () => {
    test('the full name, short forms, each part alone, any case or spacing', () => {
      expect(letter('JANE DOE here. Jane  Doe there. Jane\nDoe. Jane wrote it. Ms. Doe agreed.')).toBe('[name] here. [name] there. [name]. [name] wrote it. Ms. [name] agreed.')
      const dr = env({ parsed: { ...parsed, name: 'Dr. Jane A. Doe' } })
      expect(letter('I ship.\n\nSincerely,\nJane Doe', dr)).toBe('I ship.\n\nSincerely,\n[signature]')
      expect(letter('Jane Doe leads SRE.', dr)).toBe('[name] leads SRE.')
    })

    test('accents, particles, nicknames and an edited name in the reported resume', () => {
      expect(letter('José Núñez and Núñez.', env({ parsed: { ...parsed, name: 'José Núñez' } }))).toBe('[name] and [name].')
      expect(letter('Maria de la Cruz wrote.', env({ parsed: { ...parsed, name: 'Maria de la Cruz' } }))).toBe('[name] wrote.')
      expect(letter('Jon Smith and Jonathan.', env({ parsed: { ...parsed, name: 'Jonathan "Jon" Smith' } }))).toBe('[name] [name] and [name].')
      expect((resume({ ...tailored, name: 'Janet Doe', summary: 'Janet Doe ships.' })).summary).toBe('[name] ships.')
    })

    test('a common word that is also a first name stays in lower case', () => {
      expect(letter('Will Smith will help.', env({ parsed: { ...parsed, name: 'Will Smith' } }))).toBe('[name] will help.')
    })
  })

  describe('emails', () => {
    test('known, any address, obfuscated, and the account email', () => {
      expect(letter('Write to jane.doe@example.com or sam@acme.io.')).toBe('Write to [email] or [email].')
      expect(letter('jane [at] example [dot] com, jane(at)example.com, jane at example dot com, jane.doe AT gmail DOT com')).toBe('[email], [email], [email], [email]')
      expect(letter('Reach me via jdoe.work at gmail dot com.', env({ accountEmail: 'jdoe.work@gmail.com' }))).toBe('Reach me via [email].')
    })

    test("a name can't eat an email's first half and leave its domain", () => {
      expect(letter('Write to jane@janedoe.dev.')).toBe('Write to [email].')
    })
  })

  describe('links', () => {
    test('every web address, domain, profile path and @handle, the user’s or not', () => {
      expect(letter('See https://pixelforge.studio/work, janedoe.dev, pixelcat.github.io, kaggle.com/pixelcat, medium.com/@pixelcat, x.com/pixelcat, bit.ly/pixelcat and @pixelcat.'))
        .toBe('See [link], [link], [link], [link], [link], [link], [link] and [link].')
      expect(letter('Profiles: behance.net/jdoe, linktr.ee/pixelcat, orcid.org/0000-0002-1825-0097, scholar.google.com/citations?user=AbC123.'))
        .toBe('Profiles: [link], [link], [link], [link].')
      expect(letter('See “https://pixelforge.studio”.')).toBe('See “[link]”.')
    })

    test('a labelled handle without a domain', () => {
      expect(letter('GitHub: pixelcat · Twitter: @pixelcat · LinkedIn: in/pixelcat')).toBe('GitHub: [link] · Twitter: [link] · LinkedIn: [link]')
    })

    test('tech names shaped like domains, and file names, stay', () => {
      const text = 'Built with Socket.io, fast.ai, Node.js, Next.js, ASP.NET and Vue.js; see README.md and main.py.'
      expect(letter(text)).toBe(text)
    })
  })

  describe('phones', () => {
    test("any country's format, and the known phone written another way", () => {
      expect(letter('Call 07700 900123, +44 7700 900123, 020 7946 0958, 0412 345 678, (02) 9876 5432, 06 12 34 56 78, 030 12345678, 0049 30 1234567, 98765 43210.'))
        .toBe('Call [phone], [phone], [phone], [phone], [phone], [phone], [phone], [phone], [phone].')
      expect(letter('Text 416.555.0199 or 555-0199 or 4165550199.')).toBe('Text [phone] or [phone] or [phone].')
    })

    test('years, dates, money, IDs and big numbers stay', () => {
      const text = 'From 2019 - 2024 2025 (2018–2020), on 12/04/1995, cut $25,000 in Q3 2023, Employee ID 10234, 1500000000 units, ISBN 978-0-13-468599-1.'
      expect(letter(text)).toBe(text)
    })
  })

  describe('location and addresses', () => {
    test('the user’s city anywhere, with the postcode or region beside it; a year beside it stays', () => {
      expect(letter('I’m a Toronto-based analyst in Toronto, ON M5V 2T6, at Acme Toronto 2018 - 2020.')).toBe('I’m a [location]-based analyst in [location] [postal code], at Acme [location] 2018 - 2020.')
      expect(letter('Based in Sydney NSW 2000.', env({ parsed: { ...parsed, location: 'Sydney, NSW' } }))).toBe('Based in [location].')
      expect(letter('Calle Mayor 10, 28013 Madrid, Spain', env({ parsed: { ...parsed, location: 'Madrid, Spain' } }))).toBe('[address], [location]')
      expect(letter('Rohini, New Delhi - 110085', env({ parsed: { ...parsed, location: 'House No. 45, Sector 15, Rohini, New Delhi' } }))).toBe('[location], [location]')
    })

    test('street addresses and postcodes, whoever’s', () => {
      const s = (t: string) => letter(t, env({ parsed: { ...parsed, location: '' } }))
      expect(s('14 Rosebery Road, Bristol BS6 7NQ')).toBe('[address], Bristol [postal code]')
      expect(s('12 Oak Street, Austin, TX 78701')).toBe('[address], Austin, TX [postal code]')
      expect(s('123 MAIN STREET; 350 5th Avenue; 123 W 42nd St; 9 Elm Circle, Leeds; 2000 Pennsylvania Avenue')).toBe('[address]; [address]; [address]; [address], Leeds; [address]')
      expect(s('Hauptstraße 5, 12 rue de la Paix, Flat 402, House No. 45, Sector 15')).toBe('[address], [address], [address], [address], [address]')
    })

    test('ordinary text shaped like an address stays', () => {
      const text = 'MLH Hackathon 2023 First Place; Argued 15 Supreme Court cases; completed 12 Month End Close cycles; Led 2022 United Way Campaign; Clerk, 2019 Ontario Superior Court; course CS 101, EN 50128.'
      expect(letter(text, env({ parsed: { ...parsed, location: '' } }))).toBe(text)
    })
  })

  describe('letter blocks', () => {
    test('an address block above the greeting goes', () => {
      expect(letter('Jane Doe\n14 Elm Grove, Bristol\n07700 900123\n\nDear Hiring Manager,\n\nI ship.')).toBe('[contact details]\n\nDear Hiring Manager,\n\nI ship.')
    })

    test('the signature goes after any closing, the closing and the body stay', () => {
      for (const close of ['Sincerely,', 'Yours faithfully,', 'Warmest regards,', 'All the best,', 'With appreciation,', 'Many thanks,', 'Cordially,']) {
        expect(letter(`I ship.\n\n${close}\nJane Doe`)).toBe(`I ship.\n\n${close}\n[signature]`)
      }
      expect(letter('I ship.\n\nBest regards, Jane Doe')).toBe('I ship.\n\nBest regards, [signature]')
      expect(letter('I ship.\n\nSincerely,\n\nJane Doe\n\nP.S. My portfolio is pixelcat.design.')).toBe('I ship.\n\nSincerely,\n[signature]\n\nP.S. My portfolio is [link].')
      expect(letter('I ship.\n\nThank you for your time.')).toBe('I ship.\n\nThank you for your time.')
    })

    test('a stranger’s name in a sign-off is still taken, without a parse knowing it', () => {
      expect(letter('I ship.\n\nKind regards,\n\nPriya Raman\n\nP.S. Priya Raman built this.')).toBe('I ship.\n\nKind regards,\n[signature]\n\nP.S. [name] built this.')
    })
  })

  describe('review round 19', () => {
    test('the city comes out of any location format', () => {
      const at = (location: string, text: string) => letter(text, env({ parsed: { ...parsed, location } }))
      expect(at('Greater Toronto Area', "I'm based in Toronto, ON.")).toBe("I'm based in [location].")
      expect(at('San Francisco Bay Area', 'I live in San Francisco and Oakland.')).toBe('I live in [location] and Oakland.')
      expect(at('Toronto ON M5V 2T6', 'I live in Toronto, close to you.')).toBe('I live in [location], close to you.')
      expect(at('London / Remote', 'From London.')).toBe('From [location].')
      expect(at('Lagos Nigeria', 'Lagos-based.')).toBe('[location]-based.')
      expect(at('Pune - Maharashtra', 'In Pune.')).toBe('In [location].')
      expect(at('Rohini, New Delhi', 'Delhi - 110085')).toBe('[location]')
      // A country or province alone names no one.
      expect(at('Toronto, ON, Canada', 'Air Canada and Ontario Teachers in Toronto.')).toBe('Air Canada and Ontario Teachers in [location].')
    })

    test('personal sections in any language, and personal lines in any section, go; postcodes from more countries', () => {
      const sections = [
        { heading: 'Persönliche Daten', lines: ['Geburtsdatum: 01.01.1990'] },
        { heading: 'Bio Data', lines: ["Father's Name: Ramesh"] },
        { heading: 'Contacts', lines: ['12 Main Street, Dublin 2, D02 X285'] },
        { heading: 'Additional Information', lines: ['Address: 3 Elm Road, Leeds LS6 2AB', 'DNI: 12345678Z', 'Languages: Spanish, English'] },
        { heading: 'Personal Projects', lines: ['Built a chess engine'] },
        { heading: 'Datos personales', lines: ['Fecha de nacimiento: 1990'] },
      ]
      expect(source(env({ parsed: { ...parsed, otherSections: sections } }))?.otherSections)
        .toEqual([{ heading: 'Additional Information', lines: ['Languages: Spanish, English'] }, { heading: 'Personal Projects', lines: ['Built a chess engine'] }])
      const s = (t: string) => letter(t, env({ parsed: { ...parsed, location: '' } }))
      expect(s('3511 AX Utrecht; 00-590 Warszawa; D02 X285; 01310-100; 〒150-0002 東京都渋谷区渋谷2-21-1')).toBe('[postal code] Utrecht; [postal code] Warszawa; [postal code]; [postal code]; [postal code] [address]')
      expect(letter('111 51 Stockholm', env({ parsed: { ...parsed, location: 'Stockholm, Sweden' } }))).toBe('[location]')
    })

    test('ordinary text stays: European dates, money, Via, Unity3D, Asp.net, file names, skills labels', () => {
      const text = 'Analyst 03.2019 - 11.2021 and 05.2018 - 09.2020; budget $2 500 000 000; Via automated testing, 30 regressions were caught; Unity3D, Unit4 ERP, Adobe Creative Suite 6, Unit 8200; Asp.net Core, VB.net, Draw.io, libfoo.so, main.cc; Web: HTML; Medium: blog posts.'
      expect(letter(text, env({ parsed: { ...parsed, location: '' } }))).toBe(text)
    })

    test('the signature cut never takes body text', () => {
      const body = "What I'd bring:\n- Kubernetes at scale\n- On-call leadership\n\nI'd welcome a conversation about the role"
      expect(letter(`${body}\n\nSincerely,\nJane Doe`)).toBe(`${body}\n\nSincerely,\n[signature]`)
      expect(letter('Dear Hiring Manager,\n\nI ship.')).toBe('Dear Hiring Manager,\n\nI ship.')
      expect(letter('Dear team,\n\nIn short, I would love to talk.')).toBe('Dear team,\n\nIn short, I would love to talk.')
    })

    test('a greeting the header ends at, and a phone that can’t eat a ZIP across lines', () => {
      expect(letter('Jane Doe\n4821 Telegraph Ave, Apt 3\nOakland, CA 94609\n(415) 555-0132 · jane.doe@gmail.com\n\nTo the Hiring Team at Northwind,\n\nI ship.',
        env({ parsed: { ...parsed, phone: '(415) 555-0132' } })))
        .toBe('[contact details]\n\nTo the Hiring Team at Northwind,\n\nI ship.')
      expect(letter('Oakland, CA 94609\n(415) 555-0132', env({ parsed: { ...parsed, location: '', phone: '(415) 555-0132' } }))).toBe('Oakland, CA [postal code]\n[phone]')
    })

    test('walkthrough 6: a phone written with slashes, and a province named after the city', () => {
      expect(letter('Reach me on 0151 / 234 567 89.', env({ parsed: { ...parsed, phone: '+49 151 23456789' } }))).toBe('Reach me on [phone].')
      expect(letter('Call 030/1234567 or 0151/23456789.', env({ parsed: { ...parsed, phone: '' } }))).toBe('Call [phone] or [phone].')
      expect(letter('From Toronto, Ontario, Canada. Ontario Teachers is a client.')).toBe('From [location]. Ontario Teachers is a client.')
      expect(letter('Dates 12/04/1995 and 01/2019 stay.')).toBe('Dates 12/04/1995 and 01/2019 stay.')
    })

    test('a two-letter surname goes alone', () => {
      expect(letter('At Li & Fung, the Li family business.', env({ parsed: { ...parsed, name: 'Wei Li' } }))).toBe('At [name] & Fung, the [name] family business.')
    })
  })

  describe('review round 20', () => {
    const at = (p: Partial<ParsedResume>, text: string) => letter(text, env({ parsed: { ...parsed, ...p } }))

    test('a parse in capitals still finds the name and city as a letter writes them', () => {
      expect(at({ name: 'JANE DOE', location: 'TORONTO, ON' }, 'Jane moved to Toronto. Doe, J. (2021).')).toBe('[name] moved to [location]. [name], J. (2021).')
    })

    test('a city named like a region, or with "City"', () => {
      expect(at({ location: 'Washington, DC' }, 'I am based in Washington.')).toBe('I am based in [location].')
      expect(at({ location: 'Victoria, BC' }, 'Living in Victoria.')).toBe('Living in [location].')
      expect(at({ location: 'Singapore 018956' }, 'I relocated to Singapore.')).toBe('I relocated to [location].')
      expect(at({ location: 'Mexico City, Mexico' }, 'based in Mexico City')).toBe('based in [location]')
      expect(at({ location: 'Kansas City, MO 64105' }, 'I live in Kansas City.')).toBe('I live in [location].')
      expect(at({ location: 'New York, NY' }, 'New York City')).toBe('[location] City')
    })

    test('year ranges and metrics stay; extra-section lines keep their place and dates', () => {
      const text = 'Built 3 apps in 2019-2020; NPS from 32 to 61 (2022-2023); teams of 10-100; 2048 MB.'
      expect(at({ location: '' }, text)).toBe(text)
      const s = source(env({ parsed: { ...parsed, otherSections: [{ heading: 'Volunteering', lines: ["Dean's List 2019-2021", 'Volunteer Tutor, Toronto Public Library, Toronto, ON, 2019 – 2021'] }] } }))
      expect(s?.otherSections).toEqual([{ heading: 'Volunteering', lines: ["Dean's List 2019-2021", 'Volunteer Tutor, [location] Public Library, [location], 2019 – 2021'] }])
      expect(source(env())?.experience).toEqual([expect.objectContaining({ dates: '2019 - 2024' })])
      expect(source(env({ parsed: { ...parsed, experience: [{ ...parsed.experience[0], dates: '2019-2024' }] } }))?.experience).toEqual([expect.objectContaining({ dates: '2019-2024' })])
    })

    test('a location in brackets or lower case, and a city in another language', () => {
      expect(at({ location: 'Remote (Halifax, NS)' }, 'From Halifax.')).toBe('From [location].')
      expect(at({ location: 'calgary, alberta' }, 'From Calgary.')).toBe('From [location].')
      expect(at({ location: 'München, Deutschland' }, 'based in Munich and Munchen')).toBe('based in [location] and [location]')
      expect(at({ location: 'Bengaluru, Karnataka' }, 'I work from Bangalore.')).toBe('I work from [location].')
    })

    test('a handle written without @ or a colon, and hyphenated names', () => {
      expect(at({ links: ['github.com/janedoe', 'linkedin.com/in/jane-doe-1a2b'] }, 'GitHub - janedoe; LinkedIn | jane-doe-1a2b')).toBe('GitHub - [link]; LinkedIn | [link]')
      expect(at({ name: 'Mary-Jane Watson-Parker' }, 'Mary led it; Watson too. Parker as well.')).toBe('[name] led it; [name] too. [name] as well.')
    })

    test('more street and personal-line forms', () => {
      const s = (t: string) => at({ location: '' }, t)
      expect(s('456 King St. E., 77 Bloor St W, Bahnhofstr. 5, Hauptstr. 12a, Kerkstraat 12')).toBe('[address], [address], [address], [address], [address]')
      const sections = [{ heading: 'Persönliche Angaben', lines: ['Geboren: 1.1.1990 in Köln'] }, { heading: 'Sonstiges', lines: ['Geburtsort: Köln', 'Sprachen: Deutsch'] }]
      expect(source(env({ parsed: { ...parsed, otherSections: sections } }))?.otherSections).toEqual([{ heading: 'Sonstiges', lines: ['Sprachen: Deutsch'] }])
    })
  })

  describe('personas', () => {
    const persona = (p: Partial<ParsedResume>, details: string[], text: string) => {
      const e = env({ parsed: { ...parsed, ...p, experience: [{ title: 'Analyst', company: 'Northwind', location: p.location ?? '', dates: '2021 - Present', bullets: [text] }] } })
      const reports = [
        buildGenerationReport({ kind: 'letter', output: `Dear team,\n\n${text}\n\nBest regards,\n${p.name}`, job }, invented, e),
        buildGenerationReport({ kind: 'resume', output: { ...tailored, ...p, summary: text } as TailoredResume, job }, invented, e),
      ]
      return reports.flatMap((r) => leaks(r, details))
    }

    test('UK', () => {
      expect(persona({ name: 'Oliver Bennett', email: 'oliver.bennett@example.co.uk', phone: '+44 7700 900123', location: 'Bristol, UK', website: 'olliebuilds.co.uk', links: ['olliebuilds.co.uk'] },
        ['Oliver', 'Bennett', 'oliver.bennett', '7700 900123', 'olliebuilds', 'Bristol', 'Rosebery', 'BS6 7NQ'],
        'Oliver Bennett at 14 Rosebery Road, Bristol BS6 7NQ, 07700 900123, olliebuilds.co.uk, shipped Socket.io apps in Q3 2023.')).toEqual([])
    })

    test('Australia', () => {
      expect(persona({ name: 'Priya Raman', email: 'priya.raman@example.com.au', phone: '0412 345 678', location: 'Sydney, NSW' },
        ['Priya', 'Raman', 'priya.raman', '345 678', 'Sydney', 'Harbour', 'NSW 2000', 'github.com/praman'],
        'Priya Raman, Unit 5, 22 Harbour Street, Sydney NSW 2000, +61 412 345 678, github.com/praman, cut $25,000.')).toEqual([])
    })

    test('Spain', () => {
      expect(persona({ name: 'Lucía Fernández', email: 'lucia@example.es', phone: '+34 612 345 678', location: 'Madrid, Spain', website: 'luciadesigns.es' },
        ['Lucía', 'Fernández', 'lucia@', '612 345 678', 'Madrid', 'Calle Mayor', '28013', 'luciadesigns'],
        'Lucía Fernández, Calle Mayor 10, 28013 Madrid, 612 345 678, luciadesigns.es, built with Next.js.')).toEqual([])
    })

    test('Germany', () => {
      expect(persona({ name: 'Max Müller', email: 'max@example.de', phone: '+49 30 1234567', location: 'Berlin, Germany' },
        ['Max', 'Müller', 'max@', '1234567', 'Berlin', 'Hauptstraße', '10115'],
        'Max Müller, Hauptstraße 5, 10115 Berlin, 030 1234567, I live in Berlin.')).toEqual([])
    })

    test('India', () => {
      expect(persona({ name: 'Rahul Kumar Sharma', email: 'rks@proton.me', phone: '+91 98765 43210', location: 'Rohini, New Delhi' },
        ['Rahul', 'Sharma', 'rks', '98765', '43210', 'Rohini', 'Delhi', '110085'],
        'Rahul Kumar Sharma, House No. 45, Sector 15, Rohini, New Delhi - 110085, 98765 43210, rks [at] proton [dot] me.')).toEqual([])
    })

    test('North America', () => {
      expect(persona({ name: 'Jane Doe' }, ['Jane', 'Doe', 'jane.doe', '555-0199', '5550199', 'janedoe', 'Toronto', 'M5V', 'Maple'],
        'Jane Doe, 123 Maple Street, Toronto, ON M5V 2T6, 416-555-0199, janedoe.dev, linkedin.com/in/janedoe.')).toEqual([])
    })
  })

  test("ordinary text stays: employers, titles, skills, years, money", () => {
    const text = 'Senior Data Analyst at Contoso Retail and Fabrikam, 2018 - 2024: Python, SQL, Socket.io, Next.js, React, UI design; cut $25,000 in Q3 2023.'
    expect(letter(text)).toBe(text)
    expect(source(env({ parsed: { ...parsed, experience: [{ title: 'Senior Data Analyst', company: 'Contoso Retail', location: 'Austin, TX', dates: 'Jan 2021 - Present', bullets: [text] }] } }))?.experience)
      .toEqual([{ title: 'Senior Data Analyst', company: 'Contoso Retail', location: 'Austin, TX', dates: 'Jan 2021 - Present', bullets: [text] }])
  })
})
