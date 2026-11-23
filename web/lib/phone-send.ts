const SUFFIX = '-phone-send'

export function phoneSendUrl(page: string, placement: string): string {
  return `${page}?${new URLSearchParams({ utm_source: 'share', utm_medium: 'phone', utm_campaign: `${placement}${SUFFIX}` })}`
}

export function sentFrom(search: string): string | null {
  const campaign = new URLSearchParams(search).get('utm_campaign')
  return campaign && campaign.length > SUFFIX.length && campaign.endsWith(SUFFIX) ? campaign : null
}
