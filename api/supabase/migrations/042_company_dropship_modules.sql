begin;

insert into public.cpanel_module_definitions(
  module_key, group_key, label_en, label_ar, description_en, description_ar,
  icon_key, route, sort_order, required_permissions, allowed_roles
)
values
(
  'company_dropship.merchants', 'company_dropship', 'Dropshipping merchants', 'تجار الدروبشيبينغ',
  'Dropshipping merchants administration', 'إدارة تجار الدروبشيبينغ',
  'employees', '/admin/velvet-dropshipping/merchants', 680,
  '["company_dropship.merchants.read"]'::jsonb,
  '["super_admin","company_admin","admin","manager","employee","staff"]'::jsonb
),
(
  'company_dropship.catalog', 'company_dropship', 'Dropshipping catalog', 'كتالوج الدروبشيبينغ',
  'Dropshipping catalog administration', 'إدارة كتالوج الدروبشيبينغ',
  'products', '/admin/velvet-dropshipping/catalog', 681,
  '["company_dropship.catalog.manage"]'::jsonb,
  '["super_admin","company_admin","admin","manager","employee","staff"]'::jsonb
),
(
  'company_dropship.orders', 'company_dropship', 'Dropshipping orders', 'طلبات الدروبشيبينغ',
  'Dropshipping orders administration', 'إدارة طلبات الدروبشيبينغ',
  'orders', '/admin/velvet-dropshipping/orders', 682,
  '["company_dropship.orders.read"]'::jsonb,
  '["super_admin","company_admin","admin","manager","employee","staff"]'::jsonb
),
(
  'company_dropship.fulfillment', 'company_dropship', 'Dropshipping fulfillment', 'تجهيز الدروبشيبينغ',
  'Dropshipping fulfillment administration', 'إدارة تجهيز الدروبشيبينغ',
  'inventory', '/admin/velvet-dropshipping/fulfillment', 683,
  '["company_dropship.fulfillment.manage"]'::jsonb,
  '["super_admin","company_admin","admin","manager","employee","staff"]'::jsonb
),
(
  'company_dropship.settlements', 'company_dropship', 'Dropshipping settlements', 'تسويات الدروبشيبينغ',
  'Dropshipping settlements administration', 'إدارة تسويات الدروبشيبينغ',
  'earnings', '/admin/velvet-dropshipping/settlements', 684,
  '["company_dropship.settlements.read"]'::jsonb,
  '["super_admin","company_admin","admin","manager","employee","staff"]'::jsonb
)
on conflict (module_key) do update set
  group_key = excluded.group_key,
  label_en = excluded.label_en,
  label_ar = excluded.label_ar,
  description_en = excluded.description_en,
  description_ar = excluded.description_ar,
  icon_key = excluded.icon_key,
  route = excluded.route,
  sort_order = excluded.sort_order,
  required_permissions = excluded.required_permissions,
  allowed_roles = excluded.allowed_roles,
  updated_at = now();

insert into public.company_cpanel_modules(company_id, module_key, enabled, sort_order)
select 'kids-velvet', module_key, true, sort_order
from public.cpanel_module_definitions
where module_key like 'company_dropship.%'
  and exists (select 1 from public.companies where id = 'kids-velvet')
on conflict (company_id, module_key) do update set
  enabled = true,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
