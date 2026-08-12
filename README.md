# Ora Clock

Đồng hồ để bàn cho Windows/macOS/Linux, viết bằng Electron. Mở app lên là thấy ngay
đồng hồ lật kiểu **Fliqlo**, đổi được nhiều kiểu mặt đồng hồ và chủ đề, có hiệu ứng
**liquid glass**, và phát nhạc từ **Spotify** hoặc **YouTube**.

![Fliqlo](assets/icon.png)

## Chạy thử

```bash
npm install
```

```bash
npm start
```

Đóng gói bản cài đặt cho Windows (NSIS + portable):

```bash
npm run dist
```

## Tính năng

**Mặt đồng hồ** — chuyển nhanh bằng phím `C`
| Kiểu | Mô tả |
| --- | --- |
| Flip | Đồng hồ lật kiểu Fliqlo (mặc định) — 12 giờ, AM/PM ở góc thẻ, lật 3D |
| Digital | Số lớn mảnh, tuỳ chọn giây và AM/PM |
| Analog | Mặt kim SVG, kim giây chạy mượt |
| Rings | Ba vòng cung giờ / phút / giây |
| Word | Lưới chữ kiểu "IT IS A QUARTER PAST TWO" |
| Binary | Đồng hồ nhị phân BCD |

**Giao diện**
- Mặc định là **Obsidian** — nền đen tuyền, thẻ lật đen, AM/PM ở góc thẻ giờ,
  không dấu hai chấm, font Helvetica Neue/Arial Bold: đúng như Fliqlo nguyên bản.
- 16 chủ đề dựng sẵn (Obsidian, Midnight, Nord, Dracula, Tokyo, Catppuccin, Sunset,
  Forest, Ocean, Sakura, Cyber, Mocha, Paper, Linen, Daylight) + **Custom**: tự chọn
  9 màu riêng (nhấn, chữ, nền trên/dưới, thẻ trên/dưới, số trên thẻ, sáng/tối), có nút
  lấy màu từ giao diện đang dùng làm điểm khởi đầu.
- **Font đồng hồ**: 7 bộ dựng sẵn (Fliqlo Classic, Apple SF Pro, Rounded, Condensed,
  Monospace, Serif, Display) hoặc gõ tên bất kỳ font nào đã cài — app tự liệt kê font
  của máy để gợi ý. Chỉnh được cả độ đậm.
- Liquid glass: làm mờ nền + viền khúc xạ + vệt sáng bám theo con trỏ, tuỳ chọn lớp
  gợn sóng động. Trên Windows 11 dùng luôn nền Acrylic của hệ điều hành.
- Hình nền: theo chủ đề, gradient tự nhập, ảnh từ máy, hoặc video YouTube đang phát.
- Giao diện kiểu Apple: đèn giao thông đỏ/vàng/xanh, thanh tab dạng segmented control,
  bảng cài đặt nhóm thành thẻ bo góc có đường kẻ mảnh như macOS System Settings.
- Responsive: từ 1180×740 xuống 380×300, panel tự chuyển thành bottom sheet, dock thu
  còn biểu tượng, thanh nhạc xếp chồng phía trên dock.
- Ngôn ngữ giao diện: **English** (mặc định) hoặc Tiếng Việt, đổi trong `System → General`.

**Nhạc**
- **Spotify** — kết nối bằng OAuth PKCE (không cần client secret). Xem bài đang phát,
  play/pause, chuyển bài, tua, chỉnh âm lượng, đổi thiết bị phát, dán link
  bài hát/playlist để phát. *Điều khiển phát cần tài khoản Premium; tài khoản
  miễn phí vẫn xem được bài đang phát.*
- **YouTube** — dán link video hoặc playlist để phát (chỉ tiếng, hoặc dùng luôn video
  làm hình nền động). Nhớ link cuối cùng khi mở lại app.

