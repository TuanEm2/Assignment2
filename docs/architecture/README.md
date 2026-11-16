# BrewLite — Task 3.1 và Task 3.2

Task 3.1 trình bày phương pháp và quyết định kiến trúc; Task 3.2 mô tả deployment và truy vết các thành phần về kiến trúc/code.

## Task 3.1 — Phương pháp và quyết định kiến trúc

- [Tài liệu kiến trúc phân lớp](task3.1-architecture.md).
- [Sơ đồ kiến trúc SVG](layered-architecture.svg), [nguồn PlantUML](layered-architecture.puml).
- [ADR 001 — Monorepo](adr/001-monorepo.md).
- [ADR 002 — Modular monolith](adr/002-modular-monolith.md).
- [ADR 003 — Next.js và PWA](adr/003-nextjs-pwa.md).
- [ADR 004 — PostgreSQL và migration](adr/004-postgres-prisma.md).
- [ADR 005 — Mock payment và PayOS](adr/005-payment-modes.md).
- [ADR 006 — Docker/Render](adr/006-render-deployment.md).
- [ADR 007 — Logging, health và config](adr/007-observability-configuration.md).

## Task 3.2 — UML deployment diagram

- [Tài liệu giải thích deployment](../diagrams/task3.2/task3.2-deployment.md).
- [Sơ đồ deployment SVG](../diagrams/task3.2/deployment-production.svg), [nguồn PlantUML](../diagrams/task3.2/deployment-production.puml).
- [Bảng truy vết node deployment về kiến trúc/code](../diagrams/task3.2/deployment-traceability.md).

## Phạm vi bằng chứng

Kiến trúc được lập từ source tại commit `0b427b1e54b249addfd0229c406fd5ad62cb0ef2`; deployment được đối chiếu lại tại `9715b33d079cf47c5be569bc132c19e0f8dea052`, ngày 16/11/2026. Chủ dự án xác nhận nền tảng Render, **My Workspace**, hai URL Web/API và mã PostgreSQL; kiểm tra HTTP công khai đã thành công. Nguồn build/deploy và kết nối DB nội bộ đang chờ đối chiếu vì kết nối Render hiện tại thuộc workspace khác. Tài liệu có bảng truy vết từng node và phân biệt cấu hình source với bằng chứng production.

## Chỉnh sửa sơ đồ

Mở file `.puml` trong PlantUML/IDE có extension PlantUML, hoặc chạy:

```bash
java -jar plantuml.jar -charset UTF-8 -tsvg docs/architecture/*.puml docs/diagrams/task3.2/*.puml
```

Commit cả file nguồn `.puml` và ảnh `.svg` tương ứng để người đọc GitHub xem được mà không cần cài công cụ.
