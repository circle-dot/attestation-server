import { Injectable } from '@nestjs/common';
import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { EAS_CONFIG } from 'src/config/siteConfig';
import { Wallet, JsonRpcProvider } from 'ethers';
import { Utils } from 'alchemy-sdk';

@Injectable()
export class HandleAttestService {
  async handleAttest(
    recipient: string,
    nullifier: string,
    category: string,
    subcategory: string,
    issuer: string,
    credentialType: string,
    platform: string,
    attester: string,
    signature: string
  ) {
    const easContractAddress = EAS_CONFIG.EAS_CONTRACT_ADDRESS;
    const schemaUID = EAS_CONFIG.PRETRUST_SCHEMA;
    const eas = new EAS(easContractAddress);

    const PRIVATE_KEY = process.env.PRIVATE_KEY!;
    const ALCHEMY_URL = process.env.ALCHEMY_URL!;

    const provider = new JsonRpcProvider(ALCHEMY_URL);
    const signer = new Wallet(PRIVATE_KEY, provider);

    // Connect the EAS instance to the signer
    eas.connect(signer);

    // Initialize SchemaEncoder with the schema string
    const schemaEncoder = new SchemaEncoder(
      'bytes32 nullifier, bytes32 category, bytes32 subcategory, bytes32 issuer, bytes32 credentialType, bytes32 platform'
    );
    const encodedData = schemaEncoder.encodeData([
      { name: 'nullifier', value: nullifier, type: 'bytes32' },
      { name: 'category', value: category, type: 'bytes32' },
      { name: 'subcategory', value: subcategory, type: 'bytes32' },
      { name: 'issuer', value: issuer, type: 'bytes32' },
      { name: 'credentialType', value: credentialType, type: 'bytes32' },
      { name: 'platform', value: platform, type: 'bytes32' },
    ]);

    const expandedSig = Utils.splitSignature(signature);

    // Create the attestation by delegation
    const tx = await eas.attestByDelegation({
      schema: schemaUID,
      data: {
        recipient: recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: encodedData,
      },
      signature: expandedSig,
      attester: attester,
      deadline: 0n,
    });

    // Wait for the transaction to be mined and get the attestation UID
    const newAttestationUID = await tx.wait();
    console.log('New attestation UID:', newAttestationUID);

    return newAttestationUID;
  }
}

export default HandleAttestService;