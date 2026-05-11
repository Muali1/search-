import { IsNotEmpty, IsString } from 'class-validator';

export class FlightSeatMapDto {
    // @IsString()
    @IsNotEmpty()
    offer: string;
}

export class PriceOfferDto {
    // @IsString()
    @IsNotEmpty()
    offer: string;
}

