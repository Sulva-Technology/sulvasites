-- Turn the shop on for sites that are plainly selling but never had it switched on:
-- online-store templates (t13, t14) and any site that already has products.
-- Only sites with no shop_settings row are touched, so an owner's own "off" choice stands.
-- Safe to run more than once.
insert into public.shop_settings (site_id, enabled)
select s.id, true
from public.sites s
where (s.template_key in ('t13', 't14')
       or exists (select 1 from public.products p where p.site_id = s.id))
  and not exists (select 1 from public.shop_settings ss where ss.site_id = s.id)
on conflict (site_id) do nothing;
