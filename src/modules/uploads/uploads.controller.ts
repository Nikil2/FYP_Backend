import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /** POST /uploads/profile-picture */
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadProfilePicture(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadProfilePicture(file, userId);
  }

  /** POST /uploads/cnic?side=front|back */
  @Post('cnic')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadCnic(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('side') side: 'front' | 'back' = 'front',
  ) {
    return this.uploadsService.uploadCnic(file, userId, side);
  }

  /** POST /uploads/portfolio */
  @Post('portfolio')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadPortfolio(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('workerId') workerId: string,
    @Body('description') description?: string,
  ) {
    return this.uploadsService.uploadPortfolio(
      file,
      userId,
      workerId,
      description,
    );
  }

  /** POST /uploads/evidence */
  @Post('evidence')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadEvidence(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadEvidence(file, userId);
  }

  /** POST /uploads/message — image attachment in chat */
  @Post('message')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadMessageImage(
    @CurrentUser('sub') _userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadFile(file, 'message');
  }

  /** DELETE /uploads/:publicId */
  @Delete(':publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    return this.uploadsService.deleteFile(publicId);
  }
}
