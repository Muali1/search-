import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FlightsModule } from './flights/flights.module';
import { PrismaService } from './prisma/prisma.service'
import { PrismaModule } from './prisma/prisma.module';
import {ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  imports: [FlightsModule, PrismaModule ,ConfigModule ,CacheModule.register({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
