import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/create-location.dto';

const MAX_LOCATIONS_PER_USER = 10;

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getSavedLocations(userId: string) {
    return this.prisma.savedLocation.findMany({
      where: { userId },
    });
  }

  async createLocation(userId: string, dto: CreateLocationDto) {
    const count = await this.prisma.savedLocation.count({ where: { userId } });
    if (count >= MAX_LOCATIONS_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_LOCATIONS_PER_USER} saved locations allowed`,
      );
    }

    return this.prisma.savedLocation.create({
      data: { userId, address: dto.address, lat: dto.lat, lng: dto.lng },
    });
  }

  async updateLocation(
    userId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    const location = await this.prisma.savedLocation.findUnique({
      where: { id: locationId },
    });
    if (!location || location.userId !== userId) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.savedLocation.update({
      where: { id: locationId },
      data: dto,
    });
  }

  async deleteLocation(userId: string, locationId: string) {
    const location = await this.prisma.savedLocation.findUnique({
      where: { id: locationId },
    });
    if (!location || location.userId !== userId) {
      throw new NotFoundException('Location not found');
    }

    await this.prisma.savedLocation.delete({ where: { id: locationId } });
    return { message: 'Location deleted' };
  }
}
