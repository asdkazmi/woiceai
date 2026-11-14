import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

// Initialize S3 client - supports both access keys and SSO profile (like Laravel)
const getS3Client = (): S3Client => {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // If SSO profile is configured, use it (like Laravel)
  if (process.env.AWS_SSO_PROFILE) {
    // Note: SSO profile requires AWS CLI SSO configuration
    // For now, we'll use default credentials chain which includes SSO
    return new S3Client({
      region,
    });
  }
  
  // Otherwise use access keys
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

const s3Client = getS3Client();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

export interface UploadedFile {
  object_id: string;
  filename: string;
}

export class S3Service {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    file: Express.Multer.File,
    folder: string = 'knowledge-bases'
  ): Promise<UploadedFile> {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${randomUUID()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    return {
      object_id: fileName,
      filename: file.originalname,
    };
  }

  /**
   * Upload multiple files to S3
   */
  static async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'knowledge-bases'
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(objectId: string): Promise<boolean> {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectId,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  /**
   * Delete multiple files from S3
   */
  static async deleteFiles(objectIds: string[]): Promise<boolean> {
    const deletePromises = objectIds.map((objectId) => this.deleteFile(objectId));
    const results = await Promise.all(deletePromises);
    return results.every((result) => result === true);
  }

  /**
   * Get a presigned URL for file access (30 minutes expiry, matching Laravel)
   */
  static async getPresignedUrl(
    s3Key: string,
    expiresIn: number = 30 * 60, // 30 minutes default
    disposition: 'inline' | 'attachment' = 'inline'
  ): Promise<string> {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ResponseContentDisposition: disposition,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Get presigned URLs for multiple files
   */
  static async getPresignedUrls(
    s3Keys: string[],
    expiresIn: number = 30 * 60,
    disposition: 'inline' | 'attachment' = 'inline'
  ): Promise<Record<string, string>> {
    const urlPromises = s3Keys.map(async (key) => {
      const url = await this.getPresignedUrl(key, expiresIn, disposition);
      return [key, url] as [string, string];
    });

    const results = await Promise.all(urlPromises);
    return Object.fromEntries(results);
  }
}

