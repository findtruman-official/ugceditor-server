import { Test, TestingModule } from '@nestjs/testing';
import { SolanaDevnetService } from './solana-devnet.service';

describe('SolanaDevnetChainService', () => {
  let service: SolanaDevnetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SolanaDevnetService],
    }).compile();

    service = module.get<SolanaDevnetService>(SolanaDevnetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
