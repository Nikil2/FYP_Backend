import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/create-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async getLocations(@CurrentUser('sub') userId: string) {
    return this.locationsService.getSavedLocations(userId);
  }

  @Post()
  async createLocation(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locationsService.createLocation(userId, dto);
  }

  @Put(':id')
  async updateLocation(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.updateLocation(userId, id, dto);
  }

  @Delete(':id')
  async deleteLocation(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.locationsService.deleteLocation(userId, id);
  }
}
