import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Binding, type FinalizedTransaction, Proof, SignatureEnabled, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';

import * as VeilMarkContract from '../../../managed/private-progress-counter/contract/index.js';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';

export const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID || 'preprod') as NetworkId;
export const CONTRACT_ADDRESS = import.meta.env.VITE_DEFAULT_CONTRACT || '';
export const privateProgressStateId = 'private-progress-state' as const;

type CircuitKeys = 'recordPrivateProgress';

interface VeilMarkPrivateState {
  readonly secret: Uint8Array;
}

export interface PublicProgressState {
  readonly totalProofs: bigint;
  readonly latestPeriod: string | null;
  readonly latestCommitment: string | null;
}

export interface ProofResult extends PublicProgressState {
  readonly transactionId: string;
}

const witnesses: VeilMarkContract.Witnesses<VeilMarkPrivateState> = {
  localSecret: ({ privateState }) => [privateState, new Uint8Array(privateState.secret)],
};

const compiledContract = CompiledContract.make(
  'private-progress-counter',
  VeilMarkContract.Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./managed/private-progress-counter'),
);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getPrivateState(): VeilMarkPrivateState {
  const storageKey = 'veilmark-private-progress-key-v1';
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return { secret: Uint8Array.from(atob(stored), (character) => character.charCodeAt(0)) };
  }

  const secret = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(storageKey, btoa(String.fromCharCode(...secret)));
  return { secret };
}

export function createPeriodTag(date = new Date()): Uint8Array {
  const tag = new Uint8Array(32);
  tag.set(new TextEncoder().encode(date.toISOString().slice(0, 10)));
  return tag;
}

function decodePeriodTag(tag: Uint8Array): string | null {
  const decoded = new TextDecoder().decode(tag).replace(/\0+$/g, '');
  return decoded || null;
}

function normalizePublicState(state: VeilMarkContract.Ledger): PublicProgressState {
  const commitment = bytesToHex(state.latestCommitment);
  return {
    totalProofs: state.verifiedCheckIns,
    latestPeriod: decodePeriodTag(state.latestPeriod),
    latestCommitment: /^0+$/.test(commitment) ? null : commitment,
  };
}

export async function createVeilMarkClient(connectedAPI: ConnectedAPI, contractAddress = CONTRACT_ADDRESS) {
  if (!/^[0-9a-f]{64}$/i.test(contractAddress)) {
    throw new Error('The configured Preprod contract address is invalid.');
  }

  setNetworkId(NETWORK_ID);
  const configuration = await connectedAPI.getConfiguration();
  if (configuration.networkId !== NETWORK_ID) {
    throw new Error(`Network mismatch: switch Lace to ${NETWORK_ID}.`);
  }
  if (!configuration.proverServerUri) {
    throw new Error('Lace has no proof-server URL configured.');
  }

  // Lace can retain a stale prover URL even when the DApp is running locally.
  // For the local recording flow, use the verified loopback proof server that
  // ships with this project instead of inheriting an unrelated wallet setting.
  const isLocalApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const proofServerUri = isLocalApp
    ? 'http://localhost:6300'
    : configuration.proverServerUri;

  const shielded = await connectedAPI.getShieldedAddresses();
  const assetBaseURL = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
  const zkConfigProvider = new FetchZkConfigProvider<CircuitKeys>(assetBaseURL, fetch.bind(window));
  const privateStateProvider = inMemoryPrivateStateProvider<typeof privateProgressStateId, VeilMarkPrivateState>();
  privateStateProvider.setContractAddress(contractAddress as ContractAddress);

  const publicDataProvider = indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri);
  const providers = {
    privateStateProvider,
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider,
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (transaction: UnboundTransaction): Promise<FinalizedTransaction> => {
        const balanced = await connectedAPI.balanceUnsealedTransaction(toHex(transaction.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(balanced.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (transaction: FinalizedTransaction) => {
        await connectedAPI.submitTransaction(toHex(transaction.serialize()));
        return transaction.identifiers()[0];
      },
    },
  };

  const deployed = await findDeployedContract(providers, {
    compiledContract,
    contractAddress: contractAddress as ContractAddress,
    privateStateId: privateProgressStateId,
    initialPrivateState: getPrivateState(),
  });

  const readPublicState = async (): Promise<PublicProgressState> => {
    const contractState = await publicDataProvider.queryContractState(contractAddress as ContractAddress);
    if (!contractState) throw new Error('The Preprod contract is not indexed yet.');
    return normalizePublicState(VeilMarkContract.ledger(contractState.data));
  };

  return {
    readPublicState,
    async proveToday(): Promise<ProofResult> {
      const transaction = await deployed.callTx.recordPrivateProgress(createPeriodTag());
      const publicState = await readPublicState();
      return {
        ...publicState,
        transactionId: transaction.public.txId,
      };
    },
  };
}
