export class AdminResponseDto {
  id: string;
  userId: string;
  adminLevel: string;
  phoneNumber: string;
  fullName: string;
  profilePicUrl?: string;
  isBlocked: boolean;
  createdAt: Date;
}
