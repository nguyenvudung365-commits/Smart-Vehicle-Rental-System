// src/middlewares/upload.js
// Multer dung memoryStorage — file duoc giu trong RAM duoi dang
// Buffer -> pipe thang cho sharp, khong ghi disk trung gian.
const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (se duoc nen xuong ~100-300KB sau sharp)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // toi da 10 anh/request (du cho dang ky xe)
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error(`Dinh dang ${file.mimetype} khong duoc ho tro`));
    }
    cb(null, true);
  },
});

module.exports = {
  uploadSingle: (field) => upload.single(field),
  uploadMultiple: (field, maxCount = 10) => upload.array(field, maxCount),
  uploadFields: (fields) => upload.fields(fields),
};
