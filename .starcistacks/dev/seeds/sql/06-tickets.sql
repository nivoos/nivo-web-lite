-- NIVO Web dev sample, 6 of 7: support tickets in every status (open, in progress, waiting for the customer, quoted, resolved,
-- closed) with the conversation lines of each: the customer's words as the desk wrote them down, the agent's plan, a person's note
-- and every status change. The CRM keeps no assignee on a ticket: who holds a ticket lives in NIVO's responsibility overlay, so a
-- note's author is only who wrote the line. Hours are how long ago the ticket opened; a note's minutes count from its opening.
select set_config('dev_sample.workspace', '5e0d1c7a-3b2f-4e11-9a6d-0000000000a1', false);

insert into public.crm_tickets
    (workspace_id, customer_id, service_ids, kind, status, channel, source_ref, subject, summary, opened_at, closed_at, request_key, request_hash,
     created_at, updated_at)
select
    c.workspace_id,
    c.id,
    coalesce(array(
        select sv.id from public.crm_services sv
        where sv.workspace_id = c.workspace_id and sv.code = any (s.service_codes) order by sv.code
    ), '{}'::uuid[]),
    s.kind,
    s.status,
    s.channel,
    lower(s.channel) || ':dev-sample-' || lower(s.ref),
    s.subject,
    s.summary,
    now() - s.opened_hours * interval '1 hour',
    case when s.status = 'closed' then now() - s.closed_hours * interval '1 hour' end,
    'dev-sample:ticket:' || s.ref,
    encode(sha256(convert_to('dev-sample:ticket:' || s.ref, 'UTF8')), 'hex'),
    now() - s.opened_hours * interval '1 hour',
    now() - coalesce(s.closed_hours, s.opened_hours / 2) * interval '1 hour'
from (values
    ('T01', 'KH-0412', 'fault', 'open', 'zalo', 'Website minhlonggom.vn tải rất chậm từ sáng nay', 'Khách báo trang chủ mất hơn 10 giây mới mở, giờ cao điểm bán hàng. Hosting còn 14 ngày nữa hết hạn.', array['MINHLONGGOM-HOST'], 2, null::integer),
    ('T02', 'KH-0291', 'question', 'open', 'email', 'Hỏi cách tạo email theo tên miền mocland.com.vn', 'Khách muốn có địa chỉ email theo đuôi tên miền riêng cho 3 nhân viên, chưa biết gói nào.', array['MOCLAND-TM'], 5, null),
    ('T03', 'KH-0472', 'complaint', 'open', 'phone', 'Khách bực: trang đặt lịch nhiantam.vn lỗi hai ngày liên tiếp', 'Phụ huynh đặt lịch không được, gọi thẳng lên phòng khám. Chủ phòng khám yêu cầu người gọi lại trong hôm nay.', array['NHIANTAM-HOST', 'NHIANTAM-TM'], 1, null),
    ('T04', 'KH-0480', 'fault', 'open', 'phone', 'Tên miền garagelongphat.vn hết hạn, website không vào được', 'Tên miền đã quá hạn 19 ngày, khách chưa liên lạc được qua điện thoại hay Zalo.', array['GARAGELONGPHAT-TM'], 3, null),
    ('T05', 'KH-0388', 'fault', 'in_progress', 'zalo', 'Form đặt lịch trên nhakhoaanhduong.vn không gửi được', 'Form đặt lịch báo thành công nhưng phòng khám không nhận được thư. Đang kiểm tra cấu hình thư gửi của hosting.', array['NHAKHOAANHDUONG-HOST'], 26, null),
    ('T06', 'KH-0207', 'request', 'in_progress', 'email', 'Cập nhật banner khai giảng tháng 12', 'Trung tâm gửi ảnh banner mới và lịch khai giảng ba lớp; cần thay ở trang chủ và trang khoá học.', array['BLUEBELL-HOST'], 30, null),
    ('T07', 'KH-0175', 'fault', 'in_progress', 'chat', 'Trình duyệt báo không an toàn trên saovietfood.vn', 'Chứng chỉ SSL sắp hết hạn và máy chủ trả chứng chỉ cũ; đang chờ nhà cung cấp cấp lại.', array['SAOVIETFOOD-SSL'], 20, null),
    ('T08', 'KH-0433', 'request', 'in_progress', 'zalo', 'Đổi số hotline trên website hoasenvang.spa', 'Spa đổi số điện thoại đặt chỗ; cần sửa đầu trang, chân trang và trang liên hệ.', array['HOASENVANG-HOST'], 8, null),
    ('T09', 'KH-0159', 'question', 'waiting_customer', 'zalo', 'Chuyển tên miền phucthinhlaw.vn sang tài khoản mới', 'Văn phòng luật muốn chuyển chủ sở hữu tên miền; cần giấy đăng ký kinh doanh và ủy quyền, khách hứa gửi sớm.', array['PHUCTHINHLAW-TM'], 50, null),
    ('T10', 'KH-0451', 'fault', 'waiting_customer', 'email', 'Email goviet.com.vn không nhận được thư', 'Đã kiểm tra bản ghi MX đúng; đang chờ khách gửi ảnh chụp thông báo lỗi khi gửi thư.', array['GOVIET-TM'], 72, null),
    ('T11', 'KH-0466', 'request', 'quoted', 'zalo', 'Thêm giỏ hàng và thanh toán cho banhmay.vn', 'Đã báo giá phần mở rộng giỏ hàng; tên miền banhmay.vn đang hết hạn nên cần gia hạn trước.', array['BANHMAY-TM', 'BANHMAY-HOST'], 96, null),
    ('T12', 'KH-0359', 'fault', 'resolved', 'phone', 'Website salonhavy.vn hiện lỗi 500', 'Lỗi do tiện ích đặt lịch xung đột phiên bản PHP; đã gỡ tiện ích, website chạy lại bình thường.', array['SALONHAVY-HOST'], 72, null),
    ('T13', 'KH-0420', 'question', 'resolved', 'email', 'Cách đổi mật khẩu quản trị WordPress', 'Đã hướng dẫn khách đặt lại mật khẩu qua thư; chờ khách xác nhận lần cuối.', array['SPALATRA-HOST'], 48, null),
    ('T14', 'KH-0344', 'fault', 'closed', 'zalo', 'Website tiệm hoa tiemhoalucbinh.vn không vào được', 'Tên miền hết hạn hai ngày; đã gia hạn khẩn tại nhà đăng ký, website chạy lại và khách xác nhận.', array['TIEMHOALUCBINH-TM'], 216, 192),
    ('T15', 'KH-0302', 'request', 'closed', 'chat', 'Thêm trang thực đơn mới cho caphenangsom.vn', 'Đã thêm trang thực đơn mùa đông theo ảnh khách gửi; khách duyệt và đóng phiếu.', array['CAPHENANGSOM-HOST'], 288, 240),
    ('T16', 'KH-0437', 'complaint', 'closed', 'email', 'Hóa đơn hosting ghi sai tên công ty', 'Kế toán xuất lại hóa đơn đúng tên; khách nhận hóa đơn mới và đồng ý đóng phiếu.', array['GYMSUCSONG-HOST'], 360, 312)
) as s (ref, customer_code, kind, status, channel, subject, summary, service_codes, opened_hours, closed_hours)
join public.crm_customers c on c.workspace_id = current_setting('dev_sample.workspace')::uuid and c.code = s.customer_code
on conflict do nothing;

