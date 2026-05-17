import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get worker's full weekly schedule.
   */
  async getWorkerSchedule(workerId: string) {
    const schedule = await this.prisma.workerSchedule.findMany({
      where: { workerId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return schedule.map((s) => ({
      ...s,
      dayName: DAY_NAMES[s.dayOfWeek],
    }));
  }

  /**
   * Set or update availability for a specific day.
   * Uses upsert — creates if not exists, updates if exists.
   */
  async setDaySchedule(workerId: string, dto: CreateScheduleDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Verify worker exists
    const worker = await this.prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    const schedule = await this.prisma.workerSchedule.upsert({
      where: {
        workerId_dayOfWeek: { workerId, dayOfWeek: dto.dayOfWeek },
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      create: {
        workerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });

    return { ...schedule, dayName: DAY_NAMES[schedule.dayOfWeek] };
  }

  /**
   * Set the full weekly schedule at once (replaces all entries).
   */
  async setFullSchedule(workerId: string, entries: CreateScheduleDto[]) {
    const worker = await this.prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    // Validate all entries
    for (const entry of entries) {
      if (entry.startTime >= entry.endTime) {
        throw new BadRequestException(`Invalid time for ${DAY_NAMES[entry.dayOfWeek]}: start must be before end`);
      }
    }

    // Delete existing and create new in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.workerSchedule.deleteMany({ where: { workerId } });

      for (const entry of entries) {
        await tx.workerSchedule.create({
          data: {
            workerId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
          },
        });
      }
    });

    return this.getWorkerSchedule(workerId);
  }

  /**
   * Remove availability for a specific day.
   */
  async removeDaySchedule(workerId: string, dayOfWeek: number) {
    try {
      await this.prisma.workerSchedule.delete({
        where: {
          workerId_dayOfWeek: { workerId, dayOfWeek },
        },
      });
      return { message: `${DAY_NAMES[dayOfWeek]} schedule removed` };
    } catch {
      throw new NotFoundException(`No schedule found for ${DAY_NAMES[dayOfWeek]}`);
    }
  }
}
