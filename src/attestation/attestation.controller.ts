import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException, InternalServerErrorException, Get, Query } from '@nestjs/common';
import { AttestationService } from './attestation.service';

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
}