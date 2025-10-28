import "dotenv/config";
import { ethers } from "ethers";

async function verifyContract() {
  const RPC_URL = process.env.POLYGON_AMOY_RPC_URL;
  const contractAddress = "0x4D722245D5F60b6B2aaB404737BEC7b5c25F88a3";

  if (!RPC_URL) {
    console.error("❌ Missing POLYGON_AMOY_RPC_URL in .env");
    process.exit(1);
  }

  console.log("🔍 Verifying contract on Polygon Amoy testnet...");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🌐 RPC URL: ${RPC_URL}`);

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Check network
    const network = await provider.getNetwork();
    console.log(`\n✅ Connected to network:`);
    console.log(`   Chain ID: ${network.chainId} (should be 80002 for Amoy)`);
    console.log(`   Name: ${network.name}`);

    // Check if contract exists at address
    const code = await provider.getCode(contractAddress);
    
    if (code === "0x" || code === "0x0") {
      console.log(`\n❌ NO CONTRACT FOUND at ${contractAddress}`);
      console.log(`   This means either:`);
      console.log(`   1. The contract was never deployed to this address`);
      console.log(`   2. The contract was deployed to a different network`);
      console.log(`\n💡 Solution: Redeploy the contract by running:`);
      console.log(`   npm run deploy` || `npx ts-node scripts/deploy.ts`);
    } else {
      console.log(`\n✅ CONTRACT EXISTS at ${contractAddress}`);
      console.log(`   Bytecode length: ${code.length} characters`);
      console.log(`\n🎉 Contract is properly deployed!`);
      console.log(`\n⚠️  If you're still getting errors in MetaMask:`);
      console.log(`   1. Make sure MetaMask is connected to Polygon Amoy testnet`);
      console.log(`   2. Add Amoy network to MetaMask:`);
      console.log(`      - Network Name: Polygon Amoy Testnet`);
      console.log(`      - RPC URL: https://rpc-amoy.polygon.technology/`);
      console.log(`      - Chain ID: 80002`);
      console.log(`      - Currency Symbol: POL`);
      console.log(`      - Block Explorer: https://amoy.polygonscan.com/`);
      console.log(`   3. Get test tokens from: https://faucet.polygon.technology/`);
    }
  } catch (error) {
    console.error(`\n❌ Error verifying contract:`, error);
  }
}

verifyContract();
