import { Injectable } from '@nestjs/common';
import { AmadeusService } from 'src/amadeus/amadeus.service';
import { PrismaService } from 'src/prisma/prisma.service';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { transformFlightOffer } from './flights-offers.resource';
dayjs.extend(customParseFormat);
@Injectable()
export class FlightsService {
    protected tamara_installments_count = 4;
    protected tamara_logo = 'frontend/assets/images/tamara.svg';
    protected tamara_label = 'interest-free payments';
    constructor(private amadeusService: AmadeusService, private ps: PrismaService) {
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

            return {
                success: true,
                status: 200,
                data: {
                    offers:  await Promise.all(
                        offersData.map(async (offer, index) => {
                            const logos: Record<string, string> = {};

                            for (const itinerary of offer['itineraries'] ?? []) {
                                for (const segment of itinerary['segments'] ?? []) {
                                    const carrier = segment['carrierCode'];
                                    if (carrier && !logos[carrier]) {
                                        logos[carrier] = await this.amadeusService.getLogoByIata(carrier);
                                    }
                                }
                            }

                            return transformFlightOffer(offer, prices[index], logos);
                        })
                    ),
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
}



