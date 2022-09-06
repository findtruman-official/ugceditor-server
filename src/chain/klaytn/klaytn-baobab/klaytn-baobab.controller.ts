import { Controller, Get, Param } from '@nestjs/common';
import { KlaytnBaobabService } from './klaytn-baobab.service';

@Controller('chains/klaytn-baobab')
export class KlaytnBaobabController {
  constructor(private readonly klaytnService: KlaytnBaobabService) {}

  @Get('sync-task/:storyId/:taskId')
  async syncStoryInfo(
    @Param('storyId') storyId: string,
    @Param('taskId') taskId: string,
  ): Promise<boolean> {
    await this.klaytnService.handleTaskUpdated({ storyId, taskId });
    return true;
  }
}
