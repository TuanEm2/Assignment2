# BrewLite — Sơ đồ Use Case tổng quát hệ thống (Task 1.2)

| Thuộc tính | Nội dung |
|---|---|
| Dự án | BrewLite — Assignment 2, Requirements to Deployment v1.0 |
| Phân công Task 1.2 | Trần Lê Nguyễn Nhật Ân (Mã vai trò: TV6) phụ trách thiết kế và thuyết minh |
| Người chuẩn bị bản này | Trần Lê Nguyễn Nhật Ân |
| Căn cứ yêu cầu | Đề Assignment2-BrewLite v1.0, mục 1.2 |
| Căn cứ nghiệp vụ | Đặc tả yêu cầu phần mềm SRS chính thức (18 FR, 9 NFR); Luồng nghiệp vụ BrewLite MVP |
| Tệp nguồn sơ đồ | `docs/requirements/task-1.2/use-case-overview.puml` |
| Tệp kết xuất đồ họa | `docs/requirements/task-1.2/use-case-overview.svg` (Vector), `use-case-overview.png` (Ảnh HD) |
| Trạng thái | Đã hoàn thành 100%, kết xuất đầy đủ nguồn PlantUML và ảnh vector SVG/PNG |

---

## 1. Cấu trúc tổng thể
Sơ đồ bao quát toàn bộ hệ thống BrewLite với **3 Tác nhân (Actors)** và **5 Gói chức năng (Packages)**:
- **Khách hàng (Customer):** Duyệt menu, tùy biến đồ uống, đặt món, thanh toán không tiền mặt và xem lịch sử đơn.
- **Nhân viên / Quản lý (Staff / Admin):** Cập nhật tiến độ pha chế và theo dõi định mức tồn kho nguyên liệu.
- **Cổng thanh toán mô phỏng (Mock Gateway):** Xử lý giao dịch trừ tiền giả lập (Ví / Thẻ) và phản hồi kết quả.

## 2. Các mối quan hệ chuẩn mực UML
- **Quan hệ `<<include>>` (Bắt buộc):**
  - `UC_Checkout` include `UC_Auth`: Bắt buộc phải có phiên đăng nhập hợp lệ (JWT) mới được tạo đơn.
  - `UC_Checkout` include `UC_ReserveInventory`: Tạo đơn bắt buộc phải khóa nguyên liệu theo định lượng công thức.
  - `UC_Checkout` include `UC_Payment`: Khách đặt đồ uống bắt buộc phải hoàn tất thanh toán.
  - `UC_ViewDetail` include `UC_Customize`: Tùy chỉnh size/topping là bước bắt buộc gắn liền với chi tiết món.
- **Quan hệ `Generalization` (Kế thừa):**
  - `Thanh toán bằng Ví` và `Thanh toán bằng Thẻ` kế thừa Use Case cha `Thanh toán đơn hàng`.
- **Quan hệ `<<extend>>` (Mở rộng có điều kiện):**
  - `Thử thanh toán lại` extend `Thanh toán`: Kích hoạt khi lần thử trước có kết quả thất bại (`PAYMENT_FAILED`).
  - `Kiểm tra trạng thái` extend `Thanh toán`: Kích hoạt khi gặp sự cố mạng chưa rõ kết quả.

---

## 3. Danh mục tệp bàn giao Task 1.2
1. **Mã nguồn PlantUML:** [use-case-overview.puml](./use-case-overview.puml)
2. **Ảnh vector sắc nét:** [use-case-overview.svg](./use-case-overview.svg)
3. **Ảnh độ phân giải cao:** [use-case-overview.png](./use-case-overview.png)
4. **Tài liệu thuyết minh:** [use-case-overview.md](./use-case-overview.md)
