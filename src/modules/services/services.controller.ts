import { Controller, Get, Post, Body, Param, Put, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, ServiceResponseDto } from './dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * Get all services (for worker registration)
   * GET /services
   */
  @Get()
  async getAllServices(): Promise<ServiceResponseDto[]> {
    return this.servicesService.getAllServices();
  }

  /**
   * Get active services only (for worker registration & customer booking)
   * GET /services/active
   */
  @Get('active')
  async getActiveServices(): Promise<ServiceResponseDto[]> {
    return this.servicesService.getActiveServices();
  }

  /**
   * Get services list by category (for frontend organization)
   * GET /services/list
   */
  @Get('list/all')
  async getServicesList(): Promise<ServiceResponseDto[]> {
    return this.servicesService.getActiveServices();
  }

  /**
   * Get service by ID
   * GET /services/:id
   */
  @Get(':id')
  async getServiceById(@Param('id', ParseIntPipe) id: number): Promise<ServiceResponseDto> {
    return this.servicesService.getServiceById(id);
  }

  /**
   * Create a new service (Admin only)
   * POST /services
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createService(@Body() createServiceDto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.createService(createServiceDto);
  }

  /**
   * Update service
   * PUT /services/:id
   */
  @Put(':id')
  async updateService(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateServiceDto>,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.updateService(id, updateData);
  }

  /**
   * Deactivate service
   * POST /services/:id/deactivate
   */
  @Post(':id/deactivate')
  async deactivateService(@Param('id', ParseIntPipe) id: number): Promise<ServiceResponseDto> {
    return this.servicesService.deactivateService(id);
  }
}
