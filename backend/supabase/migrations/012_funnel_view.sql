-- Relaunch funnel by signup week, for the owner (SQL editor or service key).
-- Counts only: no emails, no resume or letter content.
-- Activated = generated at least one letter or resume. Free users show up in
-- rate_limits, Pro users in job_applications.
create view public.funnel_weekly
with (security_invoker = true) as
select
  date_trunc('week', u.created_at)::date as week,
  count(*) as signups,
  count(*) filter (
    where exists (select 1 from public.rate_limits r where r.user_id = u.id and r.count > 0)
       or exists (select 1 from public.job_applications j where j.user_id = u.id)
  ) as activated,
  count(*) filter (where u.tier = 'hosted_pro') as pro_now
from public.users u
group by 1
order by 1 desc;

revoke all on public.funnel_weekly from anon, authenticated;
