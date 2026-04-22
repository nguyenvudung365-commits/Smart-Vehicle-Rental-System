// src/config/s3.js
// Config AWS SDK S3 client tro vao MinIO local.
// MinIO tuong thich 100% S3 API -> chi can doi endpoint.
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,       // http://localhost:9000
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // BAT BUOC voi MinIO (khong dung virtual-hosted-style nhu AWS)
});

const BUCKET = process.env.MINIO_BUCKET || 'mioto-images';

/**
 * Tra ve URL public cua 1 object.
 * Bucket da set anonymous download nen URL nay xem duoc truc tiep.
 *
 * Luu y: dung MINIO_PUBLIC_ENDPOINT (co the khac MINIO_ENDPOINT).
 * Vi du: backend goi qua "minio:9000" (docker network) nhung mobile
 * phai goi qua "http://192.168.1.x:9000" (IP may host).
 */
function getPublicUrl(key) {
  const base = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT;
  return `${base}/${BUCKET}/${key}`;
}

module.exports = { s3, BUCKET, getPublicUrl };
