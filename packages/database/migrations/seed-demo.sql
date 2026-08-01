-- 仅用于全新 V2 沙箱数据库；生产环境不得直接执行演示数据。
insert into merchants (id,name,status,created_at,updated_at)
values ('11111111-1111-4111-8111-111111111111','BUYHKSIM 香港直营店','ACTIVE',now(),now())
on conflict (id) do nothing;

insert into warehouses (id,merchant_id,name,code,kind,created_at,updated_at)
values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','香港数字仓','HK-ESIM','DIGITAL',now(),now())
on conflict (id) do nothing;

insert into products (id,merchant_id,slug,title,description,destination,kind,status,published_at,created_at,updated_at) values
('31111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','hong-kong-5g-esim','香港 5G eSIM','香港本地 5G 高速套餐','香港','ESIM','ACTIVE',now(),now(),now()),
('32222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','japan-5g-esim','日本 5G eSIM','日本多网络高速套餐','日本','ESIM','ACTIVE',now(),now(),now()),
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','europe-33-countries-esim','欧洲多国 33 国 eSIM','欧洲 33 国通用套餐','欧洲 33 国','ESIM','ACTIVE',now(),now(),now())
on conflict (id) do nothing;

insert into skus (id,product_id,code,title,price_minor,currency,attributes,commission_bps,active,created_at,updated_at) values
('5a1a1111-1111-4111-8111-111111111111','31111111-1111-4111-8111-111111111111','HK-5G-5D-5G','5 天 5GB',5800,'CNY','{"days":5,"data":"5GB"}',800,true,now(),now()),
('5a1a2222-2222-4222-8222-222222222222','32222222-2222-4222-8222-222222222222','JP-5G-7D-10G','7 天 10GB',6800,'CNY','{"days":7,"data":"10GB"}',800,true,now(),now()),
('5a1a3333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','EU-33-15D-30G','15 天 30GB',19800,'CNY','{"days":15,"data":"30GB"}',1000,true,now(),now())
on conflict (id) do nothing;

insert into inventory (sku_id,warehouse_id,available,locked,sold,version,created_at,updated_at) values
('5a1a1111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',1000,0,0,0,now(),now()),
('5a1a2222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',800,0,0,0,now(),now()),
('5a1a3333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',500,0,0,0,now(),now())
on conflict (sku_id,warehouse_id) do nothing;
