/* ---------------------------------------------------------------
   Minimal i18n.

   The English string *is* the key, so English needs no table and a
   missing translation degrades to English instead of showing a key.
   t('Show seconds')            -> "Show seconds" / "Hiện giây"
   t('Focus · round {n}', {n:2}) -> "Focus · round 2"
   --------------------------------------------------------------- */

export const LANGUAGES = [
  ['en', 'English'],
  ['vi', 'Tiếng Việt'],
];

const vi = {
  /* tabs */
  'Clock': 'Đồng hồ',
  'Look': 'Giao diện',
  'Music': 'Nhạc',
  'Tools': 'Công cụ',
  'Window': 'Cửa sổ',
  'About': 'Giới thiệu',
  'Face': 'Kiểu',
  'Theme': 'Chủ đề',
  'Settings': 'Cài đặt',
  'Close': 'Đóng',

  /* titlebar */
  'Keep on top': 'Luôn hiện trên cùng',
  'Full screen': 'Toàn màn hình',
  'Minimise': 'Thu nhỏ',
  'Maximise': 'Phóng to',
  'Hide to tray': 'Ẩn vào khay hệ thống',
  'Previous track': 'Bài trước',
  'Play / pause': 'Phát / tạm dừng',
  'Next track': 'Bài sau',

  /* clock tab */
  'Clock face': 'Kiểu đồng hồ',
  'Display': 'Hiển thị',
  '24-hour time': 'Định dạng 24 giờ',
  'Turn off for 12-hour AM/PM': 'Tắt để dùng 12 giờ AM/PM',
  'Show AM/PM': 'Hiện AM/PM',
  'Show seconds': 'Hiện giây',
  'Blinking colon': 'Dấu hai chấm nhấp nháy',
  'Separator between cards': 'Dấu ngăn giữa hai thẻ',
  'Classic Fliqlo has none': 'Fliqlo nguyên bản không có',
  'Show date': 'Hiện ngày tháng',
  'Date format': 'Định dạng ngày',
  'Date language': 'Ngôn ngữ ngày tháng',
  'Numbers on the dial': 'Hiện số trên mặt số',
  'Size': 'Kích thước',
  'Clock size': 'Cỡ đồng hồ',
  'Relative to the window': 'Tỉ lệ so với kích thước cửa sổ',
  'Language': 'Ngôn ngữ',
  'App language': 'Ngôn ngữ ứng dụng',
  'General': 'Chung',
  'System': 'Hệ thống',
  'Shortcuts': 'Phím tắt',
  'Keys': 'Phím tắt',
  'More options': 'Tuỳ chọn khác',
  'Delete': 'Xoá',
  'Focus': 'Tập trung',

  /* typography */
  'Typeface': 'Phông chữ',
  'Clock font': 'Font đồng hồ',
  'Custom font': 'Font tự chọn',
  'Type any font installed on this machine': 'Nhập tên font bất kỳ đã cài trên máy',
  'Custom…': 'Tự chọn…',
  'Weight': 'Độ đậm',
  'Auto': 'Tự động',
  'Thin': 'Mảnh',
  'Light': 'Nhẹ',
  'Regular': 'Thường',
  'Medium': 'Vừa',
  'Semibold': 'Đậm vừa',
  'Bold': 'Đậm',
  'Heavy': 'Rất đậm',

  /* custom theme */
  'Custom': 'Tự chọn',
  'Your colours': 'Màu của bạn',
  'Appearance': 'Kiểu nền',
  'Dark': 'Tối',
  'Accent': 'Màu nhấn',
  'Secondary accent': 'Màu nhấn phụ',
  'Text': 'Chữ',
  'Background top': 'Nền phía trên',
  'Background bottom': 'Nền phía dưới',
  'Card top': 'Thẻ phía trên',
  'Card bottom': 'Thẻ phía dưới',
  'Card digits': 'Số trên thẻ',
  'Copy from current look': 'Lấy màu từ giao diện hiện tại',
  'Copied into your custom theme': 'Đã chép vào chủ đề tự chọn',
  'Time zone': 'Múi giờ',
  'Clock time zone': 'Múi giờ đồng hồ chính',
  'Follows the system by default': 'Mặc định theo máy',
  'System default': 'Theo hệ thống',
  'Same as app language': 'Theo ngôn ngữ ứng dụng',

  /* weekdays (short) */
  'Sun': 'CN', 'Mon': 'T2', 'Tue': 'T3', 'Wed': 'T4', 'Thu': 'T5', 'Fri': 'T6', 'Sat': 'T7',

  /* city names in the time-zone lists */
  'Ho Chi Minh City': 'Hồ Chí Minh',
  'Shanghai': 'Thượng Hải',
  'Tokyo': 'Tokyo',
  'Seoul': 'Seoul',
  'Moscow': 'Moscow',
  'London': 'London',
  'New York': 'New York',
  'Sydney': 'Sydney',

  /* look tab */
  'Themes': 'Chủ đề',
  'Liquid glass': 'Liquid glass',
  'Glass effect': 'Hiệu ứng kính',
  'Blurs and refracts whatever is behind the panels': 'Làm mờ và khúc xạ nền phía sau các panel',
  'Glass blur': 'Độ mờ kính',
  'Liquid ripple': 'Gợn sóng chất lỏng',
  'Adds a moving distortion to the glass (heavier on the GPU)': 'Thêm biến dạng động cho lớp kính (tốn GPU hơn)',
  'Accent glow on edges': 'Viền phát sáng theo màu nhấn',
  'Drifting colour blobs': 'Đốm màu chuyển động nền',
  'Background': 'Hình nền',
  'Background source': 'Nguồn nền',
  'From the theme': 'Theo chủ đề',
  'Custom gradient': 'Gradient tuỳ chỉnh',
  'Image from disk': 'Ảnh từ máy',
  'YouTube video': 'Video YouTube',
  'Wallpaper': 'Ảnh nền',
  'No image chosen': 'Chưa chọn ảnh',
  'Choose image…': 'Chọn ảnh…',
  'CSS gradient': 'CSS gradient',
  'Turn on "Video as wallpaper" in the Music tab and the playing video becomes the background.':
    'Bật "Dùng video làm nền" ở tab Nhạc, video YouTube đang phát sẽ thành hình nền động.',
  'Darken background': 'Làm tối nền',
  'Blur background': 'Làm mờ nền',

  /* music tab */
  'Music source': 'Nguồn nhạc',
  'Player': 'Trình phát',
  'Off': 'Tắt',
  'Status': 'Trạng thái',
  'Account connected': 'Đã kết nối tài khoản',
  'Not connected': 'Chưa kết nối',
  'Open {link} and create an app (it is free).': 'Mở {link} và tạo một app (miễn phí).',
  'Under Redirect URIs add exactly: {uri}': 'Trong Redirect URIs, thêm chính xác: {uri}',
  'Tick {api}, save, then copy the {id} into the field below.':
    'Chọn {api}, lưu lại, rồi copy {id} dán vào ô bên dưới.',
  'Client ID': 'Client ID',
  'Stored on this machine only, never sent anywhere else': 'Chỉ lưu trên máy bạn, không gửi đi đâu khác',
  'Connect account': 'Kết nối tài khoản',
  'Reconnect': 'Kết nối lại',
  'Connect': 'Kết nối',
  'Disconnect': 'Ngắt',
  'Your browser will open so you can sign in to Spotify': 'Trình duyệt sẽ mở ra để bạn đăng nhập Spotify',
  'Playback': 'Phát nhạc',
  'Play from a link': 'Phát từ link',
  'Paste a Spotify track or playlist link…': 'Dán link bài hát / playlist Spotify…',
  'Play': 'Phát',
  'Open Spotify': 'Mở Spotify',
  'Playback device': 'Thiết bị phát',
  'No active device': 'Chưa có thiết bị hoạt động',
  'Refresh': 'Làm mới',
  'In use': 'Đang dùng',
  'Switch': 'Chuyển',
  'active': 'đang phát',
  'Play/pause control needs Spotify Premium. Free accounts can still see what is playing.':
    'Điều khiển phát/tạm dừng cần tài khoản Premium. Tài khoản miễn phí vẫn xem được bài đang phát.',
  'Video or playlist link': 'Link video hoặc playlist',
  'Supports youtu.be, /watch?v=, /playlist?list=': 'Hỗ trợ youtu.be, /watch?v=, /playlist?list=',
  'Stop': 'Dừng',
  'Repeat when finished': 'Lặp lại khi hết bài',
  'Video as wallpaper': 'Dùng video làm hình nền',
  'Turns the playing video into a live background': 'Biến video đang phát thành hình nền động',
  'Volume': 'Âm lượng',
  'Some videos block embedding and will not play — try another link.':
    'Một số video bị chủ sở hữu chặn nhúng nên không phát được — hãy thử link khác.',

  /* tools tab */
  'Pomodoro': 'Pomodoro',
  'Start a focus session': 'Bắt đầu phiên tập trung',
  '{work} min work · {short} min break · long break every {rounds} rounds':
    '{work} phút làm việc · {short} phút nghỉ · nghỉ dài sau {rounds} hiệp',
  'Start': 'Bắt đầu',
  'Focus length': 'Thời gian tập trung',
  'Short break': 'Nghỉ ngắn',
  'Long break': 'Nghỉ dài',
  'Rounds before a long break': 'Số hiệp trước khi nghỉ dài',
  'Roll straight into the next session': 'Tự động chuyển sang phiên kế tiếp',
  'Chime when time is up': 'Chuông báo khi hết giờ',
  'Quick timer': 'Hẹn giờ nhanh',
  'Countdown': 'Đếm ngược',
  'Shows in the bottom-right corner': 'Hiện ở góc phải màn hình',
  'Alarms': 'Báo thức',
  'No alarms yet': 'Chưa có báo thức nào',
  'Add an alarm': 'Thêm báo thức',
  'Label (optional)': 'Nhãn (tuỳ chọn)',
  'Add': 'Thêm',
  'Every day': 'Mỗi ngày',
  'Chime volume': 'Âm lượng chuông',
  'Stopwatch': 'Bấm giờ',
  '{n} laps recorded': '{n} vòng đã ghi',
  'Pause': 'Dừng',
  'Run': 'Chạy',
  'Lap': 'Vòng',
  'Clear': 'Xoá',
  'Lap {n}': 'Vòng {n}',
  'World clocks': 'Đồng hồ thế giới',
  'Add a time zone to show it under the clock': 'Thêm múi giờ để hiện ngay dưới đồng hồ',

  /* window tab */
  'Let clicks pass through': 'Cho chuột xuyên qua',
  'Turns the clock into an overlay that never blocks you. Use a hotkey to turn it back off.':
    'Biến đồng hồ thành lớp phủ không chặn thao tác. Dùng phím tắt để tắt lại.',
  'Window opacity': 'Độ trong suốt cửa sổ',
  'Auto-hide the controls': 'Tự ẩn thanh điều khiển',
  'Hide when it loses focus': 'Ẩn khi mất tiêu điểm',
  'Keep the display awake': 'Ngăn màn hình tắt',
  'Handy when it sits on a desk': 'Hữu ích khi dùng như đồng hồ để bàn',
  'Startup': 'Khởi động',
  'Launch with Windows': 'Mở cùng Windows',
  'Start hidden in the tray': 'Khởi động ẩn dưới khay hệ thống',
  'Night & screen care': 'Ban đêm & bảo vệ màn hình',
  'Dim automatically at night': 'Tự giảm sáng ban đêm',
  'Between': 'Khoảng thời gian',
  'Night brightness': 'Độ sáng ban đêm',
  'Burn-in shift': 'Dịch chuyển chống lưu ảnh',
  'Drifts the clock slightly each minute to protect OLED panels':
    'Đồng hồ trôi nhẹ mỗi phút để bảo vệ màn hình OLED',
  'Global hotkeys': 'Phím tắt toàn cục',
  'Enable global hotkeys': 'Bật phím tắt toàn cục',
  'Global hotkeys': 'Phím tắt toàn cục',
  'Blurs and refracts what is behind the panels': 'Làm mờ và khúc xạ nền phía sau các panel',
  'Adds a moving distortion to the glass': 'Thêm biến dạng động cho lớp kính',
  'Hides the window buttons when the mouse rests': 'Ẩn các nút cửa sổ khi không di chuột',
  'Turns the clock into an overlay. Use a hotkey to turn it back off.':
    'Biến đồng hồ thành lớp phủ. Dùng phím tắt để tắt lại.',
  'Show / hide the clock': 'Hiện / ẩn đồng hồ',
  'Use Electron syntax: CommandOrControl, Alt, Shift, Super + key. Leave empty to unbind.':
    'Dùng cú pháp Electron: CommandOrControl, Alt, Shift, Super + phím. Để trống để bỏ gán.',

  /* about tab */
  'Version {v}': 'Phiên bản {v}',
  'Settings file': 'Tệp cài đặt',
  'In-app shortcuts': 'Phím tắt trong app',
  'Play / pause music': 'Phát / tạm dừng nhạc',
  'Open settings': 'Mở cài đặt',
  'Next theme': 'Chủ đề kế tiếp',
  'Next clock face': 'Kiểu đồng hồ kế tiếp',
  'Close panel / leave full screen': 'Đóng panel / thoát toàn màn hình',
  'Other': 'Khác',
  'Reset every setting': 'Đặt lại toàn bộ cài đặt',
  'Keeps the Spotify connection': 'Giữ nguyên kết nối Spotify',
  'Reset': 'Đặt lại',
  'Reset all options to their defaults?': 'Đặt lại mọi tuỳ chọn về mặc định?',
  'Quit the app': 'Thoát hẳn ứng dụng',
  'Closing the window only hides it in the tray': 'Đóng cửa sổ chỉ ẩn xuống khay hệ thống',
  'Quit': 'Thoát',

  /* runtime messages */
  'Welcome! The gear in the top right opens the settings.':
    'Chào mừng! Nhấn biểu tượng bánh răng ở góc trên bên phải để mở cài đặt.',
  'Settings reset': 'Đã đặt lại cài đặt',
  'Alarm added': 'Đã thêm báo thức',
  'Spotify disconnected': 'Đã ngắt kết nối Spotify',
  'Paste your Client ID first': 'Hãy dán Client ID trước',
  'Opening the browser to sign in to Spotify…': 'Đang mở trình duyệt để đăng nhập Spotify…',
  'Connected': 'Đã kết nối',
  'Connection failed': 'Kết nối thất bại',
  'Invalid Spotify link': 'Link Spotify không hợp lệ',
  'Invalid YouTube link': 'Link YouTube không hợp lệ',
  'Playing on Spotify': 'Đang phát trên Spotify',
  'Playback control needs Spotify Premium': 'Điều khiển phát nhạc cần Spotify Premium',
  'No active device. Open Spotify on your phone or computer first.':
    'Chưa có thiết bị nào đang phát. Mở Spotify trên máy/điện thoại trước.',
  'Spotify error': 'Lỗi Spotify',
  'No device found. Open the Spotify app.': 'Không thấy thiết bị nào. Hãy mở app Spotify.',
  'This time zone is already listed': 'Múi giờ này đã có',
  'This video cannot be played outside YouTube. Try another link.':
    'Video này không cho phép phát ngoài YouTube. Hãy thử link khác.',
  'Could not load the YouTube API (offline?)': 'Không tải được YouTube API (mất kết nối mạng?)',
  'YouTube API timed out': 'YouTube API quá thời gian chờ',
  'Nothing playing': 'Không có bài nào đang phát',
  'No video selected': 'Chưa chọn video',
  'Time is up!': 'Hết giờ!',
  'Focus · round {n}': 'Tập trung · hiệp {n}',
  'Break': 'Nghỉ ngắn',
  'Long rest': 'Nghỉ dài',
  'Timer': 'Hẹn giờ',
  'Ready': 'Sẵn sàng',
  'Round done — take a long break!': 'Xong một chu kỳ — nghỉ dài nhé!',
  'Focus time is up — take a break!': 'Hết giờ tập trung — nghỉ chút đi!',
  'Back to focus 💪': 'Quay lại tập trung nào 💪',
  'Skip': 'Bỏ qua',
  'Resume': 'Tiếp tục',
  'Alarm': 'Báo thức',
  'same time': 'cùng giờ',

  /* clock face internals */
  'HOURS': 'GIỜ',
  'MINUTES': 'PHÚT',
  'SECONDS': 'GIÂY',
  'hour': 'giờ',
  'min': 'phút',
};

const TABLES = { vi };
let current = 'en';

export function setLanguage(lang) {
  current = TABLES[lang] ? lang : 'en';
}

export function getLanguage() {
  return current;
}

/** Date/number locale that matches the UI language when the user picked "auto". */
export function localeFor(lang = current) {
  return lang === 'vi' ? 'vi-VN' : 'en-US';
}

export function t(text, vars) {
  let out = TABLES[current]?.[text] ?? text;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}
