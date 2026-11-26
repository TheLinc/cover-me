import { describe, expect, test } from 'vitest'
import { countKeywords, greenhouseText, leverText, roleOf } from './role-keywords'

describe('roleOf', () => {
  test.each([
    ['Account Executive, Mid-Market', 'sales'],
    ['Sales Development Representative', 'sales'],
    ['Senior Product Marketing Manager', 'marketing'],
    ['Software Engineer, Backend', 'engineering'],
    ['Mechanical Engineer II (Starship)', 'engineering'],
    ['Senior Software Engineer, Fulfillment', 'engineering'],
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
  ])('%s fits no role', (title) => {
    expect(roleOf(title)).toBeUndefined()
  })
})

describe('postingText', () => {
  test('reads Greenhouse content, which arrives entity-encoded', () => {
    const content = '&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;3+ years of &lt;strong&gt;B2B&lt;/strong&gt; sales&lt;/li&gt;&lt;li&gt;Salesforce &amp;amp; HubSpot&lt;/li&gt;&lt;/ul&gt;&lt;p&gt;We&amp;#39;re hiring&amp;nbsp;now&lt;/p&gt;'
    expect(greenhouseText(content)).toBe("Requirements\n- 3+ years of B2B sales\n- Salesforce & HubSpot\nWe're hiring now")
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
})
