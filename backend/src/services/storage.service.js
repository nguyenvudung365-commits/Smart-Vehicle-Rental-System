// src/services/storage.service.js
// Upload anh: multer buffer -> sharp nen WebP -> MinIO S3
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3, BUCKET, getPublicUrl } = require('../config/s3');

// Preset kich thuoc cho tung loai anh
const PRESETS = {
  vehicle: { width: 1600, height: 1200, quality: 82 },
  avatar:  { width: 400,  height: 400,  quality: 85 },
  kyc:     { width: 1600, height: 1200, quality: 85 },
};

async function uploadImage(buffer, type, subfolder = '') {
  const preset = PRESETS[type] || PRESETS.vehicle;

  const processed = await sharp(buffer)
    .rotate()
    .resize(preset.width, preset.height, {
      fit: 'cover',
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality })
    .toBuffer();

  const folderMap = {
    vehicle: subfolder ? `vehicles/${subfolder}` : 'vehicles',
    avatar:  'avatars',
    kyc:     'kyc',
  };
  const folder = folderMap[type];
  const filename = `${uuidv4()}.webp`;
  const storageKey = `${folder}/${filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: processed,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    url: getPublicUrl(storageKey),
    storageKey,
    sizeBytes: processed.length,
  };
}

async function deleteImage(storageKey) {
  if (!storageKey) return;
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
    }));
  } catch (err) {
    console.warn('[storage] Failed to delete', storageKey, err.message);
  }
}

async function deleteImages(storageKeys = []) {
  await Promise.all(storageKeys.filter(Boolean).map(deleteImage));
}

module.exports = { uploadImage, deleteImage, deleteImages };
