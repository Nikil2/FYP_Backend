import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { PrismaService } from '../../../prisma/prisma.service';

export type FileCategory = 'profile-picture' | 'cnic' | 'portfolio' | 'evidence' | 'message';

const FILE_LIMITS: Record<FileCategory, { maxSizeMB: number; allowedTypes: string[] }> = {
  'profile-picture': { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'cnic': { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png'] },
  'portfolio': { maxSizeMB: 10, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  'evidence': { maxSizeMB: 20, allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'] },
  'message': { maxSizeMB: 10, allowedTypes: ['image/jpeg', 'image/png'] },
};

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {
    // Configure Cloudinary from environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a file to Cloudinary.
   * Validates file type and size based on category.
   */
  async uploadFile(
    file: Express.Multer.File,
    category: FileCategory,
    userId: string,
  ) {
    // Validate file
    const limits = FILE_LIMITS[category];
    if (!limits) {
      throw new BadRequestException(`Invalid file category: ${category}`);
    }

    if (!limits.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${limits.allowedTypes.join(', ')}`,
      );
    }

    const maxSizeBytes = limits.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File too large. Maximum: ${limits.maxSizeMB}MB`);
    }

    // Upload to Cloudinary
    const result = await this.uploadToCloudinary(file, category);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      category,
    };
  }

  /**
   * Upload profile picture and update user record.
   */
  async uploadProfilePicture(file: Express.Multer.File, userId: string) {
    const result = await this.uploadFile(file, 'profile-picture', userId);

    // Update user's profile picture URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicUrl: result.url },
    });

    return result;
  }

  /**
   * Upload CNIC images (front/back) for worker verification.
   */
  async uploadCnic(file: Express.Multer.File, userId: string, side: 'front' | 'back') {
    const result = await this.uploadFile(file, 'cnic', userId);

    // Update worker profile with CNIC URL
    const updateData = side === 'front'
      ? { cnicFrontUrl: result.url }
      : { cnicBackUrl: result.url };

    await this.prisma.workerProfile.update({
      where: { userId },
      data: updateData,
    });

    return result;
  }

  /**
   * Upload portfolio image for a worker.
   */
  async uploadPortfolio(file: Express.Multer.File, workerId: string, description?: string) {
    const result = await this.uploadFile(file, 'portfolio', workerId);

    const portfolio = await this.prisma.workerPortfolio.create({
      data: {
        workerId,
        imageUrl: result.url,
        description,
      },
    });

    return { ...result, portfolioId: portfolio.id };
  }

  /**
   * Upload evidence for a complaint.
   */
  async uploadEvidence(file: Express.Multer.File, userId: string) {
    return this.uploadFile(file, 'evidence', userId);
  }

  /**
   * Delete a file from Cloudinary by public ID.
   */
  async deleteFile(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Internal: Upload buffer to Cloudinary.
   */
  private uploadToCloudinary(
    file: Express.Multer.File,
    category: FileCategory,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mehnati/${category}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
