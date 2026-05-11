import { Test, TestingModule } from '@nestjs/testing';
import { CodecService } from './offercodec.service';

describe('CodecService', () => {
  let service: CodecService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodecService],
    }).compile();

    service = module.get<CodecService>(CodecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
