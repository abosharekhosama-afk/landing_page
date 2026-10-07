begin;

create table if not exists public.cpanel_module_definitions (
  module_key text primary key,
  group_key text not null,
  label_ar text not null,
  label_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  icon_key text not null default 'module',
  route text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  required_permissions jsonb not null default '[]'::jsonb,
  allowed_roles jsonb not null default '[]'::jsonb,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_cpanel_modules (
  company_id text not null references public.companies(id) on delete cascade,
  module_key text not null references public.cpanel_module_definitions(module_key) on delete cascade,
  enabled boolean not null default true,
  sort_order integer,
  label_ar_override text,
  label_en_override text,
  configuration_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(company_id,module_key)
);

create index if not exists idx_company_cpanel_modules_enabled_order on public.company_cpanel_modules(company_id,enabled,sort_order);

insert into public.cpanel_module_definitions(module_key,group_key,label_en,label_ar,icon_key,route,sort_order,required_permissions,allowed_roles)
values
('dashboard','dashboard','Dashboard','لوحة التحكم','dashboard','/admin/dashboard',10,'[]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('catalog.products','catalog','Products','المنتجات','products','/admin/products',100,'["products.read","products.view","products.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('catalog.categories','catalog','Categories','الأقسام','categories','/admin/categories',110,'["categories.view","categories.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('catalog.brands','catalog','Brands','العلامات التجارية','brands','/admin/brands',120,'["brands.view","brands.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('storefront.videos','storefront','Videos','الفيديوهات','videos','/admin/vlogs',200,'[]','["super_admin","company_admin","admin","manager"]'),
('storefront.locations','storefront','Store locations','مواقع المتاجر','locations','/admin/store-locator',210,'[]','["super_admin","company_admin","admin","manager"]'),
('storefront.website_media','storefront','Website media','وسائط الموقع','media','/admin/website-media',220,'["website_media.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('storefront.website_texts','storefront','Website texts','نصوص الموقع','texts','/admin/website-texts',230,'["website_texts.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('operations.orders','operations','Orders','الطلبات','orders','/admin/orders',300,'["orders.read","orders.view","orders.manage"]','["super_admin","company_admin","admin","manager","employee","staff"]'),
('operations.invoices','operations','Invoices','الفواتير','invoices','/admin/invoices',310,'["invoices.view","invoices.manage"]','["super_admin","company_admin","admin","manager"]'),
('operations.delivery','operations','Delivery','التوصيل','delivery','/admin/delivery',320,'["delivery.view","delivery.manage"]','["super_admin","company_admin","admin","manager"]'),
('operations.reviews','operations','Reviews','التقييمات','reviews','/admin/reviews',330,'["reviews.view","reviews.manage"]','["super_admin","company_admin","admin","manager"]'),
('operations.inventory','operations','Inventory','المخزون','inventory','/admin/inventory',340,'["inventory.view","inventory.manage"]','["super_admin","company_admin","admin","manager"]'),
('people.customers','people','Customers','العملاء','customers','/admin/customers',400,'["customers.view","customers.manage"]','["super_admin","company_admin","admin","manager"]'),
('people.employees','people','Employees','الموظفون','employees','/admin/staff',410,'["employees.view","employees.manage"]','["super_admin","company_admin","admin"]'),
('settings.configuration','settings','Configuration','الإعدادات','settings','/admin/settings',500,'["company_settings.view","company_settings.update"]','["super_admin","company_admin","admin"]'),
('settings.product_settings','settings','Product settings','إعدادات المنتجات','product-settings','/admin/product-settings',510,'["product_settings.view","product_settings.manage"]','["super_admin","company_admin","admin"]'),
('settings.reports','settings','Reports','التقارير','reports','/admin/reports',520,'["reports.view"]','["super_admin","company_admin","admin"]'),
('settings.activity_log','settings','Activity log','سجل النشاط','activity','/admin/activity-log',530,'["activity_log.view"]','["super_admin","company_admin","admin"]'),
('settings.unit_creator','settings','Unit creator','منشئ الوحدات','units','/admin/unit-creator',540,'["product_settings.manage"]','["super_admin","company_admin","admin"]'),
('dropshipping.overview','dropshipping','Overview','نظرة عامة','dashboard','/admin/dropshipping',600,'["dropshipping.reports.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.marketers','dropshipping','Marketers','المسوقون','employees','/admin/dropshipping/marketers',610,'["dropshipping.marketers.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.products','dropshipping','Products','المنتجات','products','/admin/dropshipping/products',620,'["dropshipping.products.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.orders','dropshipping','Orders','الطلبات','orders','/admin/dropshipping/orders',630,'["dropshipping.orders.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.earnings','dropshipping','Earnings','الأرباح','earnings','/admin/dropshipping/earnings',640,'["dropshipping.earnings.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.withdrawals','dropshipping','Withdrawals','السحوبات','withdrawals','/admin/dropshipping/withdrawals',650,'["dropshipping.withdrawals.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.reports','dropshipping','Dropshipping reports','تقارير الدروبشيبينغ','reports','/admin/dropshipping/reports',660,'["dropshipping.reports.read"]','["super_admin","company_admin","admin"]'),
('dropshipping.settings','dropshipping','Dropshipping settings','إعدادات الدروبشيبينغ','settings','/admin/dropshipping/settings',670,'["dropshipping.settings.manage"]','["super_admin","company_admin","admin"]')
on conflict(module_key) do update set group_key=excluded.group_key,label_ar=excluded.label_ar,label_en=excluded.label_en,icon_key=excluded.icon_key,route=excluded.route,sort_order=excluded.sort_order,required_permissions=excluded.required_permissions,allowed_roles=excluded.allowed_roles,updated_at=now();

update public.cpanel_module_definitions
set description_en = case when description_en = '' then label_en || ' administration' else description_en end,
    description_ar = case when description_ar = '' then 'إدارة ' || label_ar else description_ar end,
    updated_at = now();

insert into public.company_cpanel_modules(company_id,module_key,enabled,sort_order)
select 'eb-chemical',module_key,true,sort_order from public.cpanel_module_definitions
where exists(select 1 from public.companies where id='eb-chemical')
on conflict(company_id,module_key) do nothing;

insert into public.company_cpanel_modules(company_id,module_key,enabled,sort_order)
select 'icare',module_key,(module_key not in ('storefront.videos','storefront.locations','operations.invoices','operations.delivery','operations.reviews','operations.inventory','settings.product_settings','settings.reports','settings.activity_log','settings.unit_creator')),sort_order
from public.cpanel_module_definitions
where exists(select 1 from public.companies where id='icare')
on conflict(company_id,module_key) do nothing;

alter table public.cpanel_module_definitions enable row level security;
alter table public.company_cpanel_modules enable row level security;

commit;
