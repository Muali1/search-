export function transformFlightOffer(offer: any, markedUpPrice: number, logos: Record<string, string> = {}) {
    return {
        id: offer['id'] ?? null,
        oneWay: offer['oneWay'] ?? false,
        numberOfBookableSeats: offer['numberOfBookableSeats'] ?? null,
        validatingAirlineCodes: offer['validatingAirlineCodes'] ?? [],
        price: {
            currency: offer['price']?.['currency'] ?? null,
            total: markedUpPrice,
        },
        itineraries: (offer['itineraries'] ?? []).map((itinerary: any) => ({
            duration: itinerary['duration'] ?? null,
            segments: (itinerary['segments'] ?? []).map((segment: any) => ({
                id: segment['id'] ?? null,
                duration: segment['duration'] ?? null,
                numberOfStops: segment['numberOfStops'] ?? 0,
                carrierCode: segment['carrierCode'] ?? null,
                logo: logos[segment['carrierCode']] ?? null,
                departure: {
                    iataCode: segment['departure']?.['iataCode'] ?? null,
                    at: segment['departure']?.['at'] ?? null,
                },
                arrival: {
                    iataCode: segment['arrival']?.['iataCode'] ?? null,
                    at: segment['arrival']?.['at'] ?? null,
                },
            })),
        })),
    };
}