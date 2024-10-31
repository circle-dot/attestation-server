import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PodService } from './pod.service';
import { PrivyGuard } from '../privy/privy.guard';
import { Request as ExpressRequest } from 'express';
import { AuthTokenClaims } from '@privy-io/server-auth';

interface PrivyRequest extends ExpressRequest {
  privyAuthTokenClaims: AuthTokenClaims;
}

interface ProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  boundConfig: {
    circuitIdentifier: string;
    pods: any;
    tuples: any;
  };
  revealedClaims: {
    pods: {
      ticket: {
        entries: any;
        signerPublicKey: string;
      };
    };
    membershipLists: any;
  };
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

  @Post('verify-proof')
  // @UseGuards(PrivyGuard)
  async verifyProof(
    // @Req() req: PrivyRequest,
    @Body() proofData: ProofData
  ) {
    return this.podService.verifyProof(proofData);
  }
}
