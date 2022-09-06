import { Test, TestingModule } from '@nestjs/testing';
import { KlaytnBaobabController } from './klaytn-baobab.controller';

describe('KlaytnBaobabController', () => {
  let controller: KlaytnBaobabController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlaytnBaobabController],
    }).compile();

    controller = module.get<KlaytnBaobabController>(KlaytnBaobabController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
