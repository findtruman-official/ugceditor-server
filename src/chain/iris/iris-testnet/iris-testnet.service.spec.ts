import { Test, TestingModule } from '@nestjs/testing';
import { IrisTestnetService } from './iris-testnet.service';

describe('IrisTestnetService', () => {
  let service: IrisTestnetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IrisTestnetService],
    }).compile();

    service = module.get<IrisTestnetService>(IrisTestnetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
