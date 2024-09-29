import { type CoinPublicKey, type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type MidnightProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { type Logger } from 'pino';
import { type CounterContract, type CounterProviders, type DeployedCounterContract, type PrivateStates } from './common-types.js';
import { type Config } from './config.js';
export declare const getCounterLedgerState: (providers: CounterProviders, contractAddress: ContractAddress) => Promise<bigint | null>;
export declare const createCounterContract: (coinPublicKey: CoinPublicKey) => CounterContract;
export declare const joinContract: (providers: CounterProviders, contractAddress: string) => Promise<DeployedCounterContract>;
export declare const deploy: (providers: CounterProviders) => Promise<DeployedCounterContract>;
export declare const increment: (counterContract: DeployedCounterContract) => Promise<{
    blockHeight: number;
    txHash: string;
}>;
export declare const displayCounterValue: (providers: CounterProviders, counterContract: DeployedCounterContract) => Promise<{
    counterValue: bigint | null;
    contractAddress: string;
}>;
export declare const createWalletAndMidnightProvider: (wallet: Wallet) => Promise<WalletProvider & MidnightProvider>;
export declare const waitForFunds: (wallet: Wallet) => Promise<bigint>;
export declare const buildWalletAndWaitForFunds: ({ indexer, indexerWS, node, proofServer }: Config, seed: string) => Promise<Wallet & Resource>;
export declare const randomBytes: (length: number) => Uint8Array;
export declare const buildFreshWallet: (config: Config) => Promise<Wallet & Resource>;
export declare const configureProviders: (wallet: Wallet & Resource, config: Config) => Promise<{
    privateStateProvider: import("@midnight-ntwrk/midnight-js-types").PrivateStateProvider<PrivateStates>;
    publicDataProvider: import("@midnight-ntwrk/midnight-js-types").PublicDataProvider;
    zkConfigProvider: NodeZkConfigProvider<"increment">;
    proofProvider: import("@midnight-ntwrk/midnight-js-types").ProofProvider<string>;
    walletProvider: WalletProvider & MidnightProvider;
    midnightProvider: WalletProvider & MidnightProvider;
}>;
export declare function setLogger(_logger: Logger): void;
export declare function processSeeds(): void;
