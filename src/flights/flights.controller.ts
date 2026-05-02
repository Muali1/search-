import { Controller, Post, Body } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightOffersDto } from './dto/flights.dto';
import { HttpException } from '@nestjs/common';
@Controller('flights')
export class FlightsController {
    constructor(private fs: FlightsService) { }

    @Post('searchflightsoffers')
    async flightOffersSearch(@Body() flight: SearchFlightOffersDto) {
        try {
            const result = await this.fs.search(flight);
            const response: any = {
                success: result['success'],
                message: result['message'] ?? null,
            };

            if (result['data']) {
                response['data'] = result['data'];
            }

            if (!result['success']) {
                throw new HttpException(response, result['status'] ?? 503);
            }
            return response;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new HttpException(
                { success: false, message: e.message ?? 'Something went wrong' },
                500
            );
        }
    }

}
