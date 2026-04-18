// src/validators/index.js
// Zod schemas cho validate request body
const { z } = require('zod');

// ===== Vehicle (dung field name khop voi Prisma buoi 4) =====
const createVehicleSchema = z.object({
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(5).max(15).regex(/^[0-9A-Z\-\.\s]+$/i, 'Bien so khong hop le'),
  seats: z.coerce.number().int().min(2).max(16),
  transmission: z.enum(['manual', 'automatic']),
  fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid']),
  pricePerDay: z.coerce.number().min(100_000).max(10_000_000),
  description: z.string().max(1000).optional(),
  fuelConsumption: z.coerce.number().min(0).max(50).optional(),
  kmLimitPerDay: z.coerce.number().int().min(0).optional(),
  overageFeePerKm: z.coerce.number().min(0).optional(),
  // Dia chi
  province: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  ward: z.string().max(100).optional(),
  detail: z.string().max(255).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  // Tinh nang
  featureIds: z.array(z.string().uuid()).optional(),
});

const updateVehicleSchema = createVehicleSchema.partial();

// ===== KYC =====
const submitKycSchema = z.object({
  licenseNumber: z.string().min(5).max(20),
  fullName: z.string().min(2).max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngay sinh dang YYYY-MM-DD').optional(),
});

// ===== Booking =====
const createBookingSchema = z.object({
  vehicleId: z.string().min(1),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  cardId: z.string().optional(),
  note: z.string().max(500).optional(),
  usePoints: z.coerce.number().int().min(0).optional(),
}).refine(d => new Date(d.endDate) > new Date(d.startDate), {
  message: 'endDate phai sau startDate',
  path: ['endDate'],
});

const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ===== Payment Card =====
const createCardSchema = z.object({
  cardNumber: z.string().regex(/^\d{13,19}$/, 'So the khong hop le'),
  holderName: z.string().min(2).max(100),
  expiryMonth: z.coerce.number().int().min(1).max(12),
  expiryYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV khong hop le'), // chi de validate roi bo, KHONG luu
});

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
  submitKycSchema,
  createBookingSchema,
  cancelBookingSchema,
  createCardSchema,
};
