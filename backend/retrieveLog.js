require("dotenv").config();
const path = require('path');
const fs = require('fs-extra');
const { ethers } = require("ethers");
const { besu } = require("../scripts/keys.js");
const host = besu.rpcnode.url;


// Replace with your Ethereum node provider URL
const provider = new ethers.JsonRpcProvider(host);

// Contract address and ABI (only events needed)
const contractJsonPath = path.resolve(__dirname, '..', 'contracts', 'LogEmitter.json');
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath));
const contractAbi = contractJson.abi;
const iface = new ethers.Interface(contractAbi);
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new ethers.Contract(contractAddress, contractAbi, provider);
const chunkSize = 1000;


async function getMessagesByCriticalLevel(level) {
    const logMetadataEvent = contract.interface.getEvent("LogMetadata");  // or "LogMessage"
    // console.log("LogMetadata Event:", logMetadataEvent);
    const logMetadataTopic = logMetadataEvent.topic;


    // criticalLevel is the 3rd indexed parameter (topics[3])
    // We need to encode the criticalLevel as a topic (uint8)
    const hexValue = ethers.toBeHex(level);
    const criticalLevelTopic = ethers.zeroPadValue(hexValue, 32);
    console.log("criticalLevelTopic:", criticalLevelTopic);
    const contractTxHash = await provider.getTransaction(process.env.CONTRACT_TX_HASH);
    const contractBlockNumber = contractTxHash ? contractTxHash.blockNumber : 0;
    const latestBlock = await provider.getBlock("latest");
    const latestBlockNumber = latestBlock.number;
    console.log(`Contract Block Number: ${contractBlockNumber}, Latest Block Number: ${latestBlockNumber}`);
    const allLogs = [];
    for (let startBlock = contractBlockNumber; startBlock <= latestBlockNumber; startBlock += chunkSize) {
        const endBlock = Math.min(startBlock + chunkSize - 1, latestBlockNumber);
        // Filter for LogMetadata events with criticalLevel = level
        const filter = {
            address: contractAddress,
            topics: [
                logMetadataTopic,
                null,
                null,
                criticalLevelTopic
            ],
            fromBlock: startBlock,
            toBlock: endBlock
        };

        // Fetch matching LogMetadata events
        const logs = await provider.getLogs(filter);
        allLogs.push(...logs);
        console.log(`Fetched ${logs.length} logs from block ${startBlock} to ${endBlock} for critical level ${level}`);
    }

    if (allLogs.length === 0 || allLogs == undefined) {
        console.log("No logs found for the specified critical level.");
        return [];
    }

    const logIds = allLogs.map(log => {
        const decoded = iface.parseLog(log);
        return decoded.args.logId;
    });

    console.log(`logIds found for critical level ${level}: ${logIds}`);

    return getEventsLogByLogIds(logIds, contractBlockNumber, latestBlockNumber);

}

// async function getEventsLogByLogIds(logIds, contractBlockNumber, latestBlockNumber) {
//     const allMessageLogs = [];

//     const messageEvent = contract.interface.getEvent("LogMessage");  // or "LogMessage"
//     // console.log("messageEvent Event:", messageEvent);
//     const messageTopic = messageEvent.topic;

//     for (let i = 0; i < logIds.length; i++) {
//         const logId = logIds[i];
//         for (let startBlock = contractBlockNumber; startBlock <= latestBlockNumber; startBlock += chunkSize) {
//             const endBlock = Math.min(startBlock + chunkSize - 1, latestBlockNumber);
//             const messageFilter = {
//                 address: contractAddress,
//                 topics: [
//                     messageTopic,
//                     logId
//                 ],
//                 fromBlock: startBlock,
//                 toBlock: endBlock
//             }

//             const messageLogs = await provider.getLogs(messageFilter);
//             const messageDecoded = messageLogs.map(log => {
//                 const decoded = iface.parseLog(log);
//                 return {
//                     logId: decoded.args.logId,
//                     message: decoded.args.message
//                 };
//             });
//             const deduplicatedMessages = deduplicateMessages(messageDecoded);
//             allMessageLogs.push(...deduplicatedMessages);
//         }
//     };
//     console.log(`Fetched ${allMessageLogs.length} message logs.`);


//     return allMessageLogs;
// }

// async function appendLogInfoFromLogMessage(logs, contractBlockNumber, latestBlockNumber) {
//     // const allMessageLogs = [];
//     const messageEvent = contract.interface.getEvent("LogMessage");  // or "LogMessage"
//     // console.log("messageEvent Event:", messageEvent);
//     const messageTopic = messageEvent.topic;

