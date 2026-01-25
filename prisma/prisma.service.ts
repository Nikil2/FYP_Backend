import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Dedicated client for real-time operations (Socket.IO, chat)
  // Uses direct connection (port 5432) for better performance
  public readonly realtimeClient: PrismaClient;

  constructor() {
    // PRIMARY CLIENT: Transaction pooler (port 6543)
    // Use for: REST API endpoints, bulk operations, admin operations
    const databaseUrl = process.env.DATABASE_URL || '';
    const separator = databaseUrl.includes('?') ? '&' : '?';
    const connectionString = `${databaseUrl}${separator}pgbouncer=true&statement_cache_size=0&connection_limit=8&pool_timeout=10`;

    super({
      log: ['error'], // keep Prisma logs minimal
      // Fix for PgBouncer transaction pooling (port 6543)
      // - Disables prepared statements (don't work in transaction mode)
      // - Limits connection pool to 8 (Supabase transaction pooler limit is 9)
      // - Leaves 1 connection as buffer for overhead
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });

    // REALTIME CLIENT: Direct connection (port 5432)
    // Use for: Socket.IO chat messages, real-time operations
    // Benefits: Persistent connections, no pooler overhead, 2-3x faster
    const directUrl = process.env.DIRECT_URL || databaseUrl.replace(':6543', ':5432');
    
    this.realtimeClient = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: directUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    // await this.realtimeClient.$connect();
    console.log('✅ Connected to transaction pooler (REST API)');
    // console.log('✅ Connected to direct connection (Real-time/Socket.IO)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.realtimeClient.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
