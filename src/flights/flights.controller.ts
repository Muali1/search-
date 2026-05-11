import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightOffersDto } from './dto/flights.dto';
import { HttpException } from '@nestjs/common';
import { FlightSeatMapDto, PriceOfferDto } from 'src/flights/dto/seat-map.dto';
@Controller('flights')
export class FlightsController {
    constructor(private fs: FlightsService) { }

    @Post('searchflightsoffers')
    async searchflightsoffers(@Body() flight: SearchFlightOffersDto) {
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
    @Post('selectflightsoffers')
    async selectflightsoffers(@Body() body: any) {
        try {
            return await this.fs.select(body.offer);
        } catch (e) {
            throw new HttpException(
                { success: false, message: e.message },
                500
            );
        }
    }
    @Post('seatmap')
    async seatmap(@Body() body: any) {
        try {
            const result = await this.fs.seatMap(body.offer);

            return {
                success: true,
                data: result,
            };
        } catch (e) {
            throw new HttpException(
                {
                    success: false,
                    message: e.message ?? 'Something went wrong',
                },
                500,
            );
        }
    }

    // @Get('token')
    // async getToken() {
    //     return { token: await this.fs.getToken() };
    // }
}
