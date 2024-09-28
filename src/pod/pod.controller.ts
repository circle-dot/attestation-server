import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PodService } from './pod.service';
import { PrivyGuard } from '../privy/privy.guard';

@Controller('pod')
export class PodController {
  constructor(private readonly podService: PodService) {}

  @Post('create')
  // @UseGuards(PrivyGuard)
  async createPodpcd(@Body() body: { owner: string; wallet: string }) {
    const { owner, wallet } = body;
    return this.podService.createOrRetrievePodpcd(owner, wallet);
  }
}
