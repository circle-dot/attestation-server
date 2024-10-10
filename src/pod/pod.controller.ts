import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PodService } from './pod.service';
import { PrivyGuard } from '../privy/privy.guard';
import { Request as ExpressRequest } from 'express';
import { AuthTokenClaims } from '@privy-io/server-auth';

interface PrivyRequest extends ExpressRequest {
  privyAuthTokenClaims: AuthTokenClaims;
}

@Controller('pod')
export class PodController {
  constructor(private readonly podService: PodService) { }

  @Post('create')
  @UseGuards(PrivyGuard)
  async createPodpcd(@Req() req: PrivyRequest, @Body() body: {  wallet: string, AgoraScore: string }) {
    const { wallet, AgoraScore } = body;
    return this.podService.createOrRetrievePodpcd( wallet, AgoraScore);
  }
}
