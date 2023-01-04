import { Test, TestingModule } from '@nestjs/testing';
import { IcService } from './ic.service';

describe('IcService', () => {
  let service: IcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IcService],
    }).compile();

    service = module.get<IcService>(IcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
