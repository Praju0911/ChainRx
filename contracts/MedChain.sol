// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedChain {

    // --- STRUCTS ---
    struct MedicalRecord {
        string ipfsHash;
        uint256 timestamp;
        address owner;
    }

    // --- MAPPINGS & ARRAYS ---
    
    // Stores all records
    MedicalRecord[] public allRecords;

    // Maps a patient's address to an array of their record IDs (indices in allRecords)
    mapping(address => uint[]) public patientRecords;

    // Manages doctor permissions
    // mapping(patientAddress => mapping(doctorAddress => hasAccess))
    mapping(address => mapping(address => bool)) public accessPermissions;

    // --- EVENTS ---
    event RecordAdded(uint indexed recordId, address indexed patient, string ipfsHash);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    // --- FUNCTIONS ---

    /**
     * @dev Uploads a new record (IPFS hash) to the blockchain.
     * The record is linked to the caller (msg.sender).
     */
    function uploadRecord(string memory _ipfsHash) public {
        uint recordId = allRecords.length;
        // Create the record and link it to the sender
        allRecords.push(MedicalRecord(_ipfsHash, block.timestamp, msg.sender));
        
        // Add this record's ID to the patient's personal list
        patientRecords[msg.sender].push(recordId);
        
        emit RecordAdded(recordId, msg.sender, _ipfsHash);
    }

    /**
     * @dev Grants access to a doctor (or any address).
     */
    function grantAccess(address _doctorAddress) public {
        require(_doctorAddress != address(0), "Invalid doctor address");
        accessPermissions[msg.sender][_doctorAddress] = true;
        emit AccessGranted(msg.sender, _doctorAddress);
    }

    /**
     * @dev Revokes access from a doctor.
     */
    function revokeAccess(address _doctorAddress) public {
        accessPermissions[msg.sender][_doctorAddress] = false;
        emit AccessRevoked(msg.sender, _doctorAddress);
    }

    /**
     * @dev **NEW FUNCTION**
     * Allows a patient to fetch their OWN records.
     * This is public and has no permission checks.
     */
    function getMyRecords() public view returns (string[] memory) {
        // msg.sender is the patient calling their own function
        uint[] memory recordIds = patientRecords[msg.sender];
        string[] memory ipfsHashes = new string[](recordIds.length);

        for (uint i = 0; i < recordIds.length; i++) {
            uint recordId = recordIds[i];
            ipfsHashes[i] = allRecords[recordId].ipfsHash;
        }
        return ipfsHashes;
    }

    /**
     * @dev **FOR DOCTORS**
     * Allows a third party (like a doctor) to view a patient's records,
     * *only* if they have been granted permission.
     */
    function getPatientRecordHashes(address _patientAddress) public view returns (string[] memory) {
        // This check ensures only authorized doctors can call this
        require(accessPermissions[_patientAddress][msg.sender], "Access denied");
        
        uint[] memory recordIds = patientRecords[_patientAddress];
        string[] memory ipfsHashes = new string[](recordIds.length);

        for (uint i = 0; i < recordIds.length; i++) {
            uint recordId = recordIds[i];
            ipfsHashes[i] = allRecords[recordId].ipfsHash;
        }
        return ipfsHashes;
    }
}

