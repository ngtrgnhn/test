# Cấu hình nội dung — `public/config.json`

Bản v2.1 hiển thị thư, ảnh, quà trong không gian 3D quanh bánh. Không cuộn trang.
File config cũ vẫn dùng được: khóa mới bị thiếu tự nhận mặc định từ `src/config.ts`.

## Cập nhật

- Dev: lưu file, Vite đẩy nội dung qua websocket; poll dự phòng mỗi 1,5 giây.
- Đã deploy: trình duyệt đọc lại config mỗi 5 giây khi tab đang hiện; đọc lại khi
  quay về tab hoặc có mạng trở lại. Cần thay file trên host/deploy file mới.
- JSON hỏng khi đang xem: giữ nội dung hợp lệ trước đó.
- Lần đầu tải không được hoặc JSON hỏng: dùng bản chụp config hợp lệ lúc build,
  nếu không có thì dùng mặc định. Thay đổi nội dung không reset nghi thức.

## Các nhóm chính

| Nhóm | Nội dung |
| --- | --- |
| `recipient` | `name`, `nickname`, `age` (0–150); tuổi xuất hiện trên bánh/bóng số |
| `sender` | `name`, `signature`; người gửi và chữ ký thư |
| `event` | `kicker`, `title`, `date`, `place`, `time` |
| `letter` | `heading`, `body`, `wish`, `ps`; `ps` để rỗng được |
| `banner` | `text`, `sub`; biểu ngữ khi thổi nến xong |
| `cake` | `candles` (chuẩn hóa 1–12, thực tế mô hình 3–7), `flavor`, `topper` |
| `scene` | `garland` (tối đa 26 ký tự), `quality` luôn được chuẩn hóa thành `high` |
| `hints` | Chữ hướng dẫn theo `approach/blowing/blown/relight` |
| `ui` | Nhãn giao diện và các khóa mới cho không gian 3D |

Các chuỗi `ui.*` hỗ trợ `{name}`, `{nickname}`, `{age}`, `{sender}`, `{date}`,
`{time}`, `{place}`, `{title}`, `{flavor}`, `{candles}`. Khóa ảnh/hộp quà có thêm `{n}`.

## Ảnh kỷ niệm

```json
"memories": [
  { "src": "photos/1.jpg", "caption": "Ngày vui đầu tiên" },
  { "src": "https://example.com/2.jpg", "caption": "Một buổi chiều" }
]
```

Chép ảnh nội bộ vào `public/photos/`. Đường dẫn tương đối hỗ trợ host ở thư mục con.
Mảng rỗng ẩn vật thể ảnh và nút ảnh. Ảnh chỉ tải khi mở mục ảnh; khi lỗi có nút thử lại.
Vuốt ngang, nhấn ‹ ›/chấm, hoặc dùng phím ← → để lật hai mặt từng tấm ảnh.
Hai ảnh lân cận được tải trước sau khi mở để giảm thời gian chờ.

## Quà

```json
"gifts": [
  { "title": "Trà sữa", "message": "Một chầu trà sữa tớ mời!" },
  { "title": "Xem phim", "message": "Chọn phim mà cậu thích nhé." },
  { "title": "Một cái ôm", "message": "Dùng bất cứ lúc nào." }
]
```

Hiện tối đa ba hộp để chọn. Phần thưởng được chọn ngẫu nhiên từ toàn bộ danh sách
khi nhấn một hộp, không phụ thuộc số thứ tự hộp. Kết quả được giữ trên trình duyệt
cho tổ hợp người nhận/ngày/danh sách quà. Thay nội dung quà, tên hoặc ngày tạo khóa
mới. Xóa localStorage, dùng trình duyệt khác hoặc chặn lưu trữ có thể chọn lại;
không có máy chủ để ràng buộc người nhận. Mảng rỗng ẩn quà.

## Nhãn mới

| Khóa `ui` | Ý nghĩa |
| --- | --- |
| `roomLetter`, `roomMemories`, `roomGifts` | Nhãn vật thể và nút tắt |
| `roomLetterSub`, `roomMemoriesSub`, `roomGiftsSub` | Dòng nhỏ dưới nhãn; ảnh hỗ trợ `{n}` |
| `roomUniverse` | Dòng nhỏ trên tên người nhận |
| `roomOrbitHint`, `roomClickHint` | Cách xoay/thu phóng và chọn vật thể |
| `roomReset`, `roomQuality` | Nút trả góc nhìn và nhãn chất lượng |
| `roomQualityHigh` | Nhãn chi tiết cao cố định; khóa Auto/Medium/Low cũ chỉ giữ tương thích |
| `roomCandleAction` | Nút thổi nến cho bàn phím |
| `roomClose`, `roomPanelBadge`, `roomPanelLoading` | Đóng, nhãn và trạng thái cửa sổ |
| `roomImageUnavailable`, `roomImageRetry`, `roomGalleryHint` | Trạng thái và hướng dẫn xem ảnh |
| `roomEmptyMemories`, `roomNoWebGL` | Thông báo khi không có ảnh/WebGL lỗi |

Các khóa `letterTitle`, `memoriesTitle`, `giftsTitle`, `giftsSub`, `giftBox`,
`giftOpening`, `giftChosen`, `giftNote`, `memoriesPrev/Next/Goto`, `pageTitle`
vẫn điều khiển các phần tương ứng. Những khóa của trang cuộn cũ được chấp nhận
để tương thích nhưng không tạo một trang cuộn trong bản v2.

## Đồ họa và debug

`scene.quality` luôn là `high`, không hạ chi tiết theo tốc độ hoặc loại thiết bị.
Các URL `?q=...` cũ không còn thay đổi chất lượng.
Thêm `?debug` để xem thông báo config và `window.__party`, `window.__quality`,
`window.__cakeXY()`, `window.__partyPerformance` (FPS/draw calls/triangles/DPR). Có thể thử `__party.setState({ phase: 'party' })`.
