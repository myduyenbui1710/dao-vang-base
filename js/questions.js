// Danh mục câu hỏi (nguồn: Dinny - Sharing Base CRM, tab Game).
// a = chỉ số đáp án đúng (0=A, 1=B, 2=C, 3=D). Câu cuối cùng là câu "Đêm vàng" x2.
const QUESTIONS = [
  { id: '#3', topic: 'Lead 3.0', q: 'Trong app Lead, một lead là gì?',
    opts: ['Một người', 'Một công ty', 'Một lượt hỏi (một form, một danh thiếp, một dòng import)', 'Một thương vụ'], a: 2 },
  { id: '#8', topic: 'Chấm điểm Lead', q: 'Lead 3.0 chấm điểm lead trên hai trục nào?',
    opts: ['Budget × Timeline', 'Recency × Frequency', 'Engagement × Revenue', 'Fit × Intent'], a: 3 },
  { id: '#18', topic: 'Prospect 3.0 · Zalo OA', q: 'Với Zalo OA, sau tin nhắn cuối của khách, mình còn bao lâu để trả lời?',
    opts: ['24 giờ', '48 giờ', '7 ngày', 'Không giới hạn'], a: 1 },
  { id: 'BC', topic: 'Phân phối Lead', q: 'Đội sale được chia lead theo kiểu Broadcast. Ai trở thành người phụ trách lead?',
    opts: ['Người đứng đầu danh sách đội', 'Người đang ít lead nhất', 'Người bấm Claim đầu tiên', 'Trưởng nhóm'], a: 2 },
  { id: 'S1', topic: 'Sequences', q: 'Muốn Publish một sequence thì bắt buộc phải gắn thứ gì?',
    opts: ['Ruleset', 'Hộp thư gửi', 'Scorecard', 'Ít nhất 1 bước Call'], a: 0 },
  { id: 'PS', topic: 'Prospect Search', q: 'Trong Prospect Search, bước nào tốn credit?',
    opts: ['Tìm kiếm', 'Xem email, SĐT của người đó (Enrich)', 'Lưu vào danh sách', 'Convert sang lead'], a: 1 },
  { id: 'F2', topic: 'Chat Flow & AI Agent', q: 'Mặc định, khi một flow đang chạy trên hội thoại thì AI agent làm gì?',
    opts: ['Im lặng, nhường hội thoại cho flow', 'Trả lời song song với flow', 'Tự huỷ flow để trả lời', 'Chuyển hội thoại cho người'], a: 0 },
  { id: 'F4', topic: 'Chat Flow & AI Agent', q: 'Trường hợp nào nên dùng Flow thay vì AI agent?',
    opts: ['Khách hỏi câu mở, không đoán trước được', 'Nhân viên muốn dán nhanh một câu trả lời mẫu', 'Cần AI trả lời theo bảng giá trong AI Knowledge', 'Cần đúng thứ tự cố định: hỏi số đơn hoặc SĐT, rẽ nhánh, đổi stage, giao người'], a: 3 },
  { id: 'F7', topic: 'AI Handover', q: 'AI handover theo rule @Hùng, nhưng hội thoại đang do Lan phụ trách. Chuyện gì xảy ra?',
    opts: ['Không đổi gì, Lan vẫn giữ hội thoại', 'Chuyển sang Hùng', 'Cả Lan và Hùng cùng phụ trách', 'Báo lỗi handover'], a: 0 },
  { id: '#12', topic: 'Chấm điểm Lead', q: 'Mặc định, điểm Intent bắt đầu phai sau bao nhiêu ngày lead không có hoạt động?',
    opts: ['30 ngày', '45 ngày', '60 ngày', '90 ngày'], a: 1 },
];

// Luật chơi
const RULES = {
  START_BANK: 100,          // vàng khởi đầu trong Két
  DUR: { ready: 3, mine: 15, topic: 3, answer: 15 }, // giây
  MAX_TAPS_PER_SEC: 12,     // chống auto-click
  MAX_MINE: 6000,           // trần vàng đào/câu
  ROCK_CHANCE: 0.08, BIG_CHANCE: 0.07, ROCK_LOCK_MS: 1000,
  CORRECT_BONUS: 100,       // câu không cược (hoặc chọn Không cược): đúng +100, cộng thưởng tốc độ tối đa +100
  SPEED_BONUS: 0.5,         // thưởng tốc độ tối đa = 50% số cược
  LAST_MULT: 2,             // câu cuối: thắng x2, được cược cả Két
  BET_COUNT: 5,             // số câu có bước cược (câu cuối + 4 câu ngẫu nhiên)
};

const AVATARS = ['👷', '🤠', '🧙', '🥷', '🧑‍🚀', '🦊', '🐻', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐲', '🐧', '🐙'];
const OPT_LABELS = ['A', 'B', 'C', 'D'];
const OPT_SHAPES = ['▲', '◆', '●', '■'];
