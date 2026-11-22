# Cây thông Noel 3D

Cây thông Noel 3D chạy trên trình duyệt, điều khiển bằng **cử chỉ tay qua webcam**. Xoè tay thì lá cây, quả cầu, hộp quà, bóng đèn bay tán loạn khắp không gian; nắm tay thì chúng xoáy về tụ lại thành cây, ngôi sao trên ngọn loé sáng toả một vòng hạt lấp lánh, giữa trời đêm có trăng, cực quang và sao băng, quà xếp quanh gốc. Bạn có thể đổi bảng màu, treo ảnh của mình lên cây như ảnh Polaroid, bật nhạc Jingle Bells cho đèn nháy theo nhịp, bắn pháo hoa và gửi lời chúc có tên người nhận.

| Xoè tay: tán loạn | Nắm tay: thành cây |
| --- | --- |
| <img src="docs/tree-chaos.jpg" alt="Lá cây, quả cầu, hộp quà bay tán loạn dưới dải cực quang" width="400" /> | <img src="docs/tree-formed.jpg" alt="Cây thông đã thành hình với kim tuyến và ngôi sao sáng, quà xếp quanh gốc" width="400" /> |

## Cách chạy

1. **Cài Node.js** bản LTS từ [nodejs.org](https://nodejs.org/) (cần bản 20.19 trở lên).
2. **Cài pnpm** (chỉ làm lần đầu). Mở Terminal bất kỳ và chạy:

   ```
   npm install -g pnpm
   ```

3. **Mở Terminal** trong thư mục `christmas-tree-3d` (Windows: chuột phải vào thư mục → **Open in Terminal**).
4. **Cài thư viện** (chỉ làm lần đầu):

   ```
   pnpm install
   ```

5. **Chạy:**

   ```
   pnpm dev
   ```

6. Mở trình duyệt (nên dùng Chrome hoặc Edge) vào **http://localhost:5173** và bấm **Cho phép** khi được hỏi quyền camera.

Lần đầu mở trang cần Internet để tải model nhận diện tay, nên màn hình có thể đen vài giây.

## Cách dùng

**Bằng chuột**

| Thao tác | Kết quả |
| --- | --- |
| Kéo chuột | Xoay quanh cây |
| Cuộn chuột | Phóng to / thu nhỏ |
| Nhấp đúp | Chuyển qua lại giữa tán loạn và thành cây |
| Nút hình tấm ảnh (góc dưới phải) | Chọn ảnh trong máy để treo lên cây |
| Nút hình nốt nhạc | Bật/tắt nhạc Jingle Bells; đèn trên cây nháy theo từng nốt, ngôi sao sáng bừng theo phách |
| Nút hình máy quay (debug) | Hiện hình camera (kéo thả về 4 góc được), khung xương bàn tay, tên cử chỉ máy đang thấy và chỉ số FPS, RAM |

**Bằng bàn phím**

| Phím | Kết quả |
| --- | --- |
| ← / → | Xoay cây sang trái / phải |
| F | Bắn pháo hoa |
| M | Bật/tắt nhạc |

**Bằng cử chỉ tay** (đưa cả bàn tay vào khung hình camera)

| Cử chỉ | Kết quả |
| --- | --- |
| ✋ Xoè tay | Lá cây và đồ trang trí bay tán loạn |
| ✊ Nắm tay | Xoáy về tụ lại thành cây, ngôi sao loé sáng, camera nhích lại gần; hộp quà xếp quanh gốc |
| 👍 Giơ ngón cái | Đổi bảng màu: Giáng sinh (xanh thông, đỏ, vàng) → hồng phấn → tím → xanh băng |
| ✌️ Giơ hai ngón | Bắn một loạt pháo hoa; giữ nguyên thì cứ 1,5 giây bắn thêm một loạt |
| 🤏 Chụm ngón cái và ngón trỏ | Phóng to một tấm ảnh (hậu cảnh mờ đi); thả tay để ảnh về chỗ cũ. Mỗi lần chụm lại ra một tấm khác. Tay gần hay xa camera đều nhận như nhau |

**Gửi lời chúc:** thêm `?to=` và tên người nhận vào cuối đường link, ví dụ `http://localhost:5173/?to=Lan`. Khi cây thành hình, dòng chữ "Merry Christmas, Lan" sẽ hiện lên từng chữ. Không có `?to=` thì chỉ hiện "Merry Christmas".

## Gặp lỗi?

| Lỗi | Cách sửa |
| --- | --- |
| `pnpm` không được nhận dạng | Làm lại bước 2, rồi đóng và mở lại Terminal |
| `ERR_PNPM_IGNORED_BUILDS` khi cài | Chạy `pnpm approve-builds`, chọn gói được liệt kê, rồi `pnpm install` lại |
| Màn hình đen rất lâu | Kiểm tra kết nối Internet, rồi tải lại trang |
| Dòng trạng thái báo đỏ `Camera permission denied` | Bấm biểu tượng camera / ổ khoá trên thanh địa chỉ → cho phép camera → tải lại trang |
| `No camera found` | Cắm webcam vào máy |
| `Camera in use by another app` | Tắt các ứng dụng đang dùng camera (Zoom, Meet, OBS...) |
| Cử chỉ không ăn | Bật nút máy quay (debug) để xem máy đang thấy gì; ngồi chỗ đủ sáng, cách camera khoảng 0,5–1 m |
| Mở thẳng file `dist/index.html` bị trắng trang | Bản build phải chạy qua server: dùng `pnpm preview` |

## Quyền riêng tư

Thư viện nhận diện tay `@mediapipe/tasks-vision` (từ bản 1.x) tự gửi thống kê sử dụng về Google tại `odml.pa.googleapis.com` và chưa có cách tắt. Nếu đưa app lên mạng cho người khác dùng, bạn nên báo trước cho họ (xem [Privacy Notice của MediaPipe](https://www.npmjs.com/package/@mediapipe/tasks-vision)). Muốn tránh hoàn toàn thì đổi sang bản `0.10.35` trong `package.json`; đường dẫn file WASM tự đổi theo.

## Kỹ thuật

Viết bằng React 19 + TypeScript 7, dựng cảnh 3D bằng Three.js thông qua **React Three Fiber** (dùng React để mô tả cảnh 3D), build bằng Vite 8.

- **Hai trạng thái CHAOS / FORMED:** mỗi món trang trí nhớ hai vị trí, một chỗ ngẫu nhiên trong không gian và một chỗ trên cây (hộp quà thì là một chỗ trên mặt đất quanh gốc). Mỗi khung hình, nó tiến dần về vị trí đích bằng *damping* (càng gần đích càng chậm lại), nên chuyển cảnh luôn mượt dù máy nhanh hay chậm. Khi tụ về cây, mọi thứ còn xoáy quanh thân cây nên bay theo đường xoắn ốc.
- **Khoảnh khắc thành hình:** lúc cây vừa tụ đủ, ngôi sao loé sáng kèm quầng sáng, một vòng hạt toả ra từ ngọn, nền tuyết ửng sáng và camera nhích lại gần rồi lùi về. Mở trang, camera lượn từ trên cao xuống như cảnh mở đầu phim; chạm chuột là dừng.
- **70.000 lá kim chạy trên GPU:** lá mọc dọc theo 230 cành, mỗi cành xoè ra như một cái quạt có các nhánh con chĩa chéo kiểu xương cá, nên tán cây có cành, có khe hở như cây thật. Cả hai vị trí của từng lá được nạp sẵn vào card đồ hoạ, *shader* (chương trình nhỏ chạy trên GPU, viết bằng GLSL) tự trộn giữa hai vị trí, vẽ mỗi hạt thành một lá kim và tô tối ở trong tán, sáng ở đầu cành. Lá quanh mỗi bóng đèn còn ửng theo màu đèn (màu đèn được ghi vào một texture nhỏ mỗi khung hình để shader đọc).
- **Instancing:** 70 quả cầu, 34 hộp quà (kèm bóng đổ mềm), 220 bóng đèn, cùng gậy kẹo, chuông, sao nhỏ và dây kim tuyến quấn quanh cây đều được vẽ bằng *InstancedMesh*, tức vẽ hàng trăm bản sao của cùng một hình chỉ trong một lần gọi GPU (*draw call*).
- **Ảnh Polaroid:** mỗi ảnh có một chỗ treo cố định bên ngoài tán lá, mặt hướng ra ngoài, treo bằng một sợi dây vàng; ảnh không vuông được cắt lấy phần giữa cho vừa khung. Mỗi lần chụm tay phóng to một ảnh chưa xem.
- **Khung cảnh:** bầu trời đêm chuyển màu theo theme, mặt trăng, dải cực quang uốn lượn, sao băng thỉnh thoảng vụt qua, đồi tuyết phía xa, nền tuyết hắt sáng quanh gốc có bụi tuyết lấp lánh, tuyết rơi (cũng chạy trên GPU) và vài bông tuyết nhoè sát ống kính. Đổi theme thì màu trời, đất, cực quang chuyển dần chứ không đổi phắt.
- **Nhận diện cử chỉ:** MediaPipe Gesture Recognizer chạy ngay trong trình duyệt bằng *WebAssembly* (mã biên dịch chạy gần nhanh như ứng dụng cài trên máy). Nó trả về 21 điểm mốc trên bàn tay; app tự tính thêm cử chỉ chụm tay theo tỉ lệ khoảng cách đầu ngón cái – ngón trỏ so với cỡ lòng bàn tay, có hai ngưỡng vào/ra và lọc vài khung hình hụt để ảnh không nhảy khi tay run.
- **Nhạc tự tổng hợp:** không dùng file nhạc; "Jingle Bells" (bài hát năm 1857, đã thuộc phạm vi công cộng) được chơi bằng Web Audio, gồm tiếng chuông cho giai điệu, bè trầm và tiếng lục lạc. App tự lên lịch từng nốt nên biết chính xác lúc nốt vang lên, đèn trên cây nháy khớp với tai nghe.
- **Pháo hoa trên GPU:** mỗi quả là vài trăm hạt; chỉ ghi vị trí, vận tốc, màu một lần lúc bắn, còn đường bay lên, nổ tung, rơi và tắt dần đều do shader tính.
- **Hậu kỳ:** *Bloom* làm các vùng sáng toả quầng ra xung quanh (đèn, ngôi sao) nhưng bỏ qua ảnh Polaroid; *Depth of field* làm mờ hậu cảnh khi đang phóng to ảnh; *Vignette* làm tối dần về các góc màn hình; *tone mapping* nén vùng quá sáng lại để không bị cháy trắng; một lớp hạt nhiễu rất nhẹ xoá các dải sọc màu ở vùng trời tối.

**Muốn chỉnh?**

| Muốn đổi | Sửa ở |
| --- | --- |
| Số lá, quả cầu, đèn, hộp quà, gậy kẹo, chuông, sao nhỏ; kích thước cây | `src/constants/config.ts` |
| Bảng màu các theme (gồm màu trời, nền tuyết, cực quang) | `src/constants/themes.ts` |
| Dáng cây (số cành, cách xếp cành, độ rủ) | `src/utils/treePositions.ts` |
| Hình dáng và màu của lá | `src/shaders/FoliageMaterial.ts` |
| Nền trời, trăng, cực quang, sao băng, tuyết rơi, camera, độ sáng và Bloom | `src/components/3d/scene/` |
| Kích thước, độ sáng của ảnh Polaroid | `src/components/3d/photos/` |
| Ngưỡng nhận diện cử chỉ | `src/gesture/handGestures.ts` |
| Bài nhạc, nhịp độ, âm lượng | `src/audio/jingleBells.ts`, `src/audio/music.ts` |
| Pháo hoa (số hạt, độ cao, tốc độ nổ) | `src/components/3d/scene/Fireworks.tsx` |

**Cấu trúc thư mục**

```
src/
├── App.tsx                 # Ghép mọi thứ lại: cảnh 3D, nhận diện tay, thanh nút
├── components/
│   ├── 3d/                 # Cảnh 3D: lá, quả cầu, đồ trang trí, kim tuyến, đèn, hộp quà, ngôi sao, thân cây, ảnh
│   │   ├── photos/         # Ảnh Polaroid: treo lên cây, chọn ảnh để phóng to
│   │   ├── scene/          # Camera, ánh sáng, bầu trời, trăng, cực quang, đồi, tuyết, pháo hoa, hậu kỳ
│   │   └── shared/         # Chuyển động tán loạn ↔ thành cây, thời điểm thành hình, ánh đèn hắt lên lá
│   ├── UI/                 # Các nút, lời chúc, bảng chỉ số, icon, dòng trạng thái
│   └── GestureController.tsx
├── audio/                  # Nhạc nền tự tổng hợp (Web Audio) + nhịp cho đèn nháy
├── gesture/                # Camera + MediaPipe → cập nhật store theo cử chỉ
├── store.ts                # Trạng thái dùng chung của app (zustand): theme, ảnh, zoom, nhạc...
├── constants/              # Cấu hình và bảng màu
├── shaders/                # Shader GLSL cho hạt lá
└── utils/                  # Hàm ngẫu nhiên, hình dạng cây và vị trí trên cây
```

Lệnh khác: `pnpm build` (kiểm tra kiểu + build vào `dist/`), `pnpm preview` (xem bản build), `pnpm typecheck` (chỉ kiểm tra kiểu).

## License

MIT, xem [LICENSE](LICENSE).
