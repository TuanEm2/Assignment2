# Task 3.2 — Deployment diagram

- [Sơ đồ SVG](deployment-production.svg).
- [Nguồn UML PlantUML](deployment-production.puml).
- [Thuyết minh triển khai, giao thức/cổng và cấu hình](task3.2-deployment.md).
- [Bảng truy vết từng node về kiến trúc/code và đối chiếu tiêu chí](deployment-traceability.md).
- [Bằng chứng đối chiếu production và giới hạn kiểm tra](deployment-evidence.md).
- [Kiến trúc Task 3.1 và ADR](../../architecture/README.md).

Trạng thái kiểm tra ngày 16/11/2026: đủ nhóm thành phần trong mô hình source và đã có bảng truy vết. Điều kiện phản ánh production thực tế chưa được xác minh; không coi bản cấu hình repo là bằng chứng đã triển khai.

Kết xuất lại bằng PlantUML:

```bash
java -jar plantuml.jar -charset UTF-8 -tsvg docs/diagrams/task3.2/deployment-production.puml
```
