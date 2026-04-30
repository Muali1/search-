import { Test, TestingModule } from '@nestjs/testing';
import { AmadeusService } from './amadeus.service';

describe('AmadeusService', () => {
  let service: AmadeusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmadeusService],
    }).compile();

    service = module.get<AmadeusService>(AmadeusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