**Công cụ**
- Pomodoro: tuỳ chỉnh thời gian làm việc/nghỉ, tự chuyển phiên, chuông báo.
- Hẹn giờ đếm ngược nhanh (5–45 phút) và bấm giờ có ghi vòng.
- Báo thức lặp theo thứ trong tuần.
- Đồng hồ thế giới: thêm nhiều múi giờ hiện ngay dưới đồng hồ chính.

**Cửa sổ**
- Luôn hiện trên cùng, chỉnh độ trong suốt, cho chuột xuyên qua (overlay).
- Tự ẩn thanh điều khiển, ẩn khi mất tiêu điểm, ngăn màn hình tắt.
- Mở cùng Windows, khởi động ẩn dưới khay hệ thống, biểu tượng khay.
- Tự giảm sáng ban đêm theo khung giờ, dịch chuyển chống lưu ảnh cho màn OLED.
- Phím tắt toàn cục tuỳ chỉnh (hiện/ẩn, toàn màn hình, điều khiển nhạc).

## Phím tắt trong app

| Phím | Tác dụng |
| --- | --- |
| `Space` | Phát / tạm dừng nhạc |
| `F` / `F11` | Toàn màn hình |
| `S` | Mở / đóng bảng cài đặt |
| `T` | Chủ đề kế tiếp |
| `C` | Kiểu đồng hồ kế tiếp |
| `Ctrl` + `T` | Bật/tắt luôn hiện trên cùng |
| `Esc` | Đóng bảng cài đặt / thoát toàn màn hình |

## Kết nối Spotify

1. Mở <https://developer.spotify.com/dashboard> và tạo một app (miễn phí).
2. Trong **Redirect URIs**, thêm chính xác: `http://127.0.0.1:8888/callback`
3. Chọn **Web API**, lưu lại, copy **Client ID**.
4. Trong Ora Clock: `Settings → Music → Spotify`, dán Client ID rồi bấm **Connect**.

Client ID và refresh token chỉ lưu trong `settings.json` trên máy bạn. App không có
client secret và không gửi dữ liệu đi đâu ngoài Spotify.

## Cấu trúc mã nguồn

```
src/
  main/
    main.js      cửa sổ, khay hệ thống, phím tắt toàn cục, IPC
    server.js    server loopback phục vụ giao diện (cần origin http cho YouTube)
    fonts.js     liệt kê font đã cài trên máy
    store.js     đọc/ghi settings.json
    spotify.js   OAuth PKCE + proxy Web API
    preload.js   cầu nối contextBridge
  renderer/
    css/         base · themes · glass · clocks · panel
    js/
      app.js     vòng lặp vẽ, áp dụng cài đặt, phím tắt
      faces.js   6 mặt đồng hồ
      panel.js   bảng cài đặt (khai báo theo tab)
      fonts.js   các bộ font dựng sẵn cho đồng hồ
      i18n.js    bảng dịch en/vi (chuỗi tiếng Anh chính là khoá)
      spotify.js · youtube.js   trình phát
      tools.js   pomodoro · báo thức · bấm giờ
tools/make-icon.js   sinh assets/icon.png không cần thư viện ngoài
```

Cài đặt lưu tại `%APPDATA%\Ora Clock\settings.json` (Windows).

## Ghi chú kỹ thuật

- Giao diện được phục vụ qua `http://127.0.0.1:<port ngẫu nhiên>` thay vì `file://`
  vì YouTube IFrame API không hoàn tất bắt tay postMessage từ origin `file://`.
  Server chỉ lắng nghe trên loopback; ảnh nền người dùng chọn đi qua route `/local`
  có token phiên.
- Kích thước đồng hồ được đo trực tiếp từ DOM rồi co giãn vừa cửa sổ, nên mọi mặt
  đồng hồ đều lấp đầy khung ở mọi kích thước cửa sổ.
- `npm run dev` chuyển log của renderer ra terminal.
- `npm run selftest` mở lần lượt mọi tab cài đặt, mọi mặt đồng hồ, mọi chủ đề và font
  (`[selftest] ok`), rồi thu nhỏ cửa sổ qua 6 kích thước để kiểm tra không có thành
  phần nào tràn ra ngoài hay chồng lên nhau (`[responsive] ok`).
