# FYP Backend

NestJS backend application with Prisma and PostgreSQL for Final Year Project.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript

## Project Structure

```
src/
├── common/
│   ├── filters/         # Exception filters
│   └── interceptors/    # Response interceptors
├── modules/             # Feature modules
├── shared/
│   ├── dto/            # Shared DTOs
│   ├── prisma/         # Prisma service
│   └── utils/          # Utility functions
├── types/              # TypeScript types/interfaces
├── app.controller.ts   # Root controller
├── app.module.ts       # Root module
├── app.service.ts      # Root service
└── main.ts             # Application entry point (with CORS)
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your PostgreSQL database URL and other configurations.

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. (Optional) Seed the database:
```bash
npm run prisma:seed
```

### Running the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:4000`

### Available Scripts

- `npm run start:dev` - Start development server
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests

## CORS Configuration

CORS is configured in [src/main.ts](src/main.ts) to accept requests from your frontend application. Update the `FRONTEND_URL` in your `.env` file to match your frontend URL.

## Database

This project uses Prisma with PostgreSQL. The schema is defined in [prisma/schema.prisma](prisma/schema.prisma).

### Prisma Commands

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npm run prisma:studio
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint

## Development

Add your feature modules in the `src/modules/` directory following the NestJS module pattern.

## License

UNLICENSED
