import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { StandaloneConfig } from './config.js';
import * as api from './api';
import fs from 'fs';
import readline from 'readline';
let logger;
import { WalletBuilder } from '@midnight-ntwrk/wallet';


/**
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000042';
const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new counter contract
  2. Join an existing counter contract
  3. Exit
Which would you like to do? `;
const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Increment
  2. Display current counter value
  3. Exit
Which would you like to do? `;
const join = async (providers, rli) => {
    const contractAddress = await rli.question('What is the contract address (in hex)? ');
    return await api.joinContract(providers, contractAddress);
};
const deployOrJoin = async (providers, rli) => {
    while (true) {
        const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
        switch (choice) {
            case '1':
                return await api.deploy(providers);
            case '2':
                return await join(providers, rli);
            case '3':
                logger.info('Exiting...');
                return null;
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const mainLoop = async (providers, rli) => {
    const counterContract = await deployOrJoin(providers, rli);
    if (counterContract === null) {
        return;
    }
    while (true) {
        const choice = await rli.question(MAIN_LOOP_QUESTION);
        switch (choice) {
            case '1':
                await api.increment(counterContract);
                break;
            case '2':
                await api.displayCounterValue(providers, counterContract);
                break;
            case '3':
                logger.info('Exiting...');
                return;
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const buildWalletFromSeed = async (config, rli) => {
    const seed = await rli.question('Enter your wallet seed: ');
    return await api.buildWalletAndWaitForFunds(config, seed);
};
const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
  4. Want to add a transaction
Which would you like to do? `;

const buildWallet = async (config, rli) => {
    if (config instanceof StandaloneConfig) {
        return await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED);
    }
    while (true) {
        const choice = await rli.question(WALLET_LOOP_QUESTION);
        switch (choice) {
            case '1':
                return await api.buildFreshWallet(config);
            case '2':
                return await buildWalletFromSeed(config, rli);
            case '3':
                logger.info('Exiting...');
                return null;
            case '4':
                //return processSeeds();
                return handleUserInput(config);
            default:
                logger.error(`Invalid choice: ${choice}`);
        }
    }
};
const mapContainerPort = (env, url, containerName) => {
    const mappedUrl = new URL(url);
    const container = env.getContainer(containerName);
    mappedUrl.port = String(container.getFirstMappedPort());
    return mappedUrl.toString().replace(/\/+$/, '');
};
export const run = async (config, _logger, dockerEnv) => {
    logger = _logger;
    api.setLogger(_logger);
    const rli = createInterface({ input, output, terminal: true });
    let env;
    if (dockerEnv !== undefined) {
        env = await dockerEnv.up();
        if (config instanceof StandaloneConfig) {
            config.indexer = mapContainerPort(env, config.indexer, 'counter-graphql-api');
            config.indexerWS = mapContainerPort(env, config.indexerWS, 'counter-graphql-api');
            config.node = mapContainerPort(env, config.node, 'counter-node');
            config.proofServer = mapContainerPort(env, config.proofServer, 'counter-proof-server');
        }
    }
    const wallet = await buildWallet(config, rli);
    try {
        if (wallet !== null) {
            const providers = await api.configureProviders(wallet, config);
            await mainLoop(providers, rli);
        }
    }
    catch (e) {
        if (e instanceof Error) {
            logger.error(`Found error '${e.message}'`);
            logger.info('Exiting...');
        }
        else {
            throw e;
        }
    }
    finally {
        try {
            rli.close();
            rli.removeAllListeners();
        }
        catch (e) {
        }
        finally {
            try {
                if (wallet !== null) {
                    await wallet.close();
                }
            }
            catch (e) {
            }
            finally {
                try {
                    if (env !== undefined) {
                        await env.down();
                        logger.info('Goodbye');
                    }
                }
                catch (e) { }
            }
        }
    }
};
//# sourceMappingURL=cli.js.map
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function calculateTotalNetworkTransactions(networkData) {
    if (!networkData) {
        console.error('Invalid network data structure');
        return 0; // Return 0 if the structure is invalid
    }

    // Iterate over each seed's data
    let totalBalance = 0;
    networkData.forEach(seed => {
        // Ensure transactions exist and are an array
        seed.details.transactions.forEach((transaction) => {
            const amount = parseInt(transaction.amount);
            totalBalance += (transaction.direction === 'credit' ? amount : -amount);
        });
    });

    return totalBalance;
}

// Example usage:
function calculateCreditScore(transactions) {
    let totalWeightedAmount = 0;

    const now = Date.now();
    transactions.forEach(transaction => {
        const transactionDate = new Date(parseInt(transaction.timestamp));
        const daysAgo = Math.floor((now - transactionDate) / (1000 * 60 * 60 * 24)); // Calculate days ago
        const amount = parseInt(transaction.amount);

        let weight = 0;
        if (daysAgo >= 31 && daysAgo <= 60) {
            weight = 0.3;
        } else if (daysAgo >= 61 && daysAgo <= 90) {
            weight = 0.6;
        } else if (daysAgo > 90) {
            weight = 1;
        }

        totalWeightedAmount += amount * weight;
    });

    return totalWeightedAmount * 10; // Credit limit
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getNumberOfSeeds() {
    return new Promise((resolve) => {
        rl.question('Enter the number of seeds to check: ', (answer) => {
            resolve(parseInt(answer)); // Convert to an integer
        });
    });
}

function getSeedInput(seedNumber) {
    return new Promise((resolve) => {
        rl.question(`Enter seed ${seedNumber}: `, (answer) => {
            resolve(answer);
        });
    });
}

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
  async function getTransactionDetails() {
    // Promisified version of rl.question to ensure we wait for input
    const amount = await new Promise((resolve) => {
        rl.question('Enter the transaction amount: ', (answer) => {
            resolve(parseFloat(answer)); // Convert to a float
        });
    });

    const direction = await new Promise((resolve) => {
        rl.question('Enter the transaction direction (credit/debit): ', (answer) => {
            resolve(answer);
        });
    });

    // Ensure that amount is a valid number
    if (isNaN(amount)) {
        console.log('Invalid amount entered. Please enter a valid number.');
        return null; // Return null to indicate failure
    }

    // Ensure direction is either 'credit' or 'debit'
    if (direction.toLowerCase() !== 'credit' && direction.toLowerCase() !== 'debit') {
        console.log('Invalid direction entered. Please enter either "credit" or "debit".');
        return null; // Return null to indicate failure
    }

    return { amount, direction, timestamp: Date.now() }; // Use current timestamp
}
async function updateTransactionInJson(seedData, jsonData) {
    // Write the updated seedData back to the JSON file
    const seedIndex = jsonData.data.findIndex((item) => item.seed === seedData.seed);
    
    if (seedIndex !== -1) {
        jsonData.data[seedIndex] = seedData; // Update the entry for this seed
        fs.writeFileSync('./balances.json', JSON.stringify(jsonData, null, 2));
        console.log('Transaction added successfully.');
    } else {
        console.log(`Seed: ${seedData.seed} was not found in the JSON file.`);
    }
}
const buildWalletAndWaitForFunds = async ({ indexer, indexerWS, node, proofServer }, seed) => {
    const wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, 'warn');
    wallet.start();
    const state = await Rx.firstValueFrom(wallet.state());
    logger.info(`Your wallet seed is: ${seed}`);
    logger.info(`Your wallet address is: ${state.address}`);
    let balance = state.balances[nativeToken()];

    return wallet;
};
  // Function to read the JSON file and process the seeds
  export const handleUserInput = async (config) => {
    // Read the JSON file (replace with your actual file path)
    const jsonData = JSON.parse(fs.readFileSync('./balances.json', 'utf8'));
  
    // Ask for the number of seeds
    // const numSeedsInput = await getNumberOfSeeds();
    // if (numSeedsInput === null) {
    //   // Handle the case where the user cancelled the prompt
    //   console.log('No input provided');
    //   return;
    // }
    // const numSeeds = parseInt(numSeedsInput);

    // // Get all seed inputs from the user
    // const seeds = [];
    // for (let i = 0; i < numSeeds; i++) {
    //     const seed = await getSeedInput(i + 1);
    //     seeds.push(seed);
    // }
    
    
    const performTransaction = await new Promise((resolve) => {
        rl.question('Would you like to proceed? (yes/no): ', (answer) => {
            resolve(answer);
        });
    });
    
    if (performTransaction.toLowerCase() === 'yes') {
        const seedForTransaction = await new Promise((resolve) => {
            rl.question('Enter the seed for the transaction: ', (answer) => {
                resolve(answer);
            });
        });
        
        //buildWalletAndWaitForFunds(seedForTransaction);
        // Ask for transaction details
        const transactionDetails = await getTransactionDetails(); // Make sure this function exists
        if (!transactionDetails || !transactionDetails.amount || !transactionDetails.direction) {
            console.log('Transaction details are invalid. Aborting transaction.');
            return;
        }
        return await startProcess(seedForTransaction, transactionDetails, jsonData);
        // Return all inputs to be processed in the next part
        // return {
        //     seeds,
        //     seedForTransaction,
        //     transactionDetails,
        //     jsonData
        // };
    } else {
        console.log('No transaction will be made. Goodbye!');
        rl.close();
        return null;
    }
};

export const startProcess = async ( seedForTransaction, transactionDetails, jsonData ) => {
    //const { seeds, seedForTransaction, transactionDetails, jsonData } = inputData;

    // Process each seed and check it in the JSON data
    // for (const seed of seeds) {
    //     checkSeedInJson(jsonData, seed);
    // }

    // Find the seed data for the transaction
    const seedDataForTransaction = jsonData.data.find(data => data.seed === seedForTransaction);
    
    if (seedDataForTransaction) {
        // Calculate the credit score
        const creditLimit = calculateCreditScore(seedDataForTransaction.details.transactions);
        console.log(`Your credit limit is: ${creditLimit}`);

        // Calculate the total network transaction amount
        const totalNetworkAmount = await calculateTotalNetworkTransactions(jsonData.data);
        console.log(`Total Network Transaction Amount: ${totalNetworkAmount}`);

        // Validate if the transaction can be processed
        if (transactionDetails.direction === 'debit' && totalNetworkAmount < transactionDetails.amount) {
            console.log(`Transaction failed. Total network transactions (${totalNetworkAmount}) are less than the amount you want to borrow (${transactionDetails.amount}).`);
            return; // Abort the transaction
        }

        // Check if the transaction amount exceeds the credit limit
        if (transactionDetails.direction === 'debit' && transactionDetails.amount > creditLimit) {
            console.log(`Transaction failed. Amount exceeds your credit limit of ${creditLimit}.`);
            return; // Abort the transaction
        }

        // Add the transaction to the seed data
        seedDataForTransaction.details.transactions.push(transactionDetails);
        
        // Update the JSON file with the new transaction
        await updateTransactionInJson(seedDataForTransaction, jsonData); // Ensure this function exists
        
        // Display updated transaction history
        console.log(`Updated Transaction History for Seed: ${seedForTransaction}`);
        checkSeedInJson(jsonData, seedForTransaction);
    } else {
        console.log(`Seed: ${seedForTransaction} not found for transaction.`);
    }

    rl.close();
};


  export const processSeed = async () => {
    // Read the JSON file (replace with your actual file path)
    const jsonData = JSON.parse(fs.readFileSync('./balances.json', 'utf8'));
  
    // Ask for the number of seeds
    const numSeedsInput = await getNumberOfSeeds();
    if (numSeedsInput === null) {
      // Handle the case where the user cancelled the prompt
      console.log('No input provided');
      return;
    }
    const numSeeds = parseInt(numSeedsInput);
    for (let i = 0; i < numSeeds; i++) {
        const seed = await getSeedInput(i + 1);
        checkSeedInJson(jsonData, seed);
    }
    const performTransaction = await new Promise((resolve) => {
        rl.question('Would you like to make a transaction? (yes/no): ', (answer) => {
            resolve(answer);
        });
    });
    
    if (performTransaction.toLowerCase() === 'yes') {
        const seedForTransaction = await new Promise((resolve) => {
            rl.question('Enter the seed for the transaction: ', (answer) => {
                resolve(answer);
            });
        });
        
        const seedDataForTransaction = jsonData.data.find(data => data.seed === seedForTransaction);
        
        if (seedDataForTransaction) {
            const transactionDetails = await getTransactionDetails(); // Make sure this function exists
            // Add transaction to the seed data
            if (!transactionDetails || !transactionDetails.amount || !transactionDetails.direction) {
                console.log('Transaction details are invalid. Aborting transaction.');
                return;
            }
            const creditLimit = calculateCreditScore(seedDataForTransaction.details.transactions);
            console.log(`Your credit limit is: ${creditLimit}`);

            const totalNetworkAmount = await calculateTotalNetworkTransactions(jsonData.data); // Adjust this line according to your data structure
            console.log(`Total Network Transaction Amount: ${totalNetworkAmount}`);

            if (transactionDetails.direction === 'debit' && totalNetworkAmount < transactionDetails.amount) {
                console.log(`Transaction failed. Total network transactions (${totalNetworkAmount}) are less than the amount you want to borrow (${transactionDetails.amount}).`);
                return; // Abort the transaction
            }
            // Check if the transaction amount exceeds the credit limit and abort if it does
            if (transactionDetails.direction === 'debit' && transactionDetails.amount > creditLimit) {
                console.log(`Transaction failed. Amount exceeds your credit limit of ${creditLimit}.`);
                return; // Abort the transaction
            }

            seedDataForTransaction.details.transactions.push(transactionDetails);
            
            // Update the JSON file with the new transaction
            await updateTransactionInJson(seedDataForTransaction, jsonData); // Ensure this function exists
            
            // Display updated transaction history
            console.log(`Updated Transaction History for Seed: ${seedForTransaction}`);
            checkSeedInJson(jsonData, seedForTransaction);
        } else {
            console.log(`Seed: ${seedForTransaction} not found for transaction.`);
        }
    } else {
        console.log('Thank you for using the CLI. Goodbye!');
    }

    rl.close();
    return;
  }