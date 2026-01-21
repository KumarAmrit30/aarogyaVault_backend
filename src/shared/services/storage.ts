import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
// s3Config will be used when S3 is implemented
// import { s3Config } from '../config';

/**
 * Storage Service
 * MVP: Local file storage simulating S3
 * Production: Replace with actual S3 client
 */

// Local upload directory (for development)
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate a unique file key
 */
function generateFileKey(userId: string, originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  return `records/${userId}/${timestamp}-${uniqueId}${ext}`;
}

/**
 * Upload file to storage
 * MVP: Saves to local filesystem
 * Production: Upload to S3
 */
export async function uploadFile(
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  _mimeType: string // Used in production for S3 ContentType
): Promise<{ success: boolean; fileUrl?: string; fileName?: string; error?: string }> {
  try {
    const fileKey = generateFileKey(userId, originalName);
    
    if (config.NODE_ENV === 'development') {
      // Local storage for development
      const localPath = path.join(UPLOAD_DIR, fileKey);
      const localDir = path.dirname(localPath);
      
      // Create directories if needed
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(localPath, fileBuffer);
      
      // Return local URL (accessible via static file server)
      const fileUrl = `/uploads/${fileKey}`;
      
      console.log(`[DEV] File saved locally: ${localPath}`);
      
      return {
        success: true,
        fileUrl,
        fileName: originalName,
      };
    }
    
    // Production: S3 upload
    // TODO: Implement actual S3 upload
    // const s3Client = new S3Client({
    //   endpoint: s3Config.endpoint,
    //   region: s3Config.region,
    //   credentials: {
    //     accessKeyId: s3Config.accessKey,
    //     secretAccessKey: s3Config.secretKey,
    //   },
    // });
    // 
    // await s3Client.send(new PutObjectCommand({
    //   Bucket: s3Config.bucket,
    //   Key: fileKey,
    //   Body: fileBuffer,
    //   ContentType: mimeType,
    // }));
    // 
    // const fileUrl = `${s3Config.endpoint}/${s3Config.bucket}/${fileKey}`;
    
    return {
      success: false,
      error: 'Production S3 upload not implemented',
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

/**
 * Get file from storage
 * MVP: Reads from local filesystem
 * Production: Generate presigned S3 URL
 */
export async function getFileUrl(fileUrl: string): Promise<string> {
  if (config.NODE_ENV === 'development') {
    // In development, return as-is (served by express static)
    return fileUrl;
  }
  
  // Production: Generate presigned URL
  // TODO: Implement presigned URL generation
  return fileUrl;
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    if (config.NODE_ENV === 'development') {
      // Local storage
      const localPath = path.join(UPLOAD_DIR, fileUrl.replace('/uploads/', ''));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      return true;
    }
    
    // Production: S3 delete
    // TODO: Implement S3 delete
    return false;
  } catch (error) {
    console.error('File delete error:', error);
    return false;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(fileUrl: string): Promise<boolean> {
  if (config.NODE_ENV === 'development') {
    const localPath = path.join(UPLOAD_DIR, fileUrl.replace('/uploads/', ''));
    return fs.existsSync(localPath);
  }
  
  // Production: S3 head object
  // TODO: Implement S3 head check
  return false;
}
