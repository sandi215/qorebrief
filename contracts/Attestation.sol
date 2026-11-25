// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title QoreBrief Attestation
/// @notice Stores one hash attestation per briefing. The QoreBrief agent
///         composes a short daily briefing, posts the keccak256 hash of its
///         text plus a short memo here, and anyone can read the attestation
///         back and check the hash. The transaction that posts it is
///         hybrid-signed (secp256k1 + ML-DSA-87) on the QoreChain testnet:
///         the agent's account holds a registered post-quantum key and an
///         open EVM authorisation window.
contract Attestation {
    /// @notice One posted briefing attestation.
    struct Entry {
        bytes32 briefHash;
        string memo;
        uint256 timestamp;
        address author;
    }

    /// @notice All attestations, in posting order.
    Entry[] public entries;

    /// @notice Emitted whenever a briefing attestation is posted.
    event Attested(uint256 indexed id, bytes32 indexed briefHash, address indexed author, string memo);

    /// @notice Post a briefing attestation.
    /// @param briefHash keccak256 hash of the briefing text.
    /// @param memo Short human-readable note (e.g. the briefing headline).
    /// @return id The id of the new attestation.
    function attest(bytes32 briefHash, string calldata memo) external returns (uint256 id) {
        id = entries.length;
        entries.push(
            Entry({briefHash: briefHash, memo: memo, timestamp: block.timestamp, author: msg.sender})
        );
        emit Attested(id, briefHash, msg.sender, memo);
    }

    /// @notice How many attestations exist.
    function count() external view returns (uint256) {
        return entries.length;
    }

    /// @notice Read one attestation back.
    function get(uint256 id)
        external
        view
        returns (bytes32 briefHash, string memory memo, uint256 timestamp, address author)
    {
        Entry storage e = entries[id];
        return (e.briefHash, e.memo, e.timestamp, e.author);
    }
}