-- The conversation lines. `who` is who wrote the line; the first line of a ticket is what the customer said, written by the desk agent.
insert into public.crm_ticket_notes
    (workspace_id, ticket_id, body, status_from, status_to, author, request_key, request_hash, created_at, updated_at)
select
    t.workspace_id,
    t.id,
    nullif(s.body, ''),
    s.status_from,
    s.status_to,
    s.who,
    'dev-sample:note:' || s.ref || ':' || s.k,
    encode(sha256(convert_to('dev-sample:note:' || s.ref || ':' || s.k, 'UTF8')), 'hex'),
    t.opened_at + s.minutes * interval '1 minute',
    t.opened_at + s.minutes * interval '1 minute'
from (values
    ('T01', 1, 'Agent Hỗ trợ', 'Khách nhắn Zalo: "Web chạy chậm quá, từ 8 giờ sáng tới giờ khách vào không được." Đã gắn hosting minhlonggom.vn, còn trong hợp đồng bảo trì.', null::text, null::text, 1),
    ('T01', 2, 'Agent Hỗ trợ', 'Kế hoạch cho nhóm: kiểm tra tải CPU của hosting và dung lượng ảnh trang chủ, báo lại khách trước 11 giờ.', null, null, 3),
    ('T02', 1, 'Agent Hỗ trợ', 'Khách hỏi qua thư về email theo tên miền. Gói hosting hiện có cho phép 5 hộp thư miễn phí.', null, null, 2),
    ('T03', 1, 'Agent Hỗ trợ', 'Khách gọi điện, giọng gay gắt: đặt lịch lỗi hai ngày, mất khách. Cần một người gọi lại, không để agent trả lời.', null, null, 2),
    ('T03', 2, 'Thu Trang', 'Đã nhận phiếu, sẽ gọi lại chủ phòng khám sau khi Quang Huy kiểm tra máy chủ.', null, null, 20),
    ('T04', 1, 'Agent Hỗ trợ', 'Tên miền garagelongphat.vn hết hạn từ 19 ngày trước. Khách không có số điện thoại hay e-mail trong hồ sơ.', null, null, 2),
    ('T05', 1, 'Agent Hỗ trợ', 'Khách báo form đặt lịch không gửi thư về. Đã ghi nhận hosting nhakhoaanhduong.vn còn 6 ngày hết hạn.', null, null, 3),
    ('T05', 2, 'Quang Huy', 'Máy chủ thư của hosting chặn thư gửi ra ngoài. Đang đổi sang gửi thư qua dịch vụ SMTP riêng.', 'open', 'in_progress', 140),
    ('T06', 1, 'Agent Hỗ trợ', 'Trung tâm gửi hai ảnh banner và lịch khai giảng ba lớp qua thư.', null, null, 4),
    ('T06', 2, 'Thu Trang', 'Nhận việc cập nhật banner, dự kiến làm xong trong ngày mai.', 'open', 'in_progress', 90),
    ('T07', 1, 'Agent Hỗ trợ', 'Khách thấy cảnh báo chứng chỉ trên trình duyệt. SSL của saovietfood.vn còn 9 ngày hết hạn.', null, null, 2),
    ('T07', 2, 'Quang Huy', 'Đã gửi yêu cầu cấp lại chứng chỉ cho AZ Website, chờ phản hồi.', 'open', 'in_progress', 200),
    ('T08', 1, 'Agent Hỗ trợ', 'Spa đổi số hotline sang số mới, nhờ sửa ở đầu trang, chân trang và trang liên hệ.', null, null, 3),
    ('T08', 2, 'Thu Trang', 'Đang sửa, xong ba vị trí trong sáng nay.', 'open', 'in_progress', 60),
    ('T09', 1, 'Agent Hỗ trợ', 'Khách muốn chuyển chủ sở hữu tên miền sang công ty mới thành lập.', null, null, 2),
    ('T09', 2, 'Thu Trang', 'Đã gửi danh sách giấy tờ cần có. Chờ khách gửi giấy đăng ký kinh doanh và ủy quyền.', 'open', 'waiting_customer', 300),
    ('T10', 1, 'Agent Hỗ trợ', 'Khách không nhận được thư gửi tới địa chỉ trên goviet.com.vn từ hai ngày nay.', null, null, 2),
    ('T10', 2, 'Quang Huy', 'Bản ghi MX đúng. Nhờ khách gửi ảnh chụp thông báo lỗi người gửi nhận được để xác định tiếp.', 'open', 'waiting_customer', 400),
    ('T11', 1, 'Agent Hỗ trợ', 'Tiệm bánh muốn thêm giỏ hàng và thanh toán chuyển khoản cho website.', null, null, 3),
    ('T11', 2, 'Bảo Ngọc', 'Báo giá phần giỏ hàng gửi khách qua Zalo. Lưu ý tên miền banhmay.vn đang hết hạn, cần gia hạn trước khi làm.', 'open', 'quoted', 600),
    ('T12', 1, 'Agent Hỗ trợ', 'Khách gọi: website hiện trang lỗi 500 từ chiều qua, khách đặt lịch không được.', null, null, 2),
    ('T12', 2, 'Quang Huy', 'Lỗi do tiện ích đặt lịch xung đột phiên bản PHP. Đã gỡ tiện ích và khôi phục bản ổn định.', 'open', 'in_progress', 180),
    ('T12', 3, 'Quang Huy', 'Website chạy lại bình thường, đã báo khách.', 'in_progress', 'resolved', 420),
    ('T13', 1, 'Agent Hỗ trợ', 'Khách quên mật khẩu quản trị WordPress, hỏi cách đặt lại.', null, null, 2),
    ('T13', 2, 'Thu Trang', 'Đã hướng dẫn đặt lại mật khẩu qua thư. Chờ khách xác nhận đăng nhập được.', 'open', 'resolved', 30),
    ('T14', 1, 'Agent Hỗ trợ', 'Khách báo website không vào được. Phát hiện tên miền tiemhoalucbinh.vn đã hết hạn hai ngày.', null, null, 2),
    ('T14', 2, 'Quang Huy', 'Đã gia hạn khẩn tại nhà đăng ký, website truy cập lại được sau 40 phút.', 'open', 'in_progress', 90),
    ('T14', 3, 'Thu Trang', 'Khách xác nhận website đã chạy, đóng phiếu.', 'in_progress', 'closed', 1440),
    ('T15', 1, 'Agent Hỗ trợ', 'Quán cà phê muốn thêm trang thực đơn mùa đông, gửi kèm ảnh món.', null, null, 2),
    ('T15', 2, 'Thu Trang', 'Đã thêm trang thực đơn, khách duyệt bản xem trước.', 'open', 'in_progress', 600),
    ('T15', 3, 'Thu Trang', 'Khách đồng ý bản cuối, đóng phiếu.', 'in_progress', 'closed', 2880),
    ('T16', 1, 'Agent Hỗ trợ', 'Khách khiếu nại hóa đơn hosting ghi sai tên công ty.', null, null, 2),
    ('T16', 2, 'Ngọc Anh', 'Đã xuất lại hóa đơn đúng tên và gửi khách qua thư.', 'open', 'in_progress', 1200),
    ('T16', 3, 'Thu Trang', 'Khách nhận hóa đơn mới, đóng phiếu.', 'in_progress', 'closed', 2880)
) as s (ref, k, who, body, status_from, status_to, minutes)
join public.crm_tickets t on t.workspace_id = current_setting('dev_sample.workspace')::uuid and t.request_key = 'dev-sample:ticket:' || s.ref
on conflict do nothing;
