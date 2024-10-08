import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { isEqualEdDSAPublicKey } from '@pcd/eddsa-pcd';
import { ethers } from 'ethers';
import { EAS_CONFIG } from 'src/config/siteConfig';
import { HandleAttestService } from './handleAttest.service';
import { TicketTypeName } from 'src/config/zupass/types';
import { whitelistedTickets, matchTicketToType } from 'src/config/zupass/zupass-config';

@Injectable()
export class PcdsService {
  constructor(private readonly handleAttestService: HandleAttestService) {}

  async validatePCDs(body: { pcds: any[]; user: any }) {
    const { pcds: inputPCDs, user } = body;
    const responses = [];
    let hasError = false;

    for (const inputPCD of inputPCDs) {
      let response: { 
        error?: string; 
        status: number; 
        nullifier?: string; 
        attestationUID?: string;
        productId?: string;
        eventId?: string;
      } = { status: 200 };

      let productId: string | undefined;
      let eventId: string | undefined;

      try {
        console.log("Attempting to process PCD:", JSON.stringify(inputPCD));
        
        // Parse the PCD if it's a string
        const pcd = typeof inputPCD.pcd === 'string' ? JSON.parse(inputPCD.pcd) : inputPCD.pcd;
        console.log("Parsed PCD:", JSON.stringify(pcd));

        if (!pcd || !pcd.claim || !pcd.claim.partialTicket) {
          throw new Error("Invalid PCD structure: missing claim or partialTicket");
        }

        ({ productId, eventId } = pcd.claim.partialTicket);
        response.productId = productId;
        response.eventId = eventId;

        console.log(`Matching ticket type for eventId: ${eventId}, productId: ${productId}`);
        if (!eventId || !productId) {
          throw new Error("EventId or ProductId is undefined");
        }
        const ticketType = matchTicketToType(eventId, productId);
        if (!ticketType) {
          console.log('Failed to match ticket type');
          throw new Error("Unable to determine ticket type.");
        }
        console.log(`Matched ticket type: ${ticketType}`);

        const eventName = whitelistedTickets[ticketType].find(
          ticket => ticket.eventId === eventId && ticket.productId === productId
        )?.eventName;

        if (!eventName) {
          console.log('Failed to find event name');
          throw new Error("Unable to determine event name.");
        }

        if (!pcd.claim.nullifierHash) {
          response = {
            error: "PCD ticket nullifier has not been defined",
            status: 401,
            productId,
            eventId
          };
        } else {
          let isValid = false;

          console.log('Verifying Zupass signature...');
          console.log('PCD signer:', JSON.stringify(pcd.claim.signer));

          for (const type of Object.keys(whitelistedTickets) as TicketTypeName[]) {
            const tickets = whitelistedTickets[type];

            if (tickets) {
              for (const ticket of tickets) {
                const publicKey = ticket.publicKey;
                console.log('Checking against public key:', JSON.stringify(publicKey));

                if (isEqualEdDSAPublicKey(publicKey, pcd.claim.signer)) {
                  isValid = true;
                  console.log('Found matching public key');
                  break;
                }
              }
            }

            if (isValid) break;
          }

          if (!isValid) {
            console.error(`[ERROR] PCD is not signed by Zupass`);
            response = { 
              error: "PCD is not signed by Zupass", 
              status: 401,
              productId,
              eventId
            };
          } else {
            response.nullifier = pcd.claim.nullifierHash;

            try {
              const recipient = user.wallet.address;
              const nullifier = ethers.hexlify(
                ethers.keccak256(
                  ethers.concat([
                    ethers.toUtf8Bytes(pcd.claim.partialTicket.attendeeSemaphoreId),
                    ethers.toUtf8Bytes(productId)
                  ])
                ).slice(0, 66)
              );
              const category = EAS_CONFIG.CATEGORY;
              const subcategory = eventName;
              const issuer = ticketType;
              const credentialType = EAS_CONFIG.CREDENTIAL_TYPE;
              const platform = EAS_CONFIG.PLATFORM;

              const attestationUID = await this.handleAttestService.handleAttest(
                recipient,
                nullifier,
                category,
                subcategory,
                issuer,
                credentialType,
                platform
              );

              response.attestationUID = attestationUID;
              response.productId = productId;
              response.eventId = eventId;
              response.nullifier = nullifier;
              console.log("Attestation created successfully:", attestationUID);
            } catch (attestError) {
              console.error("Error creating attestation:", attestError);
              response = { 
                error: attestError.message, // This will now include the specific smart contract error
                status: 500,
                productId,
                eventId
              };
            }
          }
        }
      } catch (error) {
        console.error('Error processing PCD:', error);
        response = { 
          error: error.message || "Error processing PCD", 
          status: 500,
          productId,
          eventId
        };
        hasError = true;
      }

      if (response.status !== 200) {
        hasError = true;
      }

      console.log("Response:", response);
      responses.push(response);
    }

    if (hasError) {
      throw new InternalServerErrorException(responses);
    }

    return responses;
  }
}