//     for (let i = 0; i < logs.length; i++) {
//         const log = logs[i];
//         const logId = log.logId;
//         console.log("Start appending info from LogMessage for Log:", logId);
//         for (let startBlock = contractBlockNumber; startBlock <= latestBlockNumber; startBlock += chunkSize) {

//             const endBlock = Math.min(startBlock + chunkSize - 1, latestBlockNumber);
//             console.log(`Start fetching from block ${startBlock} to block ${endBlock} in LogMessage`);
//             const messageFilter = {
//                 address: contractAddress,
//                 topics: [
//                     messageTopic,
//                     logId,
//                     null
//                 ],
//                 fromBlock: startBlock,
//                 toBlock: endBlock
//             }
//             const messageLogs = await provider.getLogs(messageFilter);
//             if (messageLogs.length === 0) {
//                 continue;
//             }
//             console.log(`Found append for ${logId} at block range ${startBlock} - ${endBlock}.`);
//             const decoded = iface.parseLog(messageLogs[0]);
//             console.log("decoded message log:", decoded);
//             log.username = decoded.args.username;

//             // const messageDecoded = messageLogs.map(log => {
//             //     const decoded = iface.parseLog(log);
//             //     return {
//             //         logId: decoded.args.logId,
//             //         message: decoded.args.message
//             //     };
//             // });
//             // const deduplicatedMessages = deduplicateMessages(messageDecoded);
//             // allMessageLogs.push(...deduplicatedMessages);
//         }
//     };
//     // console.log(`Fetched ${allMessageLogs.length} message logs.`);
//     // return allMessageLogs;
//     return logs;
// }

function deduplicateMessages(decodedMessages) {
    const deduplicatedMessages = decodedMessages
        .filter(m => m.message !== undefined) // Remove entries with undefined message
        .reduce((acc, current) => {
            // Check if logId already exists in the accumulator
            if (!acc.some(item => item.logId === current.logId)) {
                acc.push(current); // Add the current item if logId is unique
            }
            return acc;
        }, []);
    return deduplicatedMessages;
}


async function getMessagesByServer(server) {
    const logMetadataEvent = contract.interface.getEvent("LogMetadata");  // or "LogMessage"
    // console.log("LogMetadata Event:", logMetadataEvent);
    const logMetadataTopic = logMetadataEvent.topic;
    console.log(`Start getting logs from topic: ${logMetadataTopic}`);

    // We need to encode the server as a topic (uint8)
    const hexValue = ethers.toBeHex(server);
    const serverTopic = ethers.zeroPadValue(hexValue, 32);
    console.log("server:", server);
    const contractTxHash = await provider.getTransaction(process.env.CONTRACT_TX_HASH);
    const contractBlockNumber = contractTxHash ? contractTxHash.blockNumber : 0;
    const latestBlock = await provider.getBlock("latest");
    const latestBlockNumber = latestBlock.number;

    console.log(`Contract Block Number: ${contractBlockNumber}, Latest Block Number: ${latestBlockNumber}`);
    const allLogs = [];
    for (let startBlock = contractBlockNumber; startBlock <= latestBlockNumber; startBlock += chunkSize) {

        const endBlock = Math.min(startBlock + chunkSize - 1, latestBlockNumber);
        console.log(`Start fetching from block ${startBlock} to block ${endBlock}`);

        // Filter for LogMetadata events with server = level
        const filter = {
            address: contractAddress,
            topics: [
                logMetadataTopic,
                null,
                null,
                serverTopic,
            ],
            fromBlock: startBlock,
            toBlock: endBlock
        };
        // Fetch matching LogMetadata events
        const logs = await provider.getLogs(filter);
        allLogs.push(...logs);
        console.log(`Fetched ${logs.length} logs from block ${startBlock} to ${endBlock} for server ${server}`);
    }

    if (allLogs.length === 0 || allLogs == undefined) {
        console.log(`No logs found for server ${server}.`);
        return [];
    }

    const organizedLogs = allLogs.map(log => {
        const decoded = iface.parseLog(log);
        // cannot serialize bigInt, need to convert to string
        return {
            logId: decoded.args.logId,
            timestamp: decoded.args.timestamp.toString(),
            server: decoded.args.server.toString(),
            message: decoded.args.message,
        }
    });

    console.log(`No. of logs found for server ${server}: ${organizedLogs.length},
        logsId: ${organizedLogs.map(log => log.logId)}`);

    return organizedLogs;

    // return getEventsLogByLogIds(logIds, contractBlockNumber, latestBlockNumber);
    // return appendLogInfoFromLogMessage(organizedLogs, contractBlockNumber, latestBlockNumber);
}

module.exports = { getMessagesByServer }; 