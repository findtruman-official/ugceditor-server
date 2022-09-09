import { Test, TestingModule } from '@nestjs/testing';
import { TezosJakartanetService } from './tezos-jakartanet.service';

describe('TezosJakartanetService', () => {
  let service: TezosJakartanetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TezosJakartanetService],
    }).compile();

    service = module.get<TezosJakartanetService>(TezosJakartanetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
