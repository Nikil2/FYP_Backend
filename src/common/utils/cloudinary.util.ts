import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

interface UploadedFile {
  buffer: Buffer;
}

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * @param file - Multer file object
 * @param folder - Folder name in Cloudinary
 * @returns Upload response with URL
 */
export async function uploadToCloudinary(
  file: UploadedFile,
  folder: string = 'mehnati-marketplace',
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'));
          } else {
            resolve(result as UploadApiResponse);
          }
        },
      )
      .end(file.buffer);
  });
}

/**
 * Upload multiple files to Cloudinary
 * @param files - Array of Multer file objects
 * @param folder - Folder name in Cloudinary
 * @returns Array of upload responses
 */
export async function uploadMultipleToCloudinary(
  files: UploadedFile[],
  folder: string = 'mehnati-marketplace',
): Promise<UploadApiResponse[]> {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Cloudinary
 * @param url - Cloudinary URL to delete
 * @returns Deletion result
 */
export async function deleteFromCloudinary(url: string): Promise<any> {
  const publicId = extractPublicIdFromUrl(url);
  return cloudinary.uploader.destroy(publicId);
}

/**
 * Extract public ID from Cloudinary URL
 */
function extractPublicIdFromUrl(url: string): string {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
}

export { cloudinary };
