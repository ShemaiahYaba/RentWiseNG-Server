import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from './env.js';
import { AppError } from '@/lib/errors.js';

const PRESIGN_EXPIRES_SECONDS = 900;

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_PUBLIC_URL,
  );
}

export function assertR2Configured(): void {
  if (!isR2Configured()) {
    throw new AppError(
      'file upload is not configured (missing R2 environment variables)',
      503,
    );
  }
}

function getS3Client(): S3Client {
  assertR2Configured();
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return base.length > 0 ? base : 'file';
}

export type UploadPurpose = 'listing_photo' | 'ownership_doc' | 'kyc_document';

export async function createPresignedUpload(params: {
  userId: string;
  filename: string;
  contentType: string;
  purpose: UploadPurpose;
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}> {
  const client = getS3Client();
  const safeName = sanitizeFilename(params.filename);
  const key = `${params.purpose}/${params.userId}/${randomUUID()}-${safeName}`;
  const publicBase = env.R2_PUBLIC_URL!.replace(/\/$/, '');

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: `${publicBase}/${key}`,
    key,
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  };
}
