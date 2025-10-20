// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedChain
 * @dev A smart contract to manage medical record ownership and access control
 * on the blockchain. Patients retain full control over their data.
 */
contract MedChain {
    // A structure to hold the core details of a medical record.
    struct MedicalRecord {
        string ipfsHash;      // The hash of the encrypted file on IPFS.
        uint256 timestamp;    // The time the record was uploaded.
        address owner;        // The wallet address of the patient who owns the record.
    }

    // --- State Variables ---

    // An array to store every single medical record created in the system.
    MedicalRecord[] public allRecords;

    // A mapping to link a patient's address to the list of IDs for their records.
    // This allows us to quickly find all records belonging to a specific patient.
    // e.g., patientRecords[0xPatientAddress] -> [0, 5, 12] (record IDs)
    mapping(address => uint[]) public patientRecords;
    
    // A nested mapping to manage access permissions.
    // It maps a patient's address to another map, which links a doctor's address
    // to a boolean (true if they have access, false if not).
    // e.g., accessPermissions[0xPatientAddress][0xDoctorAddress] -> true
    mapping(address => mapping(address => bool)) public accessPermissions;

    // --- Events ---
    // Events are broadcasted logs on the blockchain. Our frontend app can listen for these
    // to update the UI and create a transparent audit trail.

    event RecordAdded(uint indexed recordId, address indexed patient, string ipfsHash);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    // --- Functions ---

    /**
     * @dev Allows a patient to upload a new medical record.
     * The IPFS hash of the encrypted file is stored on-chain.
     * @param _ipfsHash The unique content identifier from IPFS.
     */
    function uploadRecord(string memory _ipfsHash) public {
        // `msg.sender` is a global variable in Solidity that holds the address
        // of the person or contract who called the current function.
        address patient = msg.sender;

        // Get the ID for the new record (which is the current length of the array).
        uint recordId = allRecords.length;

        // Create a new MedicalRecord in memory and push it to the `allRecords` array.
        allRecords.push(MedicalRecord(_ipfsHash, block.timestamp, patient));

        // Add the new record's ID to the list of records for this patient.
        patientRecords[patient].push(recordId);

        // Emit an event to log that a new record was added.
        emit RecordAdded(recordId, patient, _ipfsHash);
    }

    /**
     * @dev Allows a patient to grant access to their records to a doctor.
     * @param _doctorAddress The wallet address of the doctor to grant access to.
     */
    function grantAccess(address _doctorAddress) public {
        // Ensure the address is not the zero address (a common safeguard).
        require(_doctorAddress != address(0), "Invalid doctor address");
        
        // Set the permission to true for this doctor.
        accessPermissions[msg.sender][_doctorAddress] = true;
        
        // Emit an event for the audit trail.
        emit AccessGranted(msg.sender, _doctorAddress);
    }

    /**
     * @dev Allows a patient to revoke a doctor's access to their records.
     * @param _doctorAddress The wallet address of the doctor to revoke access from.
     */
    function revokeAccess(address _doctorAddress) public {
        // Set the permission back to false.
        accessPermissions[msg.sender][_doctorAddress] = false;

        // Emit an event for the audit trail.
        emit AccessRevoked(msg.sender, _doctorAddress);
    }

    /**
     * @dev Allows a doctor to fetch the IPFS hashes of a specific patient's records.
     * This function can only be called successfully if the patient has granted access.
     * @param _patientAddress The address of the patient whose records are being requested.
     * @return A list of IPFS hashes as strings.
     */
    function getPatientRecordHashes(address _patientAddress) public view returns (string[] memory) {
        // `view` means this function only reads data from the blockchain and doesn't modify it.
        
        // Check if the caller (msg.sender, the doctor) has permission from the patient.
        require(accessPermissions[_patientAddress][msg.sender], "Access Denied: You do not have permission.");
        
        // Get the array of record IDs for the specified patient.
        uint[] memory recordIds = patientRecords[_patientAddress];
        
        // Create a new string array in memory to hold the results.
        string[] memory ipfsHashes = new string[](recordIds.length);

        // Loop through the record IDs, find the corresponding record in `allRecords`,
        // and add its IPFS hash to our results array.
        for (uint i = 0; i < recordIds.length; i++) {
            ipfsHashes[i] = allRecords[recordIds[i]].ipfsHash;
        }

        return ipfsHashes;
    }
}

