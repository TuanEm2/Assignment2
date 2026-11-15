# BrewLite — Task 3.1 và Task 3.2

Hai task trong đề là kiến trúc/ADR và deployment diagram. Thiết lập repo/Docker là một phần căn cứ kỹ thuật; không thay thế hai tài liệu này.

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

- [Tài liệu giải thích deployment](task3.2-deployment.md).
- [Sơ đồ deployment SVG](deployment-production.svg), [nguồn PlantUML](deployment-production.puml).

## Phạm vi bằng chứng

Đối chiếu source tại commit `0b427b1e54b249addfd0229c406fd5ad62cb0ef2`, ngày 15/11/2026. Theo lựa chọn dùng cấu hình repo, không đọc trạng thái dịch vụ live. Deployment diagram thể hiện mô hình Render/GHCR được cấu hình trong source, chưa phải bằng chứng production đã chạy. Tài liệu ghi rõ các phần còn thiếu như PWA, request logging/readiness đầy đủ và đối chiếu hạ tầng live.

## Chỉnh sửa sơ đồ

Mở file `.puml` trong PlantUML/IDE có extension PlantUML, hoặc chạy:

```bash
java -jar plantuml.jar -charset UTF-8 -tsvg docs/architecture/*.puml
```

Commit cả file nguồn `.puml` và ảnh `.svg` tương ứng để người đọc GitHub xem được mà không cần cài công cụ.
