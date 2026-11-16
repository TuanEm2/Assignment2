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

Kiến trúc được lập từ source tại commit `0b427b1e54b249addfd0229c406fd5ad62cb0ef2`; deployment được đối chiếu lại với source và hai deploy live tại `fd9211599033519c7e96c60bf8ff26a4b0325b33`, ngày 16/11/2026. Metadata/log xác nhận **Render — My Workspace — Oregon**, hai dịch vụ build từ GitHub main bằng Dockerfile, port runtime 10000 và PostgreSQL 16. Kiểm tra HTTP Web/API đạt. Sơ đồ ghi đúng đường DB nội bộ, external ACL đang mở và phân biệt luồng build thực tế với workflow GHCR còn có trong source. Bảng truy vết ánh xạ từng node về kiến trúc và code.

## Chỉnh sửa sơ đồ

Mở file `.puml` trong PlantUML/IDE có extension PlantUML, hoặc chạy:

```bash
java -jar plantuml.jar -charset UTF-8 -tsvg docs/architecture/*.puml docs/diagrams/task3.2/*.puml
```

Commit cả file nguồn `.puml` và ảnh `.svg` tương ứng để người đọc GitHub xem được mà không cần cài công cụ.
