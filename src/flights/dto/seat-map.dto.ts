import { IsNotEmpty, IsString } from 'class-validator';
export class FlightSeatMapDto {
    @IsString()
    @IsNotEmpty()
    offer: string;
}