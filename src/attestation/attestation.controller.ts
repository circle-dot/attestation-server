import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AttestationService } from './attestation.service';

@Controller('attestation')
export class AttestationController {
  constructor(private readonly attestationService: AttestationService) {}

  @Post()
  async createAttestation(
    @Headers('authorization') authorization: string,
    @Body() body: { platform: string; recipient: string; attester: string; signature: string }
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
}