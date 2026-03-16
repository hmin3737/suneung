import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.S3_BUCKET_NAME!;

export function buildS3Key(
  grade: string,
  year: number,
  month: number,
  examType: string,
  subject: string,
  fileType: 'problem' | 'answer' | 'ebs'
): string {
  const fileLabel = { problem: '문제', answer: '정답', ebs: 'EBS해설' }[fileType];
  return `${year}/${grade}/${month}월_${examType}/${subject}_${fileLabel}.pdf`;
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(key.split('/').pop() || 'file.pdf')}`,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function uploadToS3(key: string, buffer: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function deleteFromS3(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
