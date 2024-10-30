import { Injectable, BadRequestException, UseGuards } from '@nestjs/common';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import { toBigInt } from 'ethers';
import { Utils } from 'alchemy-sdk';
import { PrivyService } from '../privy/privy.service';
import * as communityData from '../data/communityData.json';
import { ConfigService } from '@nestjs/config';
import { PrivyGuard } from 'src/privy/privy.guard';
import { EAS_CONFIG } from 'src/config/siteConfig';
import { Contract } from 'ethers';
import axios from 'axios';

interface VouchingSeason {
  startTimestamp: bigint;
  endTimestamp: bigint;
  maxTotalVouches: bigint;
  totalVouches: bigint;
}

interface Attestation {
  attester: string;
  timeCreated: string;
  recipient: string;
}

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
  async createAttestation(authorization: string, data: { platform: string; recipient: string; attester: string; signature: string; category:string; subcategory:string; }) {
    const { platform, recipient, attester, signature, category, subcategory } = data;

    // Check if attester and recipient are the same
    if (attester.toLowerCase() === recipient.toLowerCase()) {
      throw new BadRequestException("Error: You cannot vouch for yourself.");
    }

    const communityKey = `${category}/${subcategory}/${platform}`;
    const communityInfo = Object.values(communityData).find(
      info => `${info.category}/${info.subcategory}/${info.platform}` === communityKey
    );

    if (!communityInfo) {
      throw new BadRequestException('Invalid community information');
    }

    // Check if the attester has already vouched for this recipient
    const hasVouched = await this.hasAlreadyVouched(
      attester,
      recipient,
      communityInfo.schema,
      category,
      subcategory,
      platform
    );

    if (hasVouched) {
      throw new BadRequestException('You have already vouched for this user in this season');
    }

    const easContractAddress = communityInfo.verifyingContract;
    const schemaUID = communityInfo.schema;

    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);

    const schemaEncoder = new SchemaEncoder("bytes32 platform,bytes32 category,bytes32 subCategory");
    const encodedData = schemaEncoder.encodeData([
      { name: "platform", value: ethers.encodeBytes32String(platform), type: "bytes32" },
      { name: "category", value: ethers.encodeBytes32String(category), type: "bytes32" },
      { name: "subCategory", value: ethers.encodeBytes32String(subcategory), type: "bytes32" }
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

  @UseGuards(PrivyGuard)
  async revokeAttestation(authorization: string, data: { signature: string; uid: string, address: string }) {
    const { signature, uid, address } = data;

    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const schemaUID = EAS_CONFIG.VOUCH_SCHEMA;

    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);

    const expandedSig = Utils.splitSignature(signature);

    const transaction = await eas.revokeByDelegation({
      schema: schemaUID,
      data: {
        uid: uid,
      },
      signature: expandedSig,
      revoker: address,
      deadline: toBigInt(0)
    });

    const newAttestationRevoke = await transaction.wait();

    return newAttestationRevoke;
  }

  async getEasNonce(attester: string): Promise<string> {
    if (!attester) {
      throw new BadRequestException('Attester is required');
    }

    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const eas = new EAS(easContractAddress);
    await eas.connect(this.signer);
    const easNonce = await eas.getNonce(attester);

    return easNonce.toString();
  }

  async getCurrentSeason(): Promise<VouchingSeason> {
    const vouchingContract = new Contract(
      EAS_CONFIG.VOUCHING_CONTRACT_ADDRESS,
      [
        'function currentSeason() view returns (uint256)',
        'function vouchingSeasons(uint256) view returns (uint256, uint256, uint256, uint256)'
      ],
      this.provider
    );
    
    const seasonNumber = await vouchingContract.currentSeason();
    const currentSeason = await vouchingContract.vouchingSeasons(seasonNumber);
    return {
      startTimestamp: currentSeason[0],
      endTimestamp: currentSeason[1],
      maxTotalVouches: currentSeason[2],
      totalVouches: currentSeason[3]
    };
  }

  async hasAlreadyVouched(attester: string, recipient: string, schemaId: string, category: string, subcategory: string, platform: string): Promise<boolean> {
    // Get current season info
    const seasonInfo = await this.getCurrentSeason();
    
    // Prepare GraphQL query with converted bigint timestamps
    const query = `
      query Attestations($where: AttestationWhereInput) {
        attestations(where: $where) {
          attester
          timeCreated
          recipient
        }
      }
    `;

    const variables = {
      where: {
        AND: [
          {
            decodedDataJson: {
              contains: ethers.encodeBytes32String(platform)
            }
          },
          {
            decodedDataJson: {
              contains: ethers.encodeBytes32String(category)
            }
          },
          {
            decodedDataJson: {
              contains: ethers.encodeBytes32String(subcategory)
            }
          },
          {
            timeCreated: {
              gte: Number(seasonInfo.startTimestamp)
            }
          },
          {
            timeCreated: {
              lte: Number(seasonInfo.endTimestamp)
            }
          }
        ],
        schemaId: {
          equals: schemaId
        },
        revoked: {
          equals: false
        },
        attester: {
          equals: ethers.getAddress(attester)
        },
        recipient: {
          equals: ethers.getAddress(recipient)
        }
      }
    };

    try {
      const response = await axios.post(EAS_CONFIG.GRAPHQL_URL, {
        query,
        variables
      });
      const attestations: Attestation[] = response.data.data.attestations;
      return attestations.length > 0;
    } catch (error) {
      console.error('Error checking attestations:', error);
      throw new BadRequestException('Failed to check attestation status');
    }
  }
}
