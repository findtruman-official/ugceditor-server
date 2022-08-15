import { Test, TestingModule } from '@nestjs/testing';
import { TezosGhostTestnetService } from './tezos-ghost-testnet.service';

describe('TezosGhostTestnetService', () => {
  let service: TezosGhostTestnetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TezosGhostTestnetService],
    }).compile();

    service = module.get<TezosGhostTestnetService>(TezosGhostTestnetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
