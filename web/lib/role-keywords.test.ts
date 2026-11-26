import { describe, expect, test } from 'vitest'
import { countKeywords, greenhouseText, kindOf, leverText, roleOf, skipFor } from './role-keywords'

describe('roleOf', () => {
  test.each([
    ['Account Executive, Mid-Market', 'sales'],
    ['Sales Development Representative', 'sales'],
    ['Senior Product Marketing Manager', 'marketing'],
    ['Software Engineer, Backend', 'engineering'],
    ['Mechanical Engineer II (Starship)', 'engineering'],
    ['Senior Software Engineer, Fulfillment', 'engineering'],
    ['Industrial Engineer, Warehouse & Manufacturing', 'engineering'],
    ['Software Engineer, Data Warehouse Analytics', 'engineering'],
    ['Warehouse Associate - 2nd Shift', 'warehouse'],
    ['Forklift Operator', 'warehouse'],
    ['Fulfillment Associate - Torrance, CA', 'warehouse'],
    ['Executive Assistant, Marketing', 'administrative-assistant'],
    ['Senior Administrative Assistant', 'administrative-assistant'],
    ['Office Manager', 'administrative-assistant'],
  ])('%s is %s', (title, role) => {
    expect(roleOf(title)).toBe(role)
  })

  test.each([
    'Sales Engineer',
    'Engineering Manager, Payments',
    'Senior Product Manager, Fulfillment',
    'Marketing Data Scientist',
    'Seasonal Retail Sales Associate, Sunnyvale',
    'Recruiter, Sales',
    'Director of Warehouse Operations',
    'Senior Solutions Architect (EDW Enterprise Data Warehouse Migrations)',
    'Warehouse GM',
    'Warehouse Lead - Live Sales Host, Recommerce',
    'Presales Engineer',
    'Sales Compensation Manager',
  ])('%s fits no role', (title) => {
    expect(roleOf(title)).toBeUndefined()
  })
})

describe('greenhouseText and leverText', () => {
  test('reads Greenhouse content, which arrives entity-encoded', () => {
    const content = '&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;3+ years of &lt;strong&gt;B2B&lt;/strong&gt; sales&lt;/li&gt;&lt;li&gt;Salesforce &amp;amp; HubSpot&lt;/li&gt;&lt;/ul&gt;&lt;p&gt;We&amp;#39;re hiring&amp;nbsp;now&lt;/p&gt;'
    expect(greenhouseText(content)).toBe("## Requirements\n- 3+ years of B2B sales\n- Salesforce & HubSpot\nWe're hiring now")
  })

  test('starts a new line at an opening block tag, marks HTML headings, and keeps an entity it cannot decode', () => {
    expect(greenhouseText('&lt;div&gt;Intro&lt;h2&gt;&lt;strong&gt;Logistics&lt;/strong&gt;&lt;/h2&gt;&lt;p&gt;Bad &amp;#99999999; char&lt;/p&gt;&lt;/div&gt;')).toBe('Intro\n## Logistics\nBad &#99999999; char')
  })

  test('drops an empty heading, which would end the section above it', () => {
    expect(greenhouseText('&lt;h2&gt;Benefits&lt;/h2&gt;&lt;p&gt;Pay&lt;/p&gt;&lt;h2&gt;&lt;/h2&gt;&lt;p&gt;Dental&lt;/p&gt;')).toBe('## Benefits\nPay\nDental')
  })

  test('treats line breaks in the HTML source as spaces, as a browser does', () => {
    expect(greenhouseText('&lt;ul&gt;\n&lt;li&gt;\n&lt;p&gt;Mental health\nbenefits&lt;/p&gt;\n&lt;/li&gt;&lt;/ul&gt;')).toBe('- Mental health benefits')
  })

  test('reads a Lever posting with each list under its heading', () => {
    const posting = {
      description: '<div>Join our team.</div>',
      lists: [
        { text: 'What you&#39;ll bring', content: '<li>Forklift certification</li><li>Lift 50 lbs</li>' },
        { text: 'Nice-to-haves', content: '<li>WMS experience</li>' },
      ],
      additional: '<div>Benefits include PTO.</div>',
    }
    expect(leverText(posting)).toBe("Join our team.\nWhat you'll bring\n- Forklift certification\n- Lift 50 lbs\nNice-to-haves\n- WMS experience\nBenefits include PTO.")
  })
})

describe('countKeywords', () => {
  const postings = [
    ...Array.from({ length: 12 }, (_, i) => ({ company: 'a', source: 'Greenhouse' as const, text: `Requirements\n- Salesforce\nRef ${i}` })),
    { company: 'b', source: 'Greenhouse' as const, text: 'Requirements\n- Salesforce\n- HubSpot' },
    { company: 'b', source: 'Greenhouse' as const, text: 'Requirements\n- Salesforce\n- HubSpot' },
    { company: 'c', source: 'Lever' as const, text: 'Requirements\n- HubSpot\n- Salesforce' },
    { company: 'd', source: 'Lever' as const, text: 'Requirements\n- HubSpot\n- Zendesk' },
    { company: 'e', source: 'Lever' as const, text: "About us\nWe build Salesforce and HubSpot apps.\nWhat you'll do\n- Answer calls" },
  ]
  const counts = countKeywords(postings)

  test('reads at most 10 postings per company, and a repeated posting once', () => {
    expect(counts).toMatchObject({ postings: 14, companies: 5, sources: { Greenhouse: 11, Lever: 3 } })
  })

  test('counts postings that ask for a keyword, where 3 or more companies do', () => {
    expect(counts.keywords).toEqual([
      { name: 'Salesforce', postings: 12 },
      { name: 'HubSpot', postings: 3 },
    ])
  })

  test('leaves out the keywords a role skips', () => {
    expect(countKeywords(postings, ['Salesforce']).keywords).toEqual([{ name: 'HubSpot', postings: 3 }])
  })
})

describe('skipped keywords', () => {
  test.each([
    ['sales', 'sales'],
    ['marketing', 'marketing'],
    ['warehouse', 'warehouse'],
    ['sales', 'SDR'],
    ['marketing', 'PMM'],
  ] as const)("%s doesn't list its own name", (slug, name) => {
    expect(skipFor(slug)).toContain(name)
  })
})

describe('kindOf', () => {
  test.each([
    ['Salesforce', 'Tools and software'],
    ['Python', 'Tools and software'],
    ["Bachelor's degree", 'Education and certifications'],
    ['MBA', 'Education and certifications'],
    ['communication', 'Soft skills'],
    ['attention to detail', 'Soft skills'],
    ['lead generation', 'Skills'],
    ['CRM', 'Skills'],
    ['machine learning', 'Skills'],
  ])('%s is %s', (name, kind) => {
    expect(kindOf(name)).toBe(kind)
  })
})
