// src/services/card.service.js
// FR-10: Lien ket the thanh toan.
// NFR bao mat: KHONG luu so the day du, CHI luu last4 + brand.
const prisma = require('../config/prisma');

function detectBrand(cardNumber) {
  const n = cardNumber.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^35/.test(n)) return 'jcb';
  if (/^3[47]/.test(n)) return 'amex';
  return 'visa'; // fallback
}

/**
 * Luhn check de validate so the hop le.
 */
function luhnCheck(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '').split('').map(Number).reverse();
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

async function addCard(userId, payload) {
  const { cardNumber, holderName, expiryMonth, expiryYear } = payload;

  // Validate expiry khong o qua khu
  const now = new Date();
  const exp = new Date(expiryYear, expiryMonth - 1, 1);
  if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) {
    const err = new Error('Thẻ đã hết hạn');
    err.status = 400;
    throw err;
  }

  const last4 = cardNumber.slice(-4);
  const brand = detectBrand(cardNumber);

  // Neu chua co the nao -> set isDefault = true
  const existingCount = await prisma.paymentCard.count({ where: { userId } });

  return await prisma.paymentCard.create({
    data: {
      userId,
      brand,
      last4,
      holderName,
      expiryMonth,
      expiryYear,
      isDefault: existingCount === 0,
    },
  });
}

async function getMyCards(userId) {
  return await prisma.paymentCard.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

async function deleteCard(cardId, userId) {
  const card = await prisma.paymentCard.findFirst({
    where: { id: cardId, userId },
  });
  if (!card) {
    const err = new Error('Không tìm thấy thẻ');
    err.status = 404;
    throw err;
  }

  await prisma.paymentCard.delete({ where: { id: cardId } });

  // Neu xoa the default -> set the khac thanh default
  if (card.isDefault) {
    const another = await prisma.paymentCard.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (another) {
      await prisma.paymentCard.update({
        where: { id: another.id },
        data: { isDefault: true },
      });
    }
  }

  return { id: cardId };
}

async function setDefault(cardId, userId) {
  const card = await prisma.paymentCard.findFirst({
    where: { id: cardId, userId },
  });
  if (!card) {
    const err = new Error('Không tìm thấy thẻ');
    err.status = 404;
    throw err;
  }

  return await prisma.$transaction([
    prisma.paymentCard.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.paymentCard.update({
      where: { id: cardId },
      data: { isDefault: true },
    }),
  ]);
}

module.exports = { addCard, getMyCards, deleteCard, setDefault };
