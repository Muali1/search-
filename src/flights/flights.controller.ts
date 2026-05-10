import { Controller, Post, Body ,Get } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightOffersDto } from './dto/flights.dto';
import { HttpException } from '@nestjs/common';
import { FlightSeatMapDto } from 'src/flights/dto/seat-map.dto';
@Controller('flights')
export class FlightsController {
    constructor(private fs: FlightsService) { }

    @Post('searchflightsoffers')
    async flightOffersSearch(@Body() flight: SearchFlightOffersDto) {
        try {
            const result = await this.fs.search(flight);
            const response = {
                'success': result['success'],
                'message': result['message'] ?? null,
            }

            if (result['data'] !== undefined && result['data'] !== null) {
                response['data'] = result['data'];
            }
            return response;
            // الكود
        } catch (e) {
            throw new HttpException(
                { success: false, message: e.message ?? 'Something went wrong' },
                500
            );
        }
    }
    @Post('seatmap')
    async flightSeatMap(@Body() body: FlightSeatMapDto) {
        try {
            const result = await this.fs.seatMap(body.offer);
            return { success: true, data: result };
        } catch (e) {
            throw new HttpException(
                { success: false, message: e.message ?? 'Something went wrong', detail: e },
                500
            );
        }
    }
@Get('token')
async getToken() {
    return { token: await this.fs.getToken() };
}
}
