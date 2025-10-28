import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ignition";
// No plugin import here — using a standalone ethers deploy script to avoid plugin compatibility issues
import "dotenv/config"; 

// Get the .env variables
const AMOY_RPC_URL = process.env.POLYGON_AMOY_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined; // Cast type for viem

if (!AMOY_RPC_URL) {
  console.error("Missing POLYGON_AMOY_RPC_URL in .env file");
  process.exit(1);
}
if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY in .env file");
  process.exit(1);
}

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      type: "http", 
      url: AMOY_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;

