import { Test, TestingModule } from '@nestjs/testing';
import { KlaytnBaobabService } from './klaytn-baobab.service';

describe('KlaytnBaobabService', () => {
  let service: KlaytnBaobabService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KlaytnBaobabService],
    }).compile();

    service = module.get<KlaytnBaobabService>(KlaytnBaobabService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
