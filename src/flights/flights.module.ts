import { Module } from '@nestjs/common';
import { AmadeusService } from 'src/amadeus/amadeus.service';
import { FlightsController } from './flights.controller';
import { HttpModule } from '@nestjs/axios'
import { FlightsService } from './flights.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OfferCodecService } from './OfferCodec/offercodec.service';
@Module({
    imports: [HttpModule ,PrismaModule], //->gives the tools 
    providers: [AmadeusService, FlightsService, OfferCodecService], //-> use these tools 
    controllers: [FlightsController]//-> takes the result 
})
export class FlightsModule { }
