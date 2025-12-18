require("dotenv").config();
const path = require('path');
const fs = require('fs-extra');
const ethers = require('ethers');

// RPCNODE details
const { besu } = require("../scripts/keys.js");
const host = besu.rpcnode.url;
const accountPrivateKey = besu.rpcnode.accountPrivateKey;

// abi and bytecode generated from simplestorage.sol:
// > solcjs --bin --abi simplestorage.sol
const contractJsonPath = path.resolve(__dirname, '..', 'contracts', 'LogEmitter.json');
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath));
const contractAbi = contractJson.abi;
const contractAddress = process.env.CONTRACT_ADDRESS;

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
    console.log(receipt);
    const contractLogs = receipt.logs.filter(log => log.address.toLowerCase() === contractAddress.toLowerCase());
    const decodedEvents = contractLogs.map(log => contract.interface.parseLog(log));
    const events = [];
    for (const event of decodedEvents) {
        eventObj = {
            eventName: event.name,
            eventArgs: event.args,
        }
        events.push(eventObj);
        // console.log("Event name:", event.name);
        // console.log("Event args:", event.args);
    }
    // const res = await contract.get();
    // console.log("Obtained value at deployed contract is: "+ res);
    return {
        txHash: receipt.hash,
        events: events,
        blockNumber: receipt.blockNumber
    };
}

async function writeToBlockchain(logDetail) {
    const provider = new ethers.JsonRpcProvider(host);
    const wallet = new ethers.Wallet(accountPrivateKey, provider);
    const latestBlock = await provider.getBlock("latest");

    const min = 1;
    const max = 1000000;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    const logId = ethers.keccak256(
        ethers.toUtf8Bytes(`${latestBlock.number}-${logDetail.messageTimestamp}-${randomNum}`)
    );
    console.log(`logId: ${logId}`);

    logDetail.logId = logId;

    console.log(`Emit log to chain - 
        logId: ${logDetail.logId}, 
        timestamp: ${logDetail.timestamp},
        server: ${logDetail.server},
        message: ${logDetail.message}`
    );
    return await emitLogToChain(provider, wallet, contractAbi, contractAddress, logDetail);

}

// if (require.main === module) {
//     writeToBlockchain();
// }

module.exports = { writeToBlockchain };