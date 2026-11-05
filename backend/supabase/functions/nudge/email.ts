// The follow-up email (#113), as HTML in the same card as Supabase Auth's
// emails (supabase/email-templates/) plus a plain-text copy for clients that
// show only text. Every value put into the HTML is ours: fixed copy and the
// unsubscribe URL, whose token is URL-encoded.

export type Version = 'resume' | 'no_resume'

const COPY: Record<Version, { subject: string; heading: string; opening: string; lead?: string; steps: string[] }> = {
  resume: {
    subject: 'Your resume is in. Try it on one job',
    heading: 'Try it on one job',
    opening: "You added your resume to Cover Me yesterday but haven't tailored it to a job yet.",
    steps: [
      'Open any job posting on LinkedIn, Indeed, Greenhouse, Lever or Workday.',
      'Click the Cover Me icon.',
      'Press Tailor.',
    ],
  },
  no_resume: {
    subject: 'One step left: add your resume',
    heading: 'One step left: add your resume',
    opening: "You made a Cover Me account yesterday. Add your resume in the extension's Settings and you're one click from a tailored resume.",
    // The HTML's opening, when it differs: the steps there say where the
    // resume goes, so it doesn't repeat it.
    lead: "You made a Cover Me account yesterday. You're three steps from a tailored resume.",
    steps: [
      "Click the Cover Me icon and add your resume in Settings.",
      'Open any job posting on LinkedIn, Indeed, Greenhouse, Lever or Workday.',
      'Click the Cover Me icon and press Tailor.',
    ],
  },
}

const TIMING = 'It takes about 30 seconds, and you get 10 free to start.'

export function nudgeEmail(version: Version, unsubscribeUrl: string, site: string) {
  const { subject, heading, opening, lead = opening, steps } = COPY[version]

  const text = `${opening}

Open any job posting on LinkedIn, Indeed, Greenhouse, Lever or Workday, click the Cover Me icon, and press Tailor. ${TIMING}

If something didn't work, reply to this email. I read every one.

Lincoln

--\u0020
Don't want emails like this? Unsubscribe: ${unsubscribeUrl}
`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Inbox preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;opacity:0;">${esc(lead)}${'&zwnj;&nbsp;'.repeat(40)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#0d1117;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:520px;background-color:#161c2e;border-radius:12px;border:1px solid #2a3452;">
          <tr>
            <td style="padding:28px 36px;border-bottom:1px solid #2a3452;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://cover-me.dev/logo.png" width="26" height="26" alt="CM" style="display:block;border-radius:6px;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#e2e8f0;font-size:15px;font-weight:700;letter-spacing:-0.3px;">Cover Me</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px;">
              <h1 style="margin:0 0 12px;color:#e2e8f0;font-size:22px;font-weight:700;letter-spacing:-0.5px;line-height:1.3;">${esc(heading)}</h1>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.75;">${esc(lead)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#1e2740;border-radius:8px;border:1px solid #2a3452;">
                <tr>
                  <td style="padding:16px 18px;">
${steps.map((step, i) => `                    <p style="margin:${i ? '10px' : '0'} 0 0;color:#e2e8f0;font-size:14px;line-height:1.6;"><strong style="color:#818cf8;">${i + 1}.</strong>&nbsp; ${esc(step)}</p>`).join('\n')}
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;color:#94a3b8;font-size:15px;line-height:1.75;">${esc(TIMING)}</p>
              <p style="margin:20px 0 0;color:#94a3b8;font-size:15px;line-height:1.75;">If something didn&rsquo;t work, reply to this email. I read every one.</p>
              <p style="margin:20px 0 0;color:#e2e8f0;font-size:15px;line-height:1.75;">Lincoln</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px 24px;border-top:1px solid #2a3452;">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.65;">
                Cover Me &mdash; a tailored cover letter for every job you apply to.<br />
                <a href="${esc(site)}" style="color:#6366f1;text-decoration:none;">cover-me.dev</a>
                &nbsp;&middot;&nbsp;
                <a href="${esc(site)}/privacy" style="color:#475569;text-decoration:none;">Privacy Policy</a>
                &nbsp;&middot;&nbsp;
                <a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  return { subject, text, html }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
