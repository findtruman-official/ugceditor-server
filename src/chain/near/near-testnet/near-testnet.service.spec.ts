import { Test, TestingModule } from '@nestjs/testing';
import { NearTestnetService } from './near-testnet.service';

describe('NearTestnetService', () => {
  let service: NearTestnetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NearTestnetService],
    }).compile();

    service = module.get<NearTestnetService>(NearTestnetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
