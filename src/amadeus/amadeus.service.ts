import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { Cache } from '@nestjs/cache-manager';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
@Injectable()
export class AmadeusService implements OnModuleInit {
    protected settings
    protected clientId
    protected clientSecret
    protected baseUrl;
    constructor(private httpService: HttpService, @Inject(CACHE_MANAGER) private cache: Cache, private ps: PrismaService) { }

    async onModuleInit() {
        this.settings = await this.ps.flights_service_providers.findFirst();
        this.clientId = this.settings.client_id ?? null;
        this.clientSecret = this.settings.client_secret ?? null;
        this.baseUrl = this.settings.base_url ?? 'https://test.travel.api.amadeus.com';
    }
    async authenticate() {
        const amadeus_access_token = await this.cache.get('amadeus_access_token')
        if (amadeus_access_token) {
            return amadeus_access_token;
        }
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
        })
        const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/v1/security/oauth2/token`, params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        ));
        const token = response.data.access_token;
        this.cache.set('amadeus_access_token', token, 29 * 60 * 1000);
        return token;
    }
    async searchFlightOffers(data: any, access_token, dictionaries?: any) {
        access_token = access_token ?? await this.authenticate();
        const payload: any = {};
        payload['currencyCode'] = 'SAR';
        // if (auth() -> check()) {
        //     payload['currencyCode'] = auth() -> user() -> currency -> code ?? 'SAR';
        // } else {
        //     payload['currencyCode'] = session('currency') ?? 'SAR';
        // }
        const type = data['type'] ?? 'oneway';
        const travelClass = data['travelClass'] ?? 'ECONOMY';

        if (type === 'oneway' || type === 'roundtrip') {
            const departureCityId = data['departure_city_id'][0] ?? null;
            const destinationCityId = data['destination_city_id'][0] ?? null;
            const selectedDate = data['selectedDate'][0] ?? null;

            const origin_airport = await this.ps.airports.findFirst({ where: { id: departureCityId }, select: { iata_code: true } });
            const origin_iata = origin_airport?.iata_code;

            const destination_airport = await this.ps.airports.findFirst({ where: { id: destinationCityId }, select: { iata_code: true } });
            const destination_iata = destination_airport?.iata_code;

            if (!origin_iata || !destination_iata) {
                throw new BadRequestException('Invalid origin or destination city.');
            }

            if (type === 'oneway') {
                // One-way trip
                const departure_date = dayjs(selectedDate, 'DD.MM.YYYY').format('YYYY-MM-DD');

                payload['originDestinations'] = [
                    {
                        'id': '1',
                        'originLocationCode': origin_iata,
                        'destinationLocationCode': destination_iata,
                        'departureDateTimeRange': {
                            'date': departure_date,
                        },
                    },
                ];
            } else {
                // Round trip — selectedDate is an array: [departureDate, returnDate]
                const returnRaw = data['selectedDate'][1] ?? null;
                if (!returnRaw) {
                    throw new BadRequestException('Invalid roundtrip date format. Expected two dates in selectedDate array.');
                }

                const departure_date = dayjs(selectedDate, 'DD.MM.YYYY').format('YYYY-MM-DD');
                const return_date = dayjs(returnRaw, 'DD.MM.YYYY').format('YYYY-MM-DD');

                payload['originDestinations'] = [
                    {
                        'id': '1',
                        'originLocationCode': origin_iata,
                        'destinationLocationCode': destination_iata,
                        'departureDateTimeRange': {
                            'date': departure_date,
                        },
                    },
                    {
                        'id': '2',
                        'originLocationCode': destination_iata,
                        'destinationLocationCode': origin_iata,
                        'departureDateTimeRange': {
                            'date': return_date,
                        },
                    },
                ];
            }
        }
        // ========== MULTICITY (keep as is) ==========
        else if (type === 'multicity') {
            payload['originDestinations'] = [];

            const departureCityIds = data['departure_city_id'] ?? [];
            const destinationCityIds = data['destination_city_id'] ?? [];
            const selectedDates = data['selectedDate'] ?? [];

            for (const [index, departureId] of departureCityIds.entries()) {
                const origin_airport = await this.ps.airports.findFirst({ where: { id: departureId }, select: { iata_code: true } });
                const origin_iata = origin_airport?.iata_code;
                const destination_airport = await this.ps.airports.findFirst({ where: { id: destinationCityIds[index] ?? null }, select: { iata_code: true } });
                const destination_iata = destination_airport?.iata_code;
                const rawDate = selectedDates[index] ?? null;

                if (!origin_iata || !destination_iata || !rawDate) {
                    continue;
                }

                const date = dayjs(rawDate, 'DD.MM.YYYY').format('YYYY-MM-DD');

                payload['originDestinations'].push({
                    'id': String(index + 1),
                    'originLocationCode': origin_iata,
                    'destinationLocationCode': destination_iata,
                    'departureDateTimeRange': {
                        'date': date,
                    },
                });
            }
        }

        // ========== TRAVELERS ==========
        const travelers: any[] = [];
        const passengers = data['passengers'] ?? 'Adults=1, Children=0, Infants=0, Total=1';
        const cleaned = passengers.replace(/,\s*/g, '&');
        const parsedPassengers = new URLSearchParams(cleaned);

        const adults = parseInt(parsedPassengers.get('Adults') ?? '1');
        const children = parseInt(parsedPassengers.get('Children') ?? '0');
        const infants = parseInt(parsedPassengers.get('Infants') ?? '0');

        let traveler_id = 1;
        const adult_ids: string[] = [];
        for (let i = 0; i < adults; i++) {
            const id = String(traveler_id++);
            adult_ids.push(id);
            travelers.push({
                id: id,
                travelerType: 'ADULT',
                fareOptions: ['STANDARD'],
            });
        }

        for (let i = 0; i < children; i++) {
            travelers.push({
                id: String(traveler_id++),
                travelerType: 'CHILD',
                fareOptions: ['STANDARD'],
            });
        }

        for (let i = 0; i < infants; i++) {
            const associatedAdultId = adult_ids[i % adult_ids.length];
            travelers.push({
                id: String(traveler_id++),
                travelerType: 'HELD_INFANT',
                associatedAdultId: associatedAdultId,
                fareOptions: ['STANDARD'],
            });
        }

        payload['travelers'] = travelers;

        // ========== SOURCES ==========
        payload['sources'] = type === 'multicity' ? ['GDS', 'NDC', 'LTC'] : ['GDS'];

        // ========== SEARCH CRITERIA ==========
        if (type !== 'multicity') {
            payload['searchCriteria'] = {
                'cabinRestrictions': {
                    'cabin': travelClass,
                    'coverage': 'ALL_SEGMENTS',
                },
                'pricingOptions': {
                    'fareType': ['PUBLISHED'],
                    'includedCheckedBagsOnly': false,
                },
                'additionalInformation': {
                    'chargeableCheckedBags': false,
                    'brandedFares': true,
                },
                'flightFilters': {
                    'connectionRestriction': {
                        'maxNumberOfConnections': '0',
                    },
                },
            };
            payload['searchCriteria']['maxFlightOffers'] = 100;
        }

        // max flight offers
        // ========== SEND REQUEST ==========
        const response = await firstValueFrom(this.httpService.post(
            `${this.baseUrl}/v2/shopping/flight-offers`,
            payload,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${access_token}`,
                }
            }

        ).pipe(
            catchError((error) => {
                const amadeus_errors = error.response?.data?.errors ?? [];
                return throwError(() => ({
                    error: true,
                    status: error.response?.status ?? 500,
                    messages: amadeus_errors.map(e => e.detail ?? e.title),
                }));
            })
        ));

        return response.data;

    }
    async selectFlightOffer(offer: any, access_token?: string, dictionaries?: any) {
        const token = access_token ?? await this.authenticate();

        // call pricing
        const priced = await this.getPricedOffer('v2', offer, token, dictionaries);
        const upsale = await this.flightOfferUpsale('v2', offer, token);

        const pricedOffer = priced?.data?.flightOffers?.[0] ?? null;

        let baseFare = 0;
        let taxes = 0;
        let currency = 'SAR';

        if (pricedOffer) {
            for (const tp of pricedOffer.travelerPricings ?? []) {
                baseFare += Number(tp.price?.base ?? 0);

                for (const tax of tp.price?.taxes ?? []) {
                    taxes += Number(tax.amount ?? 0);
                }

                currency = tp.price?.currency ?? currency;
            }
        }

        const itineraries = offer?.itineraries ?? [];

        const firstSegment = itineraries?.[0]?.segments?.[0];
        const lastSegment = itineraries?.at(-1)?.segments?.at(-1);

        return {
            offer,
            pricedOffer: priced?.data ?? null,
            fareUpsale: upsale?.data ?? null,

            baseFare,
            taxes,
            total: baseFare + taxes,
            currency,

            departureCity: firstSegment?.departure?.iataCode ?? null,
            arrivalCity: lastSegment?.arrival?.iataCode ?? null,
        };
    }
    async getPricedOffer(version: string, offer: any, access_token?: string, dictionaries?: any) {
        {
            try {
                const token = access_token ?? await this.authenticate();
                const body: any = {
                    data: {
                        type: 'flight-offers-pricing',
                        flightOffers: [offer],
                    },
                };

                // include dictionaries if available
                if (dictionaries) {
                    body.data['dictionaries'] = dictionaries;
                }
                const response = await firstValueFrom(
                    this.httpService.post(
                        `${this.baseUrl}/v1/shopping/flight-offers/pricing?include=other-services,bags`,
                        body,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    ),
                );

                return response.data;

            } catch (e) {
                console.log('Pricing error:', JSON.stringify(e.response?.data, null, 2));
                throw new BadRequestException(e.response?.data ?? 'Pricing failed');
            }
        }
    }
    async flightOfferUpsale(
            version: string,
            offer: any,
            access_token ?: string,
        ) {
            const token = access_token ?? await this.authenticate();

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/v1/shopping/flight-offers/upselling`,
                    {
                        data: {
                            type: 'flight-offers-upselling',
                            flightOffers: [offer],
                        },
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                    },
                ),
            );

            return response.data;
        }
    async flightOfferSeatMap(
            offer: any,
            access_token ?: string,
        ) {
            const token = access_token ?? await this.authenticate();

            const requestBody = offer?.data
                ? offer
                : { data: [offer] };

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.baseUrl}/v1/shopping/seatmaps`,
                    requestBody,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        timeout: 6000,
                    },
                ),
            );

            return response.data;
        }
    }

