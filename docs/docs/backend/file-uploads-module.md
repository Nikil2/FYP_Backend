# File Uploads Module

**Status:** Planned - To Be Implemented

## Purpose

The File Uploads module handles all file upload operations in the platform, including profile pictures, CNIC images, portfolio photos, and evidence attachments. It provides a unified interface for secure file storage and retrieval.

## Expected Functionality

### Core Features
- Upload images and documents
- File validation (type, size)
- Secure storage (Cloudinary, AWS S3, or local)
- Generate signed URLs for private files
- Public URLs for public files
- File deletion

### File Categories
```
PROFILE_PICTURES - User profile photos (public)
CNIC_IMAGES - CNIC front/back (private, admin access)
PORTFOLIO - Worker portfolio images (public)
EVIDENCE - Complaint evidence (private)
MESSAGES - Image messages (participants only)
```

### Business Logic
- Different storage rules per category
- Size limits vary by file type
- Private files require signed URLs
- Automatic image optimization

## Planned API Endpoints

### Uploads Controller (`/api/uploads`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profile-picture` | Upload profile picture |
| POST | `/cnic` | Upload CNIC images |
| POST | `/portfolio` | Upload portfolio image |
| POST | `/evidence` | Upload evidence files |
| POST | `/message` | Upload message image |
| DELETE | `/:fileId` | Delete uploaded file |
| GET | `/signed-url/:fileId` | Get signed URL for private file |

## DTOs to Implement

```typescript
// UploadResponseDto
{
  fileId: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  uploadedAt: string;
}

// SignedUrlDto
{
  fileId: string;
  signedUrl: string;
  expiresAt: string;
}
```

## File Constraints

| Category | Max Size | Allowed Types | Storage |
|----------|----------|---------------|---------|
| Profile Picture | 5 MB | JPG, PNG, WEBP | Public |
| CNIC Images | 5 MB | JPG, PNG | Private |
| Portfolio | 10 MB | JPG, PNG, WEBP | Public |
| Evidence | 20 MB | JPG, PNG, PDF | Private |
| Messages | 10 MB | JPG, PNG | Participants |

## Implementation Notes

### Phase 1 (Basic Upload)
- [ ] File upload endpoint
- [ ] File type validation
- [ ] Size limit enforcement
- [ ] Local storage implementation

### Phase 2 (Cloud Storage)
- [ ] Cloudinary integration
- [ ] AWS S3 integration
- [ ] Signed URL generation
- [ ] CDN integration

### Phase 3 (Advanced)
- [ ] Image optimization (resize, compress)
- [ ] Thumbnail generation
- [ ] Video transcoding
- [ ] Virus scanning
- [ ] Content moderation API

## Dependencies

- **Required Modules:** Users (for auth)
- **Integrates With:** All modules that handle files

## Security Considerations

- File type validation (magic bytes, not just extension)
- File size limits to prevent DoS
- Private files must have access control
- Signed URLs with expiration
- Sanitize file names
- Consider virus scanning for uploads

## Cloudinary Integration Example

```typescript
// uploads.service.ts
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  async uploadFile(
    file: Express.Multer.File,
    category: FileCategory,
    isPublic: boolean
  ): Promise<UploadResponseDto> {
    const folder = this.getFolderForCategory(category);

    const result = await cloudinary.uploader.upload(file.path, {
      folder: `mehnati/${folder}`,
      public_id: `${Date.now()}-${file.originalname}`,
      access_control: isPublic ? undefined : [{
        access_type: 'anonymous',
        start: '2099-01-01', // Effectively private
      }],
    });

    return {
      fileId: result.public_id,
      url: result.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      category,
      uploadedAt: new Date().toISOString(),
    };
  }

  async getSignedUrl(fileId: string, expiresInMinutes: number = 60): Promise<string> {
    return cloudinary.url(fileId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    });
  }
}
```

## Multer Configuration

```typescript
// upload.middleware.ts
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage: memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});
```

## Urdu Translation Support

- "Upload" / "اپ لوڈ"
- "Profile Picture" / "پروفائل تصویر"
- "CNIC Images" / "شناختی کارڈ کی تصاویر"
- "Portfolio" / "پورٹ فولیو"
- "Evidence" / "ثبوت"
