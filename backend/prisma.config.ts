import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});

// import { defineConfig } from '@prisma/client/config';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// export default defineConfig({
//     datasources: {
//         db: {
//             url: process.env.DATABASE_URL,
//         },
//     },
// });