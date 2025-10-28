import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MedChainABI from "./MedChain.json";

const contractAddress = "0x4D722245D5F60b6B2aaB404737BEC7b5c25F88a3"; // ✅ Make sure this matches your latest deployment

function App() {
  const [account, setAccount] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Helper function to shorten wallet address
  const getTruncatedAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // ✅ Connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log("🌐 Connected network chainId:", chainId);
        setStatus("");
      } catch (error) {
        console.error("❌ Error connecting wallet:", error);
        setStatus("Error connecting wallet. Check console for details.");
      }
    } else {
      setStatus("⚠️ Please install MetaMask to use this application.");
    }
  };

  // ✅ Fetch user's records from blockchain
  const getRecords = async () => {
    if (!account) return;
    setStatus("Fetching your records...");
    
    try {
      // Use public provider for consistent reads
      const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
      
      // Get signer's address to ensure we're querying the right account
      let queryAddress = account;
      if (window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await browserProvider.getSigner();
          queryAddress = await signer.getAddress();
        } catch (e) {
          console.log('Using account state for address:', account);
        }
      }
      
      // Create contract instance connected to signer for accurate getMyRecords call
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();
      const contract = new ethers.Contract(contractAddress, MedChainABI.abi, signer);
      
      console.log("🧠 Fetching records for:", queryAddress);
      console.log("🧠 Signer address:", signerAddress);
      console.log("🧠 Account state:", account);
      console.log("🧠 Addresses match:", signerAddress.toLowerCase() === account.toLowerCase());
      
      const recordHashes = await contract.getMyRecords();
      console.log("📦 Records fetched:", recordHashes);
      console.log("📦 Number of records:", recordHashes.length);
      console.log("📦 Full array:", JSON.stringify(recordHashes));
      
      setRecords(recordHashes);
      setStatus(recordHashes.length === 0 ? "No records found." : `${recordHashes.length} record(s) found.`);
    } catch (error) {
      console.error("❌ Error fetching records:", error);
      setStatus("Error fetching records. Check if the ABI and contract address are correct.");
    }
  };

  // ✅ Handle file selection
  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setStatus('');
  };

  // ✅ Upload file → send IPFS hash → save to blockchain
  const uploadFile = async () => {
    console.log("RUNNING VERSION: FIX_3_FINAL_CHECK");

    if (!selectedFile) {
      setStatus("Error: Please select a file first.");
      return;
    }
    
    setIsLoading(true);
    setStatus('Step 1/2: Uploading file to IPFS...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // --- STEP 1: Upload to IPFS via backend ---
      const ipfsResponse = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });

      if (!ipfsResponse.ok) {
        throw new Error('Error uploading file to IPFS (backend returned non-200).');
      }

      const ipfsData = await ipfsResponse.json();
      console.log("✅ IPFS upload response:", ipfsData);

      // ✅ Handle multiple possible key names safely
      const ipfsHash = ipfsData.IpfsHash || ipfsData.ipfsHash || ipfsData.path || ipfsData.Hash;

      console.log("✅ Extracted IPFS hash:", ipfsHash);

      if (!ipfsHash || ipfsHash === "undefined") {
        throw new Error("Invalid IPFS hash received from backend.");
      }

      setStatus(`Step 2/2: Saving hash ${ipfsHash} to the blockchain...`);

      // --- STEP 2: Save hash to blockchain ---
      if (window.ethereum) {
        try {
          // Create a JsonRpcProvider directly to avoid MetaMask RPC issues
          const publicProvider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
          
          // Use BrowserProvider for signing
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await browserProvider.getSigner();
          
          // Connect contract to signer
          const contract = new ethers.Contract(contractAddress, MedChainABI.abi, signer);

          console.log(`📤 Calling uploadRecord() with hash: ${ipfsHash}`);
          
          // Check balance first
          const balance = await publicProvider.getBalance(account);
          console.log(`💰 Account balance: ${ethers.formatEther(balance)} POL`);
          
          if (balance === 0n) {
            throw new Error("Insufficient POL tokens. Get test tokens from https://faucet.polygon.technology/");
          }

          // Populate transaction to get all fields properly set
          console.log('📤 Preparing transaction...');
          const populatedTx = await contract.uploadRecord.populateTransaction(ipfsHash);
          
          // Get network fee data from public provider
          const feeData = await publicProvider.getFeeData();
          
          // Add gas and fee parameters
          populatedTx.gasLimit = 300000;
          populatedTx.maxFeePerGas = feeData.maxFeePerGas;
          populatedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
          populatedTx.chainId = 80002;
          populatedTx.nonce = await publicProvider.getTransactionCount(account, 'latest');
          
          console.log('📤 Sending transaction...');
          console.log('Transaction details:', populatedTx);
          
          // Send the transaction
          const tx = await signer.sendTransaction(populatedTx);
          
          console.log(`⏳ Transaction sent: ${tx.hash}`);
          setStatus(`⏳ Transaction sent, waiting for confirmation...`);
          
          // Wait for confirmation using public provider
          const receipt = await publicProvider.waitForTransaction(tx.hash, 1);

          if (receipt && receipt.status === 1) {
            console.log("✅ Transaction confirmed on blockchain!");
            setStatus(`✅ Success! Record stored on-chain. Refreshing records...`);
          } else {
            throw new Error('Transaction failed on blockchain');
          }
          
          setSelectedFile(null);
          const fileInput = document.getElementById('file-upload');
          if (fileInput) fileInput.value = null;

          // Wait a bit for blockchain state to propagate, then refresh records
          await new Promise(resolve => setTimeout(resolve, 2000));
          await getRecords();
          
        } catch (txError) {
          console.error('❌ Transaction error:', txError);
          throw txError;
        }
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Upload failed.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      // Check for common issues
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient POL tokens. Get test tokens from https://faucet.polygon.technology/';
      } else if (errorMessage.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user.';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Nonce error. Try resetting your MetaMask account (Settings > Advanced > Clear activity tab data).';
      }
      
      setStatus(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Auto-fetch records when wallet connects
  useEffect(() => {
    if (account) {
      getRecords();
    }
  }, [account]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-green-400">MedChain</h1>
        {account ? (
          <div className="bg-green-500 text-gray-900 font-medium py-2 px-4 rounded-full">
            Connected: {getTruncatedAddress(account)}
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition duration-300"
          >
            Connect Wallet
          </button>
        )}
      </header>

      {account && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 🩺 Patient Dashboard */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-green-300">Patient Dashboard</h2>
            <p className="mb-4 text-gray-300">Upload a new medical record to IPFS and the blockchain.</p>
            
            <div className="mb-4">
              <input
                id="file-upload"
                type="file"
                onChange={onFileChange}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700 cursor-pointer"
              />
            </div>
            
            <button
              onClick={uploadFile}
              disabled={isLoading || !selectedFile}
              className={`w-full font-bold py-3 px-4 rounded-full transition duration-300 ${
                isLoading || !selectedFile
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : 'Upload & Save to Blockchain'}
            </button>
            
            {status && <p className="mt-4 text-sm text-gray-400 break-words">{status}</p>}
          </div>

          {/* 📜 My Records */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-green-300">My Records</h2>
              <button
                onClick={getRecords}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-full transition duration-300"
              >
                🔄 Refresh
              </button>
            </div>
            <div className="h-64 overflow-y-auto space-y-2">
              {records.length > 0 ? (
                records.map((hash, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded text-xs text-gray-200 font-mono break-all">
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {index + 1}: {hash}
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">
                  {status === "Fetching your records..." ? "Loading..." : "No records found."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!account && (
        <div className="text-center mt-20">
          <h2 className="text-3xl font-semibold text-gray-400">Please connect your wallet to begin.</h2>
        </div>
      )}
    </div>
  );
}

export default App;
