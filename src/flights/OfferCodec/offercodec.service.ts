import { Injectable } from '@nestjs/common';

@Injectable()
export class OfferCodecService {
    encode(data: any): string {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }

    decode(encoded: string): any {
        return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    }
}
