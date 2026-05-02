// Chatbot Mia — Gemini 3 Flash + rule-based fallback
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Bạn là Mia, trợ lý ảo thông minh của ứng dụng thuê xe Mioto (Việt Nam).

NHIỆM VỤ: Hỗ trợ người dùng về mọi thắc mắc liên quan đến thuê xe tự lái.

THÔNG TIN VỀ MIOTO:
- Nền tảng thuê xe tự lái peer-to-peer tại Việt Nam
- Giá thuê: 500.000đ – 3.000.000đ/ngày tùy dòng xe
- Bảo hiểm thuê xe: khách chỉ bồi thường tối đa 2 triệu đồng/sự cố
- Thanh toán giữ chỗ: 40% qua thẻ, 60% còn lại trả chủ xe khi nhận xe
- Cần xác thực GPLX (KYC) trước khi đặt xe lần đầu
- Hủy trong 1h đầu: hoàn 100%; trước 7 ngày: hoàn 70%; trong 7 ngày: hoàn 50%
- Điểm thưởng: tích 1 điểm mỗi 10.000đ chi tiêu, 1 điểm = 1.000đ giảm giá
- Giới thiệu bạn bè: cả 2 nhận 50 điểm
- Hotline: 1800 6677 (miễn phí, 8h–22h)

PHONG CÁCH:
- Trả lời ngắn gọn, thân thiện, dùng tiếng Việt tự nhiên
- Dùng emoji vừa phải để tăng tính thân thiện
- Nếu câu hỏi KHÔNG liên quan đến thuê xe / di chuyển / Mioto, lịch sự từ chối và hướng về chủ đề thuê xe
- Không bịa thông tin, nếu không chắc thì hướng dẫn gọi hotline`;

const GEMINI_TIMEOUT_MS = 8000;

async function callGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          { role: 'user', parts: [{ text: message }] },
        ],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Rule-based fallback ──────────────────────────────────────────
const RULES = [
  {
    keywords: ['xin chào', 'chào', 'hello', 'hey'],
    reply: 'Xin chào! Mình là Mia 🌟, trợ lý ảo của Mioto. Mình có thể giúp bạn giải đáp mọi thắc mắc về thuê xe, thanh toán, bảo hiểm và nhiều hơn nữa!\n\nBạn cần hỗ trợ gì?',
  },
  {
    keywords: ['giá thuê', 'giá xe', 'bao nhiêu tiền', 'giá bao nhiêu', 'đơn giá', 'chi phí'],
    reply: 'Giá thuê xe trên Mioto dao động từ 500.000đ – 3.000.000đ/ngày tùy dòng xe:\n• Xe mini (4 chỗ): 500K – 900K/ngày\n• Xe sedan: 700K – 1.2M/ngày\n• Xe SUV: 1M – 2M/ngày\n• Xe MPV 7 chỗ: 1.2M – 2.5M/ngày',
  },
  {
    keywords: ['đặt xe', 'thuê xe', 'cách đặt', 'book xe'],
    reply: 'Để đặt xe trên Mioto:\n1️⃣ Tìm xe theo ngày & địa điểm\n2️⃣ Chọn xe, xem đánh giá\n3️⃣ Điền thông tin & chọn thẻ thanh toán\n4️⃣ Xác nhận OTP → hoàn tất!\n\n⚠️ Cần xác thực GPLX trước khi đặt lần đầu.',
  },
  {
    keywords: ['hủy', 'hoàn tiền', 'cancel'],
    reply: 'Chính sách hủy chuyến:\n• Trong vòng 1 giờ → Hoàn 100%\n• Trước 7 ngày → Hoàn 70%\n• Trong vòng 7 ngày → Hoàn 50%\n• Trong vòng 24 giờ → Không hoàn',
  },
  {
    keywords: ['bảo hiểm', 'tai nạn', 'sự cố'],
    reply: '🛡️ Bảo hiểm thuê xe Mioto:\n• Khách chỉ bồi thường tối đa 2.000.000đ/vụ\n• Bảo hiểm chi trả phần còn lại (tối đa 298 triệu)\n• Bảo hiểm thân thể lên đến 300 triệu/người\n• Miễn phí cứu hộ 70km/vụ',
  },
  {
    keywords: ['gplx', 'giấy phép', 'bằng lái', 'kyc', 'xác thực'],
    reply: 'Để thuê xe cần xác thực GPLX:\n1. Vào "Cá nhân" → "Giấy phép lái xe"\n2. Chụp mặt trước & sau GPLX\n3. Chờ duyệt 1-2 ngày làm việc\n\n✅ GPLX hạng B2 trở lên, còn hiệu lực.',
  },
  {
    keywords: ['thanh toán', 'thẻ', 'visa', 'mastercard'],
    reply: '💳 Thanh toán trên Mioto:\n• Giữ chỗ: 40% qua thẻ Visa/Mastercard/JCB\n• Nhận xe: 60% còn lại trả chủ xe (tiền mặt/chuyển khoản)',
  },
  {
    keywords: ['điểm thưởng', 'tích điểm', 'đổi điểm', 'reward'],
    reply: '⭐ Điểm thưởng Mioto:\n• Tích: 1 điểm / 10.000đ chi tiêu\n• Dùng: 1 điểm = 1.000đ giảm giá\n• Giới thiệu bạn: cả 2 nhận 50 điểm',
  },
  {
    keywords: ['giới thiệu', 'referral', 'mã mời'],
    reply: '🎁 Giới thiệu bạn bè:\n• Chia sẻ mã của bạn → bạn đăng ký\n• Cả 2 nhận 50 điểm = giảm 50.000đ chuyến sau\n\nXem mã tại: Cá nhân → Giới thiệu bạn bè.',
  },
  {
    keywords: ['liên hệ', 'hotline', 'hỗ trợ', 'tổng đài'],
    reply: '📞 Hỗ trợ Mioto:\n• Hotline: 1800 6677 (miễn phí, 8h–22h)\n• Chat trong app: Tab Tin nhắn → Mia\n• Email: support@mioto.vn',
  },
];

const DEFAULT_REPLY = 'Xin lỗi, Mia chưa hiểu câu hỏi của bạn 😅\n\nBạn có thể hỏi về:\n• Giá thuê xe\n• Cách đặt xe\n• Chính sách hủy\n• Bảo hiểm\n• Thanh toán & điểm thưởng\n\nHoặc gọi hotline 1800 6677!';

function stripDiacritics(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchKeyword(normalizedMsg, keyword) {
  if (!keyword.includes(' ')) {
    const re = new RegExp(`(^|\\s)${keyword}(\\s|$)`);
    return re.test(normalizedMsg);
  }
  return normalizedMsg.includes(keyword);
}

const NORMALIZED_RULES = RULES.map(rule => ({
  normalizedKeywords: rule.keywords.map(stripDiacritics),
  reply: rule.reply,
}));

function getRuleBasedReply(message) {
  const normalized = stripDiacritics(message);
  for (const rule of NORMALIZED_RULES) {
    if (rule.normalizedKeywords.some(kw => matchKeyword(normalized, kw))) {
      return rule.reply;
    }
  }
  return DEFAULT_REPLY;
}

// ─── Main export ─────────────────────────────────────────────────
async function getMiaReply(message) {
  // Thu Gemini truoc
  const aiReply = await callGemini(message);
  if (aiReply) return aiReply;

  // Fallback rule-based neu Gemini loi / chua set API key
  return getRuleBasedReply(message);
}

module.exports = { getMiaReply };
