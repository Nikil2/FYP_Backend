import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new service
   */
  async createService(
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    const { name, iconUrl, categoryId, categoryName, categoryIcon } =
      createServiceDto;

    // Check if service already exists
    const existingService = await this.prisma.service.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name,
        },
      },
    });

    if (existingService) {
      throw new ConflictException(`Service "${name}" already exists`);
    }

    const service = await this.prisma.service.create({
      data: {
        name,
        iconUrl: iconUrl || null,
        categoryId,
        categoryName,
        categoryIcon: categoryIcon || null,
        isActive: true,
      },
    });

    return this.mapToResponseDto(service);
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<ServiceResponseDto[]> {
    const services = await this.prisma.service.findMany({
      orderBy: { name: 'asc' },
    });

    return services.map((service) => this.mapToResponseDto(service));
  }

  /**
   * Get active services only
   */
  async getActiveServices(): Promise<ServiceResponseDto[]> {
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return services.map((service) => this.mapToResponseDto(service));
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: number): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.mapToResponseDto(service);
  }

  /**
   * Get services by IDs
   */
  async getServicesByIds(ids: number[]): Promise<ServiceResponseDto[]> {
    const services = await this.prisma.service.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
    });

    if (services.length !== ids.length) {
      throw new NotFoundException('Some services not found');
    }

    return services.map((service) => this.mapToResponseDto(service));
  }

  /**
   * Update service
   */
  async updateService(
    id: number,
    updateData: Partial<CreateServiceDto>,
  ): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Deactivate service
   */
  async deactivateService(id: number): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(service: any): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      iconUrl: service.iconUrl,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      categoryIcon: service.categoryIcon,
      isActive: service.isActive,
    };
  }
}
