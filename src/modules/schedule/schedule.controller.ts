import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('workers/:workerId/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /** GET /workers/:workerId/schedule — Get full week schedule (public) */
  @Get()
  async getSchedule(@Param('workerId') workerId: string) {
    return this.scheduleService.getWorkerSchedule(workerId);
  }

  /** POST /workers/:workerId/schedule — Set single day (auth required) */
  @Post()
  @UseGuards(JwtAuthGuard)
  async setDaySchedule(
    @Param('workerId') workerId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.scheduleService.setDaySchedule(workerId, dto);
  }

  /** PUT /workers/:workerId/schedule — Replace full week schedule (auth required) */
  @Put()
  @UseGuards(JwtAuthGuard)
  async setFullSchedule(
    @Param('workerId') workerId: string,
    @Body() entries: CreateScheduleDto[],
  ) {
    return this.scheduleService.setFullSchedule(workerId, entries);
  }

  /** DELETE /workers/:workerId/schedule/:day — Remove a day (auth required) */
  @Delete(':day')
  @UseGuards(JwtAuthGuard)
  async removeDaySchedule(
    @Param('workerId') workerId: string,
    @Param('day', ParseIntPipe) day: number,
  ) {
    return this.scheduleService.removeDaySchedule(workerId, day);
  }
}
