import { Injectable } from '@nestjs/common';
import { AmadeusService } from 'src/amadeus/amadeus.service';
import { PrismaService } from 'src/prisma/prisma.service';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { OfferCodecService } from './OfferCodec/offercodec.service';
dayjs.extend(customParseFormat);
@Injectable()
export class FlightsService {
    protected tamara_installments_count = 4;
    protected tamara_logo = 'frontend/assets/images/tamara.svg';
    protected tamara_label = 'interest-free payments';
    constructor(private amadeusService: AmadeusService, private ps: PrismaService, private offerCodecService: OfferCodecService) {
    }
    async markup_rate(price) {
        const res = await this.ps.flights_service_providers.findFirst({
            where: { name: 'amadeus' },
            select: { markup_rate: true }
        });
        let mark_up = res?.markup_rate ?? 0;

        if (price === 'default') {
            return mark_up;
        }

        const numericPrice = parseFloat(price);
        const markupAmount = numericPrice * (mark_up / 100);
        return numericPrice + markupAmount;
    }
    async search(details: any) {
        const accessToken = await this.amadeusService.authenticate();
        const data = details;

        if (data['type'] === 'roundtrip' && Array.isArray(data['selectedDate'])) {
            const deprature_date = dayjs(data['selectedDate'][0], 'DD.MM.YYYY').format('YYYY-MM-DD');
            const return_date = dayjs(data['selectedDate'][1], 'DD.MM.YYYY').format('YYYY-MM-DD');
            data['selectedDate'][0] = `${deprature_date} - ${return_date}`;
        }
        try {
            const offers = await this.amadeusService.searchFlightOffers(data, accessToken);

            if (offers?.['error'] === true) {
                return {
                    'success': false,
                    'status': 503,
                    'message': 'Flight booking service is temporarily unavailable. Please try again shortly.',
                };
            }
            const offersData = offers['data'] ?? [];
            const prices = await Promise.all(
                offersData.map((offer) =>
                    this.markup_rate(parseFloat(offer?.price?.grandTotal) ?? 0)
                )
            );
            const durations = offersData.map((offer) => {
                let totalMinutes = 0;

                for (const itinerary of offer?.itineraries ?? []) {
                    const duration = itinerary?.duration ?? '';
                    const match = duration.match(/PT(\d+H)?(\d+M)?/);

                    if (match) {
                        const hours = match[1] ? parseInt(match[1]) : 0;
                        const minutes = match[2] ? parseInt(match[2]) : 0;
                        totalMinutes += hours * 60 + minutes;
                    }
                }

                return totalMinutes;
            });
            const cashback = await this.ps.flights_service_providers.findFirst({
                where: { name: 'amadeus' },
                select: { cashback_enabled: true, cashback_points: true }
            });
            const dictionaries = offers['dictionaries'] ?? {};

            const formattedOffers = offersData.map((offer) => ({
                ...offer,
                encoded: this.offerCodecService.encode({
                    offer,
                    dictionaries, // ← include dictionaries
                }),
            }));
            return {
                success: true,
                status: 200,
                data: {
                    offers: formattedOffers,
                    dictionaries: offers['dictionaries'] ?? [],
                    meta: {
                        min_price: Math.min(...prices),
                        max_price: Math.max(...prices),
                        min_duration_hours: Math.floor(Math.min(...durations) / 60),
                        cashback_enabled: cashback?.cashback_enabled ?? false,
                        cashback_value: cashback?.cashback_points ?? 0,
                        tamara: {
                            installments_count: this.tamara_installments_count,
                            logo: this.tamara_logo,
                            label: `${this.tamara_installments_count} ${this.tamara_label}`,
                        },
                    },
                },
            };
        } catch (err) {
            return {
                success: false,
                status: err.status ?? 503,
                message: err.messages?.join(', ') ?? 'Flight booking service is temporarily unavailable.',
            };

        }

    }
    async select(offerEncoded: string) {
        const accessToken = await this.amadeusService.authenticate();

        const decoded = this.offerCodecService.decode(offerEncoded);
            const offer = decoded?.offer ?? decoded;
            const dictionaries = decoded?.dictionaries ?? null;
        console.log(JSON.stringify(offer, null, 2));
        const result = await this.amadeusService.selectFlightOffer(
            offer,
            dictionaries
        );

        return {
            success: true,
            data: result,
        };
    }
    async seatMap(encodedOffer: string) {
        const accessToken = await this.amadeusService.authenticate();

        const offer = this.offerCodecService.decode(encodedOffer);

        const seatmap = await this.amadeusService.flightOfferSeatMap(
            offer,
            accessToken,
        );

        return seatmap;
    }
    // async priceOffer(encodedOffer: string) {
    //     const accessToken = await this.amadeusService.authenticate();

    //     const offer = this.offerCodecService.decode(encodedOffer);

    //     const pricedOffer = await this.amadeusService.getPricedOffer(
    //         'v2',
    //         offer,
    //         accessToken,
    //     );

    //     return pricedOffer;
    // }
    // async upsale(encodedOffer: string) {
    //     const accessToken = await this.amadeusService.authenticate();

    //     const offer = this.codec.decode(encodedOffer);

    //     const upsale = await this.amadeusService.flightOfferUpsale(
    //         'v2',
    //         offer,
    //         accessToken,
    //     );

    //     return upsale;
    // }
    // async getToken() {
    //     return this.amadeusService.authenticate();
    // }
}



