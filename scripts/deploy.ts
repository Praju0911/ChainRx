import fs from "fs";
import path from "path";
import "dotenv/config";
import { ethers } from "ethers";
import { fileURLToPath } from "url";

async function main() {
  console.log("Deploying MedChain contract (ethers-only script)...");

  const RPC_URL = process.env.POLYGON_AMOY_RPC_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!RPC_URL) throw new Error("Missing POLYGON_AMOY_RPC_URL in .env");
  if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY in .env");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Resolve __dirname for ESM and load compiled artifact produced by Hardhat
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const artifactPath = path.resolve(__dirname, "..", "artifacts", "contracts", "MedChain.sol", "MedChain.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run 'npx hardhat compile' first.`);
  }

  const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifactJson.abi;
  const bytecode = artifactJson.bytecode || artifactJson.bytecodeObject || artifactJson.evm?.bytecode?.object;

  if (!abi || !bytecode) {
    throw new Error("ABI or bytecode missing from artifact JSON");
  }

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("Sending deploy transaction...");
  const contract = await factory.deploy();
  console.log("Waiting for deployment to be mined...");
  await contract.waitForDeployment?.();

  // Resolve address in a robust way
  let contractAddress: string | undefined;
  if (typeof (contract as any).getAddress === "function") {
    contractAddress = await (contract as any).getAddress();
  } else {
    contractAddress = (contract as any).target ?? (contract as any).address;
  }

  console.log(`✅ MedChain deployed successfully to: ${contractAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

