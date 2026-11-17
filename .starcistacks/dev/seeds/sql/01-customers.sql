-- NIVO Web dev sample, 1 of 7: customers, their contact person and their websites. Dev only: this level is applied in the dev
-- environment and nowhere else. Every person, business, phone and e-mail is invented (phones count up from 0900000000, e-mails sit
-- on example.test); the sample belongs to ONE workspace, the id below, so a CRM service credential issued for that workspace
-- (cli credential issue --workspace 5e0d1c7a-3b2f-4e11-9a6d-0000000000a1 --label dev) reads it. Rows are keyed by their natural
-- key and written once (on conflict do nothing): a person's edit in dev is never overwritten. Provenance reads source_file dev-sample.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_customers
    (workspace_id, code, kind, name, tax_id, address, phone, email, reachable, source_file, source_sheet, source_row, source_hash)
select
    current_setting('dev_sample.workspace')::uuid,
    s.code,
    s.kind,
    s.name,
    case when s.kind = 'company' then '0310' || lpad(substr(s.code, 4), 6, '0') end,
    s.address,
    case when s.has_phone then '0900' || lpad(substr(s.code, 4), 6, '0') end,
    case when s.has_email then lower(replace(s.code, '-', '')) || '@example.test' end,
    s.has_phone or s.has_email,
    'dev-sample',
    'customers',
    (row_number() over (order by s.code))::integer,
    encode(sha256(convert_to('dev-sample:customer:' || s.code, 'UTF8')), 'hex')
from (values
    ('KH-0159', 'company', 'Luật Phúc Thịnh', '18 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh', true, true),
    ('KH-0175', 'company', 'Công ty CP Thực phẩm Sao Việt', 'Lô C4, KCN Tân Bình, TP. Hồ Chí Minh', true, true),
    ('KH-0207', 'company', 'Trung tâm Anh ngữ Bluebell', '62 Lê Lợi, Hải Châu, Đà Nẵng', true, true),
    ('KH-0291', 'company', 'Cửa hàng Mộc Lan', '9 Phan Chu Trinh, Ninh Kiều, Cần Thơ', false, true),
    ('KH-0302', 'person', 'Cà phê Nắng Sớm', '31 Trần Phú, Nha Trang, Khánh Hòa', true, false),
    ('KH-0344', 'company', 'Tiệm hoa Lục Bình', '5 Hùng Vương, Ninh Kiều, Cần Thơ', true, true),
    ('KH-0359', 'company', 'Salon tóc Hạ Vy', '77 Lý Thường Kiệt, Hải Phòng', true, false),
    ('KH-0388', 'company', 'Nha khoa Ánh Dương', '120 Cầu Giấy, Hà Nội', true, true),
    ('KH-0412', 'company', 'Công ty TNHH Gốm Minh Long', '24 Hàng Gai, Hoàn Kiếm, Hà Nội', true, true),
    ('KH-0420', 'company', 'Spa Lá Trà', '14 Nguyễn Huệ, Huế', true, true),
    ('KH-0433', 'company', 'Spa Hoa Sen Vàng', '203 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh', true, true),
    ('KH-0437', 'company', 'Phòng tập Gym Sức Sống', '88 Nguyễn Văn Linh, Đà Nẵng', true, false),
    ('KH-0445', 'company', 'Cửa hàng Mẹ và Bé Tí Nị', '40 Võ Thị Sáu, Biên Hòa, Đồng Nai', true, true),
    ('KH-0451', 'company', 'Nội thất Gỗ Việt', '315 Quốc lộ 1A, Thủ Đức, TP. Hồ Chí Minh', true, true),
    ('KH-0460', 'company', 'Dịch vụ giặt ủi Sạch Xinh', '7 Lê Duẩn, Vinh, Nghệ An', false, true),
    ('KH-0466', 'person', 'Tiệm bánh Mây', '12 Phạm Ngũ Lão, Đà Lạt, Lâm Đồng', true, true),
    ('KH-0472', 'company', 'Phòng khám Nhi An Tâm', '55 Trường Chinh, Thanh Xuân, Hà Nội', true, true),
    ('KH-0480', 'company', 'Garage Long Phát', '260 Nguyễn Văn Cừ, Long Biên, Hà Nội', false, false)
) as s (code, kind, name, address, has_phone, has_email)
on conflict do nothing;

