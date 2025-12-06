import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// import { RolesGuard } from './auth/guards/roles.guard';
// import { Reflector } from '@nestjs/core'; // 👈 necesario
import { inspect } from 'util';

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', inspect(err, { depth: null }));
});

async function bootstrap() {
  console.log('JWT_SEED:', process.env.JWT_SEED); // <-- Log de depuración
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  
  app.setGlobalPrefix('api');

  // app.useGlobalPipes(
  //   new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  // );

  // const reflector = app.get(Reflector); // 👈 obtenemos instancia
  // app.useGlobalGuards(new RolesGuard(reflector)); // 👈 pasamos al guard

  await app.listen(process.env.PORT ?? 3002);
}

bootstrap();
