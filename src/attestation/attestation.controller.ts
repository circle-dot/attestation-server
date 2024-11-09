import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException, InternalServerErrorException, Get, Query } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { StampAttestationRequest } from './attestation.service';

@Controller('attestation')
export class AttestationController {
  constructor(private readonly attestationService: AttestationService) {}

  @Post()
  async createAttestation(
    @Headers('authorization') authorization: string,
    @Body() body: { platform: string; recipient: string; attester: string; signature: string; category:string; subcategory:string; }
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header missing or invalid');
    }

    try {
      const newAttestationUID = await this.attestationService.createAttestation(authorization, body);
      return { newAttestationUID };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      } else if (error.reason === "Max vouches reach!") {
        throw new BadRequestException('Maximum number of vouches reached for this user');
      } else {
        console.error('Error creating attestation:', error);
        throw new InternalServerErrorException('Failed to create attestation');
      }
    }
  }

  @Get('nonce')
  async getEasNonce(@Query('attester') attester: string) {
    if (!attester) {
      throw new BadRequestException('Attester is required');
    }

    const easNonce = await this.attestationService.getEasNonce(attester);
    return { easNonce };
  }

  @Post('revoke')
  async revokeAttestation(
    @Headers('authorization') authorization: string,
    @Body() body: { signature: string; uid: string, address: string }
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header missing or invalid');
    }

    try {
      const revokedAttestation = await this.attestationService.revokeAttestation(authorization, body);
      return { revokedAttestation };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      } else if (error instanceof BadRequestException) {
        throw error;
      } else {
        console.error('Error revoking attestation:', error);
        throw new InternalServerErrorException('Failed to revoke attestation');
      }
    }
  }

  @Post('stamp')
  async handleStampAttestation(
    @Headers('x-api-key') apiKey: string,
    @Body() body: StampAttestationRequest
  ) {
    console.log('[Stamp Attestation] Received request:', JSON.stringify(body, null, 2));
    
    // Check API key
    if (!apiKey || apiKey !== process.env.API_KEY) {
      console.warn('[Stamp Attestation] Invalid or missing API key');
      throw new UnauthorizedException('Invalid or missing API key');
    }
    
    try {
      const result = await this.attestationService.handleStampAttestation(body);
      console.log('[Stamp Attestation] Success result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[Stamp Attestation] Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        console.error('[Stamp Attestation] Internal error details:', error);
        throw new InternalServerErrorException('Failed to handle stamp attestation');
      }
    }
  }
}