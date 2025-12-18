// SPDX-License-Identifier: MIT
// pragma solidity ^0.8.10;

// contract LogEmitter {
//     event LogMetadata(
//         bytes32 indexed logId,
//         uint256 indexed timestamp,
//         uint8 indexed server,
//         string message
//     );

//     function emitLog(
//         bytes32 logId,
//         uint256 timestamp,
//         uint8 server,
//         string calldata message
//     ) external {
//         emit LogMetadata(logId, timestamp, server, message);
//     }
// }

pragma solidity ^0.8.10;

contract LogEmitter {
    event LogMetadata(
        bytes32 indexed logId,
        uint256 indexed timestamp,
        uint8 indexed server,
        string message
    );

    function emitLog(
        bytes32 logId,
        uint256 timestamp,
        uint8 server,
        string calldata message
    ) external {
        emit LogMetadata(logId, timestamp, server, message);
    }

    /**
     * @dev Emits multiple logs in a single transaction.
     * @param logIds Array of unique identifiers for each log.
     * @param timestamps Array of UNIX timestamps for each log.
     * @param servers Array of server IDs for each log.
     * @param messages Array of log messages.
     */
    function emitLogsBatch(
        bytes32[] calldata logIds,
        uint256[] calldata timestamps,
        uint8[] calldata servers,
        string[] calldata messages
    ) external {
        // This check is crucial to ensure data integrity.
        require(
            logIds.length == timestamps.length &&
                timestamps.length == servers.length &&
                servers.length == messages.length,
            "All input arrays must have the same length"
        );

        for (uint i = 0; i < logIds.length; i++) {
            emit LogMetadata(logIds[i], timestamps[i], servers[i], messages[i]);
        }
    }
}
