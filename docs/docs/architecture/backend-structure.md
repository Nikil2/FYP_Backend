# Backend Project Structure

**Status:** Partially Implemented - Reference Document

## Directory Structure

```
FYP_BACKEND/
├── src/
│   ├── common/
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts (planned)
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts (planned)
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts (planned)
│   │   │   ├── roles.guard.ts (planned)
│   │   │   └── ws-auth.guard.ts (planned - WebSocket)
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts (planned)
│   │   │   └── user.decorator.ts (planned)
│   │   └── pipes/
│   │       └── parse-uuid.pipe.ts (planned)
│   │
│   ├── modules/
│   │   ├── auth/ (planned)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── user-response.dto.ts
│   │   │
│   │   ├── workers/
│   │   │   ├── workers.controller.ts
│   │   │   ├── workers.service.ts
│   │   │   ├── workers.module.ts
│   │   │   └── dto/
│   │   │       ├── create-worker.dto.ts
│   │   │       └── worker-response.dto.ts
│   │   │
│   │   ├── services/
│   │   │   ├── services.controller.ts
│   │   │   ├── services.service.ts
│   │   │   ├── services.module.ts
│   │   │   └── dto/
│   │   │       └── create-service.dto.ts
│   │   │
│   │   ├── bookings/ (planned)
│   │   │   ├── bookings.controller.ts
│   │   │   ├── bookings.service.ts
│   │   │   ├── bookings.module.ts
│   │   │   └── dto/
│   │   │       ├── create-booking.dto.ts
│   │   │       └── booking-response.dto.ts
│   │   │
│   │   ├── proposals/ (planned)
│   │   │   ├── proposals.controller.ts
│   │   │   ├── proposals.service.ts
│   │   │   └── proposals.module.ts
│   │   │
│   │   ├── messages/ (planned)
│   │   │   ├── messages.controller.ts
│   │   │   ├── messages.service.ts
│   │   │   └── messages.module.ts
│   │   │
│   │   ├── complaints/ (planned)
│   │   │   ├── complaints.controller.ts
│   │   │   ├── complaints.service.ts
│   │   │   └── complaints.module.ts
│   │   │
│   │   ├── notifications/ (planned)
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── notifications.module.ts
│   │   │
│   │   ├── feedback/ (planned)
│   │   │   ├── feedback.controller.ts
│   │   │   ├── feedback.service.ts
│   │   │   └── feedback.module.ts
│   │   │
│   │   ├── payments/ (planned)
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   └── payments.module.ts
│   │   │
│   │   ├── admin/ (planned)
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── admin.module.ts
│   │   │
│   │   └── uploads/ (planned)
│   │       ├── uploads.controller.ts
│   │       ├── uploads.service.ts
│   │       └── uploads.module.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   │
│   ├── shared/
│   │   ├── dto/
│   │   │   └── pagination.dto.ts
│   │   └── utils/
│   │       └── pagination.util.ts
│   │
│   ├── types/
│   │   └── api-response.type.ts
│   │
│   ├── config/ (planned)
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── cloudinary.config.ts
│   │
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts (planned)
│
├── test/
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
│
├── .env
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

## Module Structure

Each module follows NestJS conventions:

```typescript
// example.module.ts
@Module({
  imports: [
    PrismaModule,
    // other imports
  ],
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
```

## Service Pattern

```typescript
// example.service.ts
@Injectable()
export class ExampleService {
  constructor(
    @InjectPrismaClient() private prisma: PrismaClient,
  ) {}

  async findAll(params: PaginationDto) {
    const items = await this.prisma.example.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.example.findUnique({
      where: { id },
      include: { relations: true },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
}
```

## Controller Pattern

```typescript
// example.controller.ts
@Controller('api/examples')
export class ExampleController {
  constructor(private service: ExampleService) {}

  @Get()
  @HttpCode(200)
  async findAll(@Query() query: PaginationDto) {
    const result = await this.service.findAll(query);
    return { success: true, data: result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.service.findOne(id);
    return { success: true, data: result };
  }
}
```

## Global Configuration

### main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(process.env.PORT || 4000);
}
```

## Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mehnati
DIRECT_URL=postgresql://user:password@localhost:5432/mehnati

# Frontend
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Cloudinary (planned)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Firebase (planned)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY=xxx
```

## Prisma Service

```typescript
// prisma.service.ts
@Injectable({ global: true })
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## Dependency Injection

All modules are imported globally or in AppModule:

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    WorkersModule,
    ServicesModule,
    // ... other modules
  ],
})
export class AppModule {}
```
