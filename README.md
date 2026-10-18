# hpbdtests v2.1 — Tiệc sinh nhật 3D

Bản nâng cấp từ nhánh mặc định `3d-pink-eye-birthday-f254f` của
[ngtrgnhn/happybirthday](https://github.com/ngtrgnhn/happybirthday), tại commit
`0ee11ff16f52aca3d7fee0bbaf7b62ea8e9343e7`. Mã nguồn gốc giữ giấy phép Apache-2.0.

## Trải nghiệm

Mở phong bì, đọc thư và chạm con dấu trái tim để bước vào căn phòng tiệc hồng.
Không có trang cuộn: **thư, cụm ảnh và quà lơ lửng quanh bánh kem**.
Kéo chuột hoặc vuốt để xoay phòng 360°; cuộn chuột / chụm hai ngón để thu phóng.
Chạm vật thể để camera tiến lại trong 1,1 giây rồi nội dung mở dần. Khi đóng,
nội dung thu lại trước rồi camera trở về đúng vị trí, hướng nhìn và độ zoom cũ. Nút tắt bên dưới
cũng mở được nội dung bằng bàn phím. Nút ↺ trả về góc nhìn đầu.

- **Thư:** giấy viết tay, lời chúc và chữ ký lấy từ config.
- **Ảnh:** lật hai mặt trong không gian bằng vuốt, nút ‹ ›, các chấm hoặc phím ← →.
  Chỉ tải khi mở mục ảnh và tải trước hai ảnh lân cận; bấm liên tục vẫn giữ thứ tự lật.
- **Quà:** chọn một trong tối đa ba hộp; phần thưởng ngẫu nhiên từ toàn bộ danh sách.
  Kết quả được giữ khi đóng/mở lại và lưu bằng localStorage cho cấu hình quà/người nhận đó.
  Đây là ghi nhớ trên trình duyệt, không phải kiểm soát danh tính ở máy chủ. Chặn lưu trữ
  vẫn chơi được trong lần truy cập hiện tại.
- **Bánh kem:** nhấn để cô bé tới cầu nguyện, nhấn lần nữa để thổi, nhấn để thắp lại.
  Camera tự chuyển góc khi làm nghi thức rồi trở về góc người xem đã chọn.
  Kéo xoay hoặc chụm hai ngón không kích hoạt nhầm vật thể.
- Phong bì ban đầu che kín giấy khi đóng; nắp và túi thư chồng mép để tránh khe hở.
- Các nhãn hướng dẫn và nhãn vật thể là băng rôn đuôi én có nếp gấp và đường chỉ.
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
  Luôn bật toàn bộ hoa kem, nếp váy, hạt trang trí và hình học của mức high.
- Các cụm tĩnh được gộp theo vật liệu: thân hộp quà, cupcake, lọ hoa, bàn và cụm ảnh
  lơ lửng. Đồ trong Pop vẫn giữ hoạt cảnh xuất hiện; hình học không bị giảm số đỉnh.
- 14 quả dâu và 14 đài lá dùng hai instanced mesh thay cho 28 mesh riêng.
- Cảnh render với DPR tối đa 2 và MSAA 4 mẫu khi WebGL2 hỗ trợ. Bóng luôn 2048 px.
  Không tự hạ chất lượng, kể cả cấu hình cũ hoặc URL còn `q=low/medium/auto`.
- Chỉ cập nhật bóng ở 12 Hz khi xem phòng, 24 Hz khi làm nghi thức. Giới hạn
  GPU trình bày khoảng 60 khung hình/giây để tránh render dư trên màn hình 90–144 Hz.
  Mô hình, texture, số lượng hạt và độ phân giải cảnh giữ nguyên khi máy chậm.
- HDR dùng ACES và chỉ đổi màu đầu ra một lần. Bloom tách ánh sáng có màu khỏi
  vùng kem trắng; giảm nguồn sáng bánh, phản xạ studio và lớp sáng cộng giữa phòng.
  Quầng sáng dùng bộ đệm lọc nhỏ hơn, giữ độ phân giải của cảnh chính.
- Khung hình dừng khi nội dung đã mở hoặc ẩn tab; vẫn render khi camera đang zoom.
  Ảnh và mã cửa sổ được tải trễ. Texture nền/gradient dùng lại từ cache.

`prefers-reduced-motion` rút ngắn hiệu ứng camera/lật ảnh, giữ nguyên chi tiết.
Thêm `?debug` và xem `window.__partyPerformance` để đọc FPS trình bày, draw calls,
triangles, texture count và DPR. Đây là FPS trình duyệt, không phải GPU timer.
Mục tiêu 60 fps phụ thuộc GPU, màn hình và nhiệt độ thiết bị; chưa đo trên điện thoại thực.

## Kiểm thử

20 regression tests trong `tests/regressions.ts` kiểm tra nghi thức nến, chuyển
trạng thái zoom/mở/đóng/khôi phục, hủy zoom sớm, WebGL lỗi, lật ảnh và thao tác liên tục,
khóa chất lượng cao, nhịp trình bày 60 Hz, ngưỡng bloom, phong bì đóng, kéo/chạm,
lưu quà, chuẩn hóa config và gộp hình học.

`npm run check` đã qua: TypeScript, 20 tests và production build.
Chưa xác minh hình ảnh, biên dịch shader trên GPU hay tương tác bằng trình duyệt
trong môi trường này. Nên thử trên thiết bị đích: mở thư → xoay cả hai chiều → mở
thư/ảnh/quà → đóng bằng Escape → vuốt ảnh liên tục → thổi/thắp nến.

## Cấu trúc

- `src/App.tsx`: canvas, dừng render, lớp nội dung và xử lý lỗi WebGL.
- `src/store.ts`: trạng thái nghi thức và cửa sổ đang mở.
- `src/scene/CameraRig.tsx`: orbit, chuyển góc nghi thức, khôi phục góc nhìn.
- `src/scene/FloatingKeepsakes.tsx`: vật thể thư/ảnh/quà lơ lửng.
- `src/scene/gesture.ts`: phân biệt click, drag và pinch.
- `src/scene/StaticBatch.tsx`: gộp các cụm hình học tĩnh.
- `src/scene/`: phòng, bánh, nhân vật, bóng bay, ánh sáng và hạt.
- `src/ui/RoomHud.tsx`: tiêu đề, băng rôn, nút tắt và nhãn chi tiết cao.
- `src/ui/RoomPanels.tsx`: thư, ảnh và quà trong dialog.
- `src/ui/Gallery.tsx`, `photoFlip.ts`: ảnh hai mặt và hàng đợi lật ảnh.
- `src/scene/renderBudget.ts`: nhịp trình bày và shader tách bloom.
- `src/ui/giftReceipt.ts`: khóa và kiểm tra dữ liệu lưu quà.
