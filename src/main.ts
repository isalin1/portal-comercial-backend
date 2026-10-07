import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}


import { trustWindowsCertificates } from './upload/windows-ca';
import { NestFactory } from '@nestjs/core';

trustWindowsCertificates();
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// import { RolesGuard } from './auth/guards/roles.guard';
// import { Reflector } from '@nestjs/core'; // 👈 necesario
import { inspect } from 'util';

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', inspect(err, { depth: null }));
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS más permisiva para desarrollo
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permitir requests sin origin (como Postman, mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      const fromEnv = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
        .filter(Boolean)
        .flatMap((value) => String(value).split(','))
        .map((value) => value.trim())
        .filter(Boolean);
      const allowedOrigins = [
        ...fromEnv,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://namiatech.com',
        'https://www.namiatech.com',
      ];
      
      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Verificar si coincide con el patrón de subdominios
      if (/^https:\/\/.*\.namiatech\.com$/.test(origin)) {
        return callback(null, true);
      }
      
      // En desarrollo, permitir todos los origins de localhost
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      
      // Si no coincide, rechazar
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
    ],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  
  app.enableCors(corsOptions);
  
  console.log('✅ CORS habilitado para:', corsOptions.origin);
  
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // const reflector = app.get(Reflector); // 👈 obtenemos instancia
  // app.useGlobalGuards(new RolesGuard(reflector)); // 👈 pasamos al guard

  await app.listen(process.env.PORT ?? 3002);
}

bootstrap();
