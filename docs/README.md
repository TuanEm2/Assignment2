# BrewLite — Tài liệu Assignment 2

## Task 1.2 — Use case tổng quát

Bộ tài liệu của TV6 được đặt trong `requirements/task-1.2/`:

- [Thuyết minh](requirements/task-1.2/use-case-overview.md).
- [Nguồn PlantUML](requirements/task-1.2/use-case-overview.puml).
- [Sơ đồ SVG](requirements/task-1.2/use-case-overview.svg).
- [Sơ đồ PNG](requirements/task-1.2/use-case-overview.png).

## Task 2.2 — Sequence đặt hàng và thanh toán

Bộ tài liệu của TV6 được đặt trong `diagrams/task-2.2/`:

- [Thuyết minh](diagrams/task-2.2/sequence-checkout-thuyet-minh.md).
- [Nguồn PlantUML](diagrams/task-2.2/sequence-checkout-full.puml).
- [Sơ đồ SVG](diagrams/task-2.2/sequence-checkout-full.svg).
- [Sơ đồ PNG](diagrams/task-2.2/sequence-checkout-full.png).

## Task 3 — Kiến trúc và deployment

- [Task 3.1 — Kiến trúc và ADR](architecture/README.md).
- [Task 3.2 — Deployment diagram, nguồn UML và kiểm tra tiêu chí](diagrams/task3.2/README.md).

## Ma trận truy vết

[traceability-matrix.md](traceability-matrix.md) đối chiếu yêu cầu, UML, code và kiểm thử theo báo cáo của TV6. Các đường dẫn sơ đồ được cập nhật cho cấu trúc hiện tại. Phạm vi và nguồn số liệu kiểm thử được ghi ở đầu matrix.

## Vị trí trong cây thư mục

```text
docs/
├── architecture/
│   ├── task3.1-architecture.md
│   └── adr/
├── requirements/
│   └── task-1.2/
│       ├── use-case-overview.md
│       ├── use-case-overview.puml
│       ├── use-case-overview.svg
│       └── use-case-overview.png
├── diagrams/
│   ├── task-2.2/
│   │   ├── sequence-checkout-thuyet-minh.md
│   │   ├── sequence-checkout-full.puml
│   │   ├── sequence-checkout-full.svg
│   │   └── sequence-checkout-full.png
│   └── task3.2/
│       ├── README.md
│       ├── task3.2-deployment.md
│       ├── deployment-traceability.md
│       ├── deployment-evidence.md
│       ├── deployment-production.puml
│       └── deployment-production.svg
└── traceability-matrix.md
```

Cây trên liệt kê các bộ tài liệu được liên kết tại trang này, không liệt kê toàn bộ tài liệu của nhóm. Task 1.2/2.2 và matrix được đồng bộ từ nguồn TV6; Task 3 được tách thành kiến trúc/ADR trong `architecture/` và bộ deployment trong `diagrams/task3.2/`.
