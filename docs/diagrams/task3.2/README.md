# Task 3.2 — UML deployment diagram

- [Sơ đồ SVG](deployment-production.svg).
- [Nguồn PlantUML](deployment-production.puml).
- [Thuyết minh production](task3.2-deployment.md).
- [Truy vết từng node về kiến trúc/code và đối chiếu yêu cầu](deployment-traceability.md).
- [Bằng chứng Render, log và HTTP](deployment-evidence.md).
- [Kiến trúc Task 3.1 và ADR](../../architecture/README.md).

Đã đối chiếu ngày 16/11/2026 với **Render — My Workspace — Oregon**: Web/API build từ Dockerfile trên GitHub `main`, PostgreSQL 16 có storage do Render quản lý. Sơ đồ dùng cổng runtime 10000 đã thấy trong log, thể hiện đường DB nội bộ và external access đang được cho phép.

Bộ tài liệu đáp ứng các mục của deployment diagram và có bảng truy vết. Điều này không đồng nghĩa toàn bộ NFR, bảo mật production hoặc checkout E2E đã được nghiệm thu.

Kết xuất lại:

```bash
java -jar plantuml.jar -charset UTF-8 -tsvg docs/diagrams/task3.2/deployment-production.puml
```
