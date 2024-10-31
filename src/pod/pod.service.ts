import { Injectable } from '@nestjs/common';
import { POD, podEntriesFromSimplifiedJSON } from "@pcd/pod";
import { Zupass, siteName } from 'src/config/siteConfig';
import { AuthTokenClaims } from '@privy-io/server-auth';
import {
  boundConfigFromJSON,
  boundConfigToJSON,
  gpcArtifactDownloadURL,
  gpcBindConfig,
  GPCProofConfig,
  GPCProofInputs,
  gpcProve,
  gpcVerify,
  proofConfigToJSON,
  revealedClaimsFromJSON,
  revealedClaimsToJSON
} from "@pcd/gpc";
import path from 'path';

@Injectable()
export class PodService {
  private readonly ZUPASS_SIGNING_KEY = process.env.ZUPASS_SIGNING_KEY;

  async createOrRetrievePodpcd( wallet: string, AgoraScore: string): Promise<string> {
    if (!this.ZUPASS_SIGNING_KEY) {
      throw new Error('Server configuration error: Signing key not set');
    }
    try {
      const pod = POD.sign(
        podEntriesFromSimplifiedJSON(JSON.stringify({
          zupass_display: Zupass.zupass_display,
          zupass_title: Zupass.zupass_title,
          zupass_image_url: Zupass.zupass_image_url,
          timestamp: new Date().toISOString(),
          issuer: siteName,
          wallet: wallet,
          AgoraScore: AgoraScore
         })),
        this.ZUPASS_SIGNING_KEY
       );
      return pod.serialize();
    } catch (error) {
      console.error('Error creating or retrieving POD:', error);
      throw new Error('Error creating or retrieving POD');
    }
  }

  async verifyProof(proofData: any): Promise<void> {
    const { proof, boundConfig, revealedClaims } = proofData;
    
    // Extract the required values
    const circuitIdentifier = boundConfig.circuitIdentifier;
    const signerPublicKey = revealedClaims.pods.ticket.signerPublicKey;
    const eventId = revealedClaims.pods.ticket.entries.eventId.value;

    const GPC_ARTIFACTS_PATH = path.join(
      __dirname,
      "../../../node_modules/@pcd/proto-pod-gpc-artifacts"
    );
    console.log("Local artifacts path", GPC_ARTIFACTS_PATH);
    // For now, just logging the values
    console.log('Circuit Identifier:', circuitIdentifier);
    console.log('Signer Public Key:', signerPublicKey);
    console.log('Event ID:', eventId);
    console.log('Proof:', proof);


    const isValid = await gpcVerify(
      proof,
      boundConfig,
      revealedClaims,
      GPC_ARTIFACTS_PATH
    );
    console.log("isValid", isValid);
    if (!isValid) {
      throw new Error("Proof didn't verify!");
    }


    
  // Note that `gpcVerify` only checks that the inputs are valid with
  // respect to each other.  You still need to check that everything is as
  // you expect.

  // If the config isn't hard-coded in the verifier, you need to ensure it's
  // suitable.  The canonicalization which happens in binding means you can
  // compare bound configs using a simple deep equals.
  // if (!_.isEqual(boundConfig, manualBoundConfig)) {
  //   throw new Error("Unexpected configuration.");
  // }

  // Verifiers should also always check that the PODs are signed by a trusted
  // authority with a known public key.
  const knownPublicKey = 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs'
  if (revealedClaims.pods.ticket.signerPublicKey !== knownPublicKey) {
    throw new Error("Unexpected signer.");
  }

  // Finally the verifier can look at the revealed claims and decide what to do
  // with them.
  console.log(
    "revealedClaims",
    revealedClaims
  );
 //////////////////////////////////////////////////////////////////////////////
  // The proof outputs can be serialized for transmission between prover and
  // verifier.
  //////////////////////////////////////////////////////////////////////////////

  // Proof config (bound or unbound) and revealed claims can be converted to
  // a JSON-compatible form to be serialized.
  // The proof itself is already a simple JSON object.
  // In most cases, they'd be sent from prover to verifier across the network,
  // so the prover would serialize them something like this:
  const serializedGPC = JSON.stringify({
    proof: proof,
    config: boundConfigToJSON(boundConfig),
    revealed: revealedClaimsToJSON(revealedClaims)
  });

console.log("serializedGPC", serializedGPC);
  }
}