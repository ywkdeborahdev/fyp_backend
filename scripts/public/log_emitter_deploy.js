const path = require('path');
const fs = require('fs-extra');
const ethers = require('ethers');
const { updateEnvKey } = require('../../updateEnv.js');

// RPCNODE details
const { tessera, besu } = require("../keys.js");
const { env } = require('process');
const host = besu.rpcnode.url;
const accountPrivateKey = besu.rpcnode.accountPrivateKey;

// abi and bytecode generated from simplestorage.sol:
// > solcjs --bin --abi simplestorage.sol
const contractJsonPath = path.resolve(__dirname, '../../', 'contracts', 'LogEmitter.json');
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath));
const contractAbi = contractJson.abi;
const contractBytecode = contractJson.evm.bytecode.object

// async function getValueAtAddress(provider, deployedContractAbi, deployedContractAddress){
//   const contract = new ethers.Contract(deployedContractAddress, deployedContractAbi, provider);
//   const res = await contract.get();
//   console.log("Obtained value at deployed contract is: "+ res);
//   return res
// }

// You need to use the accountAddress details provided to Quorum to send/interact with contracts
// emitLog
async function emitLogToChain(provider, wallet, deployedContractAbi, deployedContractAddress, logDetail) {
    const contract = new ethers.Contract(deployedContractAddress, deployedContractAbi, provider);
    const contractWithSigner = contract.connect(wallet);
    const tx = await contractWithSigner.emitLog(
        logDetail.logId,
        logDetail.timestamp,
        logDetail.server,
        logDetail.message
    );
    // verify the updated value
    const receipt = await tx.wait();
    const contractLogs = receipt.logs.filter(log => log.address.toLowerCase() === contractAddress.toLowerCase());
    const decodedEvents = contractLogs.map(log => contract.interface.parseLog(log));
    for (const event of decodedEvents) {
        console.log("Event name:", event.name);
        console.log("Event args:", event.args);
    }
    // const res = await contract.get();
    // console.log("Obtained value at deployed contract is: "+ res);
    return tx;
}

// ** NEW FUNCTION TO TEST BATCH WRITING **
async function emitLogsBatchToChain(provider, wallet, deployedContractAbi, deployedContractAddress, logDetailsArray) {
    const contract = new ethers.Contract(deployedContractAddress, deployedContractAbi, provider);
    const contractWithSigner = contract.connect(wallet);

    // Prepare arrays for the smart contract function
    const logIds = logDetailsArray.map(log => log.logId);
    const timestamps = logDetailsArray.map(log => log.timestamp);
    const servers = logDetailsArray.map(log => log.server);
    const messages = logDetailsArray.map(log => log.message);

    console.log(`\nEmitting a batch of ${logDetailsArray.length} logs to the chain...`);

    // Call the batch function
    const tx = await contractWithSigner.emitLogsBatch(
        logIds,
        timestamps,
        servers,
        messages
    );

    const receipt = await tx.wait();
    console.log("Batch of logs emitted successfully. Transaction hash:", receipt.hash);

    // Optional: Decode and log events from the batch transaction
    const contractLogs = receipt.logs.filter(log => log.address.toLowerCase() === deployedContractAddress.toLowerCase());
    const decodedEvents = contractLogs.map(log => contract.interface.parseLog(log));
    console.log(`Found ${decodedEvents.length} events in the batch transaction:`);
    for (const event of decodedEvents) {
        if (event.name === "LogMetadata") {
            console.log(`  - Server: ${event.args.server}, Message: "${event.args.message}"`);
        }
    }

    return tx;
}


async function createContract(provider, wallet, contractAbi, contractByteCode) {
    const factory = new ethers.ContractFactory(contractAbi, contractByteCode, wallet);
    const contract = await factory.deploy();
    // The contract is NOT deployed yet; we must wait until it is mined
    const deployed = await contract.waitForDeployment();
    //The contract is deployed now
    return contract
};

async function main() {
    const provider = new ethers.JsonRpcProvider(host);
    const wallet = new ethers.Wallet(accountPrivateKey, provider);
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const message = "GenesisLogEmission - Welcome to log monitoring system built by Deborah - cloud version";
    const logId = ethers.encodeBytes32String((1 + unixTimestamp).toString());
    const server = 1;

    const logDetail = {
        logId: logId,
        timestamp: unixTimestamp,
        server: server,
        message: message
    }

    // ** PREPARE BATCH DATA FOR TESTING **
    const batchLogDetails = [
        {
            logId: ethers.encodeBytes32String(`batch_1_${unixTimestamp}`),
            timestamp: unixTimestamp + 1,
            server: 1,
            message: "First batch log message from server 1."
        },
        {
            logId: ethers.encodeBytes32String(`batch_2_${unixTimestamp}`),
            timestamp: unixTimestamp + 2,
            server: 2,
            message: "Second batch log message from server 2."
        },
        {
            logId: ethers.encodeBytes32String(`batch_3_${unixTimestamp}`),
            timestamp: unixTimestamp + 3,
            server: 3,
            message: "Third batch log message from server 3."
        }
    ];


    createContract(provider, wallet, contractAbi, contractBytecode)
        .then(async function (contract) {
            contractAddress = await contract.getAddress();
            console.log("Contract deployed at address: " + contractAddress);
            console.log("Contract hash: " + contract.deploymentTransaction().hash);

            updateEnvKey("CONTRACT_ADDRESS", contractAddress);
            updateEnvKey("CONTRACT_TX_HASH", contract.deploymentTransaction().hash);

            // console.log("Use the smart contracts 'get' function to read the contract's constructor initialized value .. " )
            // await getValueAtAddress(provider, contractAbi, contractAddress);
            console.log(`Emit log to chain - 
                logId: ${logId}, 
                timestamp: ${unixTimestamp},
                server: ${server},
                message: ${message}`
            );
            await emitLogToChain(provider, wallet, contractAbi, contractAddress, logDetail);
            // console.log("Verify the updated value that was set .. ")
            // await getValueAtAddress(provider, contractAbi, contractAddress);
            // await getAllPastEvents(host, contractAbi, tx.contractAddress);

            // ** CALL THE NEW BATCH FUNCTION FOR TESTING **
            await emitLogsBatchToChain(provider, wallet, contractAbi, contractAddress, batchLogDetails);
        })
        .catch(console.error);

}

if (require.main === module) {
    main();
}

module.exports = exports = main