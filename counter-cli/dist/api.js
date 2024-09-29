import { encodeCoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, witnesses } from '@midnight-ntwrk/counter-contract';
import { nativeToken, Transaction } from '@midnight-ntwrk/ledger';
import { deployContract, findDeployedContract, withZswapWitnesses } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { createBalancedTx, } from '@midnight-ntwrk/midnight-js-types';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import * as crypto from 'crypto';
import { webcrypto } from 'crypto';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import { contractConfig } from './config.js';
import { toHex } from './conversion-utils.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import * as fs from 'fs';


let logger;
// @ts-expect-error: It's needed to make Scala.js and WASM code able to use cryptography
globalThis.crypto = webcrypto;
// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;
export const getCounterLedgerState = (providers, contractAddress) => providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? ledger(contractState.data).round : null));
export const createCounterContract = (coinPublicKey) => new Contract(withZswapWitnesses(witnesses)(encodeCoinPublicKey(coinPublicKey)));
export const joinContract = async (providers, contractAddress) => {
    const counterContract = await findDeployedContract(providers, contractAddress, createCounterContract(providers.walletProvider.coinPublicKey), {
        privateStateKey: 'counterPrivateState',
        initialPrivateState: {},
    });
    logger.info(`Joined contract at address: ${counterContract.finalizedDeployTxData.contractAddress}`);
    return counterContract;
};
export const deploy = async (providers) => {
    logger.info(`Deploying counter contract...`);
    const counterContract = await deployContract(providers, 'counterPrivateState', {}, createCounterContract(providers.walletProvider.coinPublicKey));
    logger.info(`Deployed contract at address: ${counterContract.finalizedDeployTxData.contractAddress}`);
    return counterContract;
};
export const increment = async (counterContract) => {
    logger.info('Incrementing...');
    const { txHash, blockHeight } = await counterContract.contractCircuitsInterface.increment();
    logger.info(`Transaction ${txHash} added in block ${blockHeight}`);
    return { txHash, blockHeight };
};
export const displayCounterValue = async (providers, counterContract) => {
    const contractAddress = counterContract.finalizedDeployTxData.contractAddress;
    const counterValue = await getCounterLedgerState(providers, contractAddress);
    if (counterValue === null) {
        logger.info(`There is no counter contract deployed at ${contractAddress}.`);
    }
    else {
        logger.info(`Current counter value: ${Number(counterValue)}`);
    }
    return { contractAddress, counterValue };
};
export const createWalletAndMidnightProvider = async (wallet) => {
    const state = await Rx.firstValueFrom(wallet.state());
    return {
        coinPublicKey: state.coinPublicKey,
        balanceTx(tx, newCoins) {
            return wallet
                .balanceTransaction(ZswapTransaction.deserialize(tx.tx.serialize()), newCoins)
                .then((tx) => wallet.proveTransaction(tx))
                .then((zswapTx) => Transaction.deserialize(zswapTx.serialize()))
                .then(createBalancedTx);
        },
        submitTx(tx) {
            return wallet.submitTransaction(tx.tx);
        },
    };
};
export const waitForFunds = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(10_000), Rx.tap((state) => {
    const scanned = state.syncProgress?.synced ?? 0n;
    const total = state.syncProgress?.total.toString() ?? 'unknown number';
    logger.info(`Wallet scanned ${scanned} blocks out of ${total}, transactions=${state.transactionHistory.length}`);
}), Rx.filter((state) => {
    // Let's allow progress only if wallet is close enough
    const synced = state.syncProgress?.synced ?? 0n;
    const total = state.syncProgress?.total ?? 1000n;
    return total - synced < 100n;
}), Rx.map((s) => s.balances[nativeToken()] ?? 0n), Rx.filter((balance) => balance > 0n)));
export const buildWalletAndWaitForFunds = async ({ indexer, indexerWS, node, proofServer }, seed) => {
    const wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, 'warn');
    wallet.start();
    const state = await Rx.firstValueFrom(wallet.state());
    logger.info(`Your wallet seed is: ${seed}`);
    logger.info(`Your wallet address is: ${state.address}`);
    let balance = state.balances[nativeToken()];
    if (balance === undefined || balance === 0n) {
        logger.info(`Your wallet balance is: 0`);
        logger.info(`Waiting to receive tokens...`);
        balance = await waitForFunds(wallet);
    }
    logger.info(`Your wallet balance is: ${balance}`);
    return wallet;
};
export const randomBytes = (length) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
};
export const buildFreshWallet = async (config) => await buildWalletAndWaitForFunds(config, toHex(randomBytes(32)));
export const configureProviders = async (wallet, config) => {
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    return {
        privateStateProvider: levelPrivateStateProvider({
            privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider(contractConfig.zkConfigPath),
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletAndMidnightProvider,
        midnightProvider: walletAndMidnightProvider,
    };
};
export function setLogger(_logger) {
    logger = _logger;
}

// Function to check seed presence and display account details, transactions, and balance
function checkSeedInJson(jsonData, seed) {
    // Find the seed in the JSON data
    const seedData = jsonData.data.find((item) => item.seed === seed);
    
    if (seedData) {
        console.log(`Seed: ${seed} is found in the JSON file.`);
        console.log(`Account Address: ${seedData.details.address}`);
        
        // Display all transactions
        console.log('Transactions:');
        let totalBalance = 0;
        seedData.details.transactions.forEach((transaction, index) => {
            const amount = parseInt(transaction.amount);
            const direction = transaction.direction === 'credit' ? '+' : '-';
            totalBalance += (transaction.direction === 'credit' ? amount : -amount);
            console.log(`Transaction ${index + 1}: ${direction}${amount} at ${new Date(parseInt(transaction.timestamp))}`);
        });
        
        // Show total balance
        console.log(`Total Balance: ${totalBalance}`);
    } else {
        console.log(`Seed: ${seed} is not found in the JSON file.`);
    }
}

// Function to read the JSON file and process the seeds
function processSeeds() {
    // Read the JSON file (replace with your actual file path)
    const jsonData = JSON.parse(fs.readFileSync('./balances.json', 'utf8'));

    // Ask for the number of seeds
    const numSeeds = parseInt(prompt('Enter the number of seeds to check: '));
    for (let i = 0; i < numSeeds; i++) {
        const seed = prompt(`Enter seed ${i + 1}: `);
        checkSeedInJson(jsonData, seed);
    }
}

// Start the process

//# sourceMappingURL=api.js.map