-- One contact person per reachable customer, on the customer's own phone and e-mail; the preferred channel is what the reminders use.
insert into public.crm_contacts (workspace_id, customer_id, name, phone, email, zalo_id, preferred_channel)
select
    c.workspace_id, c.id, s.name, c.phone, c.email, 'zalo.' || lower(replace(c.code, '-', '')), s.channel
from (values
    ('KH-0159', 'Phan Đức Thịnh', 'email'),
    ('KH-0175', 'Hoàng Văn Sơn', 'phone'),
    ('KH-0207', 'Đỗ Khánh Linh', 'email'),
    ('KH-0291', 'Vũ Thị Lan', 'email'),
    ('KH-0302', 'Nguyễn Hoàng Nam', 'zalo'),
    ('KH-0344', 'Phạm Thị Bình', 'zalo'),
    ('KH-0359', 'Trần Hạ Vy', 'zalo'),
    ('KH-0388', 'Nguyễn Thu Hà', 'zalo'),
    ('KH-0412', 'Phạm Quốc Bảo', 'zalo'),
    ('KH-0420', 'Lê Thị Trà', 'zalo'),
    ('KH-0433', 'Ngô Bích Hạnh', 'zalo'),
    ('KH-0437', 'Bùi Anh Tuấn', 'phone'),
    ('KH-0445', 'Đinh Mỹ Linh', 'zalo'),
    ('KH-0451', 'Trịnh Văn Hưng', 'zalo'),
    ('KH-0460', 'Võ Thanh Xuân', 'email'),
    ('KH-0466', 'Lương Thị Mây', 'zalo'),
    ('KH-0472', 'Đặng Thanh Tâm', 'phone')
) as s (code, name, channel)
join public.crm_customers c on c.workspace_id = current_setting('dev_sample.workspace')::uuid and c.code = s.code
on conflict do nothing;

-- One website per customer (the garage has one too, though nobody can reach it); the domain is the key.
insert into public.crm_websites (workspace_id, domain, customer_id, source_file, source_sheet, source_row, source_hash)
select
    c.workspace_id, s.domain, c.id, 'dev-sample', 'websites', (row_number() over (order by s.domain))::integer,
    encode(sha256(convert_to('dev-sample:website:' || s.domain, 'UTF8')), 'hex')
from (values
    ('KH-0159', 'phucthinhlaw.vn'),
    ('KH-0175', 'saovietfood.vn'),
    ('KH-0207', 'bluebell.edu.vn'),
    ('KH-0291', 'mocland.com.vn'),
    ('KH-0302', 'caphenangsom.vn'),
    ('KH-0344', 'tiemhoalucbinh.vn'),
    ('KH-0359', 'salonhavy.vn'),
    ('KH-0388', 'nhakhoaanhduong.vn'),
    ('KH-0412', 'minhlonggom.vn'),
    ('KH-0420', 'spalatra.vn'),
    ('KH-0433', 'hoasenvang.spa'),
    ('KH-0437', 'gymsucsong.vn'),
    ('KH-0445', 'metreti.vn'),
    ('KH-0451', 'goviet.com.vn'),
    ('KH-0460', 'giatuisachxinh.vn'),
    ('KH-0466', 'banhmay.vn'),
    ('KH-0472', 'nhiantam.vn'),
    ('KH-0480', 'garagelongphat.vn')
) as s (code, domain)
join public.crm_customers c on c.workspace_id = current_setting('dev_sample.workspace')::uuid and c.code = s.code
on conflict do nothing;
