import {IsString,IsIn,IsArray,IsInt,ArrayMinSize,IsOptional,Matches,ValidateIf} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchFlightOffersDto {

    // ========== TRIP TYPE ==========
    @IsString()
    @IsIn(['oneway', 'roundtrip', 'multicity'])
    type: string;

    // ========== DEPARTURE CITIES ==========
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Type(() => Number)
    departure_city_id: number[];

    // ========== DESTINATION CITIES ==========
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Type(() => Number)
    destination_city_id: number[];

    // ========== SELECTED DATE ==========
    // Can be a string (oneway) or array of strings (roundtrip/multicity)
    @IsArray()
    selectedDate: string[];

    // ========== TRAVEL CLASS ==========
    @IsString()
    @IsIn(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
    travelClass: string;

    // ========== PASSENGERS ==========
    // Format: "Adults=1, Children=0, Infants=0, Total=1"
    @IsString()
    @Matches(/^Adults=\d+,\s*Children=\d+,\s*Infants=\d+,\s*Total=\d+$/, {
        message: 'passengers must be in format: Adults=1, Children=0, Infants=0, Total=1',
    })
    passengers: string;

}