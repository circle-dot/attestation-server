import { Injectable, BadRequestException, UseGuards } from '@nestjs/common';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import { toBigInt } from 'ethers';
import { Utils } from 'alchemy-sdk';
import { PrivyService } from '../privy/privy.service';
import * as communityData from '../data/communityData.json';
import { ConfigService } from '@nestjs/config';
import { PrivyGuard } from 'src/privy/privy.guard';

@Injectable()
export class AttestationService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;

  constructor(
    private readonly privyService: PrivyService,
    private readonly configService: ConfigService
  ) {
    const PRIVATE_KEY = this.configService.get<string>('PRIVATE_KEY')!;
    const ALCHEMY_URL = this.configService.get<string>('ALCHEMY_URL')!;

    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    this.signer = new ethers.Wallet(PRIVATE_KEY, this.provider);
  }

  @UseGuards(PrivyGuard)
  async createAttestation(authorization: string, data: { platform: string; recipient: string; attester: string; signature: string }) {
    const { platform, recipient, attester, signature } = data;
    console.log('communityData', communityData);

    const communityInfo = communityData[platform as keyof typeof communityData];
    if (!communityInfo) {
      throw new BadRequestException('Invalid platform');
    }

    const easContractAddress = communityInfo.verifyingContract;
    const schemaUID = communityInfo.schema;

    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);

    const schemaEncoder = new SchemaEncoder("bytes32 endorsement,bytes32 platform,bytes32 category");
    const encodedData = schemaEncoder.encodeData([
      { name: "endorsement", value: ethers.encodeBytes32String(communityInfo.endorsementType), type: "bytes32" },
      { name: "platform", value: ethers.encodeBytes32String(platform), type: "bytes32" },
      { name: "category", value: ethers.encodeBytes32String(communityInfo.category), type: "bytes32" }
    ]);

    const expandedSig = Utils.splitSignature(signature);

    const transaction = await eas.attestByDelegation({
      schema: schemaUID,
      data: {
        recipient: recipient,
        expirationTime: toBigInt(0),
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: encodedData
      },
      signature: expandedSig,
      attester: attester,
      deadline: toBigInt(0)
    });

    const newAttestationUID = await transaction.wait();
    console.log('New attestation UID:', newAttestationUID);

    return newAttestationUID;
  }
}