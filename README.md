# hpbdtests — Tiệc sinh nhật 3D

Bản nâng cấp từ nhánh mặc định `3d-pink-eye-birthday-f254f` của
[ngtrgnhn/happybirthday](https://github.com/ngtrgnhn/happybirthday), tại commit
`0ee11ff16f52aca3d7fee0bbaf7b62ea8e9343e7`. Mã nguồn gốc giữ giấy phép Apache-2.0.

## Trải nghiệm

Mở phong bì, đọc thư và chạm con dấu trái tim để bước vào căn phòng tiệc hồng.
Không có trang cuộn: **thư, cụm ảnh và quà lơ lửng quanh bánh kem**.
Kéo chuột hoặc vuốt để xoay phòng 360°; cuộn chuột / chụm hai ngón để thu phóng.
Chạm vật thể để xem nội dung trong cửa sổ trên nền phòng 3D. Nút tắt bên dưới
cũng mở được nội dung bằng bàn phím. Nút ↺ trả về góc nhìn đầu.

- **Thư:** giấy viết tay, lời chúc và chữ ký lấy từ config.
- **Ảnh:** vuốt, nút ‹ ›, các chấm hoặc phím ← →; ảnh chỉ tải khi mở mục ảnh.
- **Quà:** chọn một trong tối đa ba hộp; phần thưởng ngẫu nhiên từ toàn bộ danh sách.
  Kết quả được giữ khi đóng/mở lại và lưu bằng localStorage cho cấu hình quà/người nhận đó.
  Đây là ghi nhớ trên trình duyệt, không phải kiểm soát danh tính ở máy chủ. Chặn lưu trữ
  vẫn chơi được trong lần truy cập hiện tại.
- **Bánh kem:** nhấn để cô bé tới cầu nguyện, nhấn lần nữa để thổi, nhấn để thắp lại.
  Camera tự chuyển góc khi làm nghi thức rồi trở về góc người xem đã chọn.
  Kéo xoay hoặc chụm hai ngón không kích hoạt nhầm vật thể.
- Cửa sổ nội dung hỗ trợ Escape, khóa focus và trả focus khi đóng. Nếu WebGL lỗi,
  thư/ảnh/quà vẫn đọc được qua thanh nút; nghi thức nến không được kích hoạt.

## Chạy và kiểm tra

Dùng Node.js 22+ và npm:

```bash
npm ci
npm run dev          # http://localhost:3000
npm run check        # TypeScript + regression tests + production build
npm run preview      # xem dist sau khi build
```

`npm run build` tạo `dist/`. Có thể đưa nguyên thư mục này lên Vercel hoặc host tĩnh.
`base: './'` hỗ trợ deploy ở thư mục con; đừng mở index.html bằng file://.
Font chữ Google và ảnh được cấu hình bằng URL vẫn cần mạng; các mô hình/texture 3D
được tạo trong mã nguồn, không tải GLB/HDR bên ngoài.

## Nội dung

Sửa **`public/config.json`**. Hướng dẫn: [public/README_CONFIG.md](public/README_CONFIG.md).
Dev cập nhật bằng websocket và kiểm tra lại mỗi 1,5 giây. Bản đã deploy kiểm tra
mỗi 5 giây khi tab hiện; thay file trên host hoặc deploy bản config mới để cập nhật.
JSON hỏng khi đang mở giữ cấu hình cũ; lần tải đầu hỏng dùng bản chụp lúc build.

## Đồ họa và hiệu năng

- OrbitControls được giới hạn cao độ/zoom để tránh xuyên sàn và lật camera.
- Các vật thể thư/ảnh/quà có mô hình riêng, chuyển động lơ lửng và nhãn vẽ lên texture.
  Bánh có nhiều hoa kem hơn ở mức high; váy nhân vật có nếp gấp hình học.
- Các cụm tĩnh được gộp theo vật liệu: thân hộp quà, cupcake, lọ hoa, bàn.
  Đồ trong Pop vẫn giữ hoạt cảnh xuất hiện; các phần đang chuyển động không bị gộp.
- 14 quả dâu và 14 đài lá dùng hai instanced mesh thay cho 28 mesh riêng.
- Khung hình dừng khi mở nội dung hoặc ẩn tab; ảnh và mã cửa sổ được tải trễ.
- Một bản đồ bóng ở 12 Hz khi xem phòng, 24 Hz khi làm nghi thức.
  Ba mức high/medium/low giữ bóng mềm và bloom theo khả năng thiết bị;
  hệ thống tự giảm chất lượng khi dưới ~27 fps, trừ khi đã ghim mức.
- Giới hạn DPR high 1,75; low tối đa 1. Texture nền/gradient dùng lại từ cache.
- Đã bỏ các thư viện và cảnh/trang cuộn không còn sử dụng.

Chọn chất lượng ở góc phải; `?q=high|medium|low` ưu tiên hơn lựa chọn cấu hình.
`prefers-reduced-motion` giảm chuyển động camera, hoạt cảnh xuất hiện và CSS.
Không cam kết FPS: hiệu năng GPU cần đo trên điện thoại/trình duyệt đích.

## Kiểm thử

Tám regression tests trong `tests/regressions.ts` kiểm tra máy trạng thái nến,
chặn hành động khi mở nội dung, trường hợp WebGL lỗi, phân biệt kéo/nhấn,
lưu quà, chuẩn hóa config, gộp hình học/bảo toàn tọa độ và loại trừ mesh trong suốt/instanced.

TypeScript, tests và production build đã được chạy. Phiên làm việc này chưa có
kiểm tra hình ảnh hoặc tương tác thực tế bằng trình duyệt; nên thử các bước
mở thư → xoay cả hai chiều → mở từng vật thể → đóng bằng Escape → thổi/thắp nến
trên cả desktop và điện thoại trước khi dùng chính thức.

## Cấu trúc

- `src/App.tsx`: canvas, dừng render, lớp nội dung và xử lý lỗi WebGL.
- `src/store.ts`: trạng thái nghi thức và cửa sổ đang mở.
- `src/scene/CameraRig.tsx`: orbit, chuyển góc nghi thức, khôi phục góc nhìn.
- `src/scene/FloatingKeepsakes.tsx`: vật thể thư/ảnh/quà lơ lửng.
- `src/scene/gesture.ts`: phân biệt click, drag và pinch.
- `src/scene/StaticBatch.tsx`: gộp các cụm hình học tĩnh.
- `src/scene/`: phòng, bánh, nhân vật, bóng bay, ánh sáng và hạt.
- `src/ui/RoomHud.tsx`: tiêu đề, nút tắt và chất lượng.
- `src/ui/RoomPanels.tsx`: thư, ảnh và quà trong dialog.
- `src/ui/giftReceipt.ts`: khóa và kiểm tra dữ liệu lưu quà.
