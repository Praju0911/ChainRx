import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
// Import the ABI of your smart contract
import MedChainABI from "./MedChain.json";

// ------------------------------------------------------------------
// Your NEW, CORRECT contract address is now included
// ------------------------------------------------------------------
const contractAddress = "0x6A316c75aa7dFa8378761ce94793B977C97A0e99";
// ------------------------------------------------------------------


function App() {
  const [account, setAccount] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]); // To store the list of records
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to shorten the wallet address
  const getTruncatedAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 1. Connects to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      setStatus("Please install MetaMask to use this application.");
    }
  };

  // 2. Fetches the patient's records from the blockchain
  const getRecords = async () => {
    if (!account || !window.ethereum) return;
    setStatus("Fetching your records...");
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, MedChainABI.abi, provider);
      
      // ------------------------------------------------------------------
      // THE FIX: Calling the new 'getMyRecords' function
      // ------------------------------------------------------------------
      const recordHashes = await contract.getMyRecords();
      // ------------------------------------------------------------------
      
      setRecords(recordHashes);
      setStatus(recordHashes.length === 0 ? "No records found." : "Records fetched successfully.");
    } catch (error) {
      console.error("Error fetching records:", error);
      // This error will happen if the ABI is wrong (see next step)
      setStatus("Error fetching records. (Did you update the ABI?)");
    }
  };

  // 3. Handles file selection
  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setStatus('');
  };

  // 4. Main function: Uploads file to IPFS, then saves hash to blockchain
  const uploadFile = async () => {
    if (!selectedFile) {
      setStatus("Error: Please select a file first.");
      return;
    }
    
    setIsLoading(true);
    setStatus('Step 1/2: Uploading file to IPFS...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // --- STEP 1: UPLOAD TO IPFS (via our backend) ---
      const ipfsResponse = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });

      if (!ipfsResponse.ok) {
        throw new Error('Error uploading file to IPFS.');
      }

      const ipfsData = await ipfsResponse.json();
      const ipfsHash = ipfsData.ipfsHash;
      setStatus(`Step 2/2: Saving hash ${ipfsHash} to the blockchain...`);

      // --- STEP 2: SAVE HASH TO BLOCKCHAIN ---
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, MedChainABI.abi, signer);

        console.log(`Calling uploadRecord with hash: ${ipfsHash}`);
        const tx = await contract.uploadRecord(ipfsHash);
        
        await tx.wait();

        setStatus(`Success! Transaction confirmed. Hash saved.`);
        
        setSelectedFile(null);
        if(document.getElementById('file-upload')) {
          document.getElementById('file-upload').value = null;
        }
        await getRecords(); // Refresh the list
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus(`Error: ${error.message || 'Upload failed.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      getRecords();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      {/* Header */}
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

      {/* Main Content Area */}
      {account && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Column 1: Patient Dashboard for Uploading */}
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

          {/* Column 2: Displaying Records */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-green-300">My Records</h2>
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
                <p className="text-gray-400">{status === "Fetching your records..." ? "Loading..." : "No records found."}</p>
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

