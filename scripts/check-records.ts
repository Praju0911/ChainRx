import "dotenv/config";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

async function checkRecords() {
  const WALLET_ADDRESS = "0xdc8a44d3abdb73016b8e90bf63dffbcf097a81f3"; // From your screenshot
  const CONTRACT_ADDRESS = "0x4D722245D5F60b6B2aaB404737BEC7b5c25F88a3";
  
  console.log("🔍 Checking records on blockchain...");
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`👤 Wallet: ${WALLET_ADDRESS}`);

  try {
    // Use public provider
    const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
    
    // Load ABI
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const artifactPath = path.resolve(__dirname, "..", "client", "src", "MedChain.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);
    
    // Try calling getPatientRecordHashes (old method - won't work without permission)
    try {
      console.log("\n📋 Attempting to fetch records via getPatientRecordHashes...");
      const hashes = await contract.getPatientRecordHashes(WALLET_ADDRESS);
      console.log(`✅ Found ${hashes.length} record(s):`, hashes);
    } catch (e) {
      console.log("❌ getPatientRecordHashes failed (expected - requires permission)");
    }
    
    // Check patientRecords mapping directly
    console.log("\n📋 Checking patientRecords mapping...");
    const recordIds = await contract.patientRecords(WALLET_ADDRESS, 0);
    console.log("Record ID at index 0:", recordIds.toString());
    
    // Check allRecords array
    console.log("\n📋 Checking allRecords array...");
    try {
      for (let i = 0; i < 10; i++) {
        const record = await contract.allRecords(i);
        console.log(`Record ${i}:`, {
          ipfsHash: record.ipfsHash,
          timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
          owner: record.owner
        });
        
        if (record.owner.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
          console.log(`   ✅ This record belongs to ${WALLET_ADDRESS}!`);
        }
      }
    } catch (e) {
      console.log("Finished checking allRecords (reached end of array)");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

checkRecords();
