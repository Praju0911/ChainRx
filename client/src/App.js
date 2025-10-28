import { useState } from 'react';
import { ethers } from 'ethers';

// We can remove the logo and default App.css
// import logo from './logo.svg';
// import './App.css';

function App() {
  // State for the user's wallet address
  const [account, setAccount] = useState(null);
  
  // New state variables for the file upload
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Idle");
  const [ipfsHash, setIpfsHash] = useState("");

  /**
   * Connects the user's MetaMask wallet.
   */
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        console.log("Wallet connected:", accounts[0]);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      console.error("Please install MetaMask to use this application.");
      alert("Please install MetaMask to use this application.");
    }
  };

  /**
   * Updates state when a file is selected.
   */
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus("Idle");
    setIpfsHash("");
  };

  /**
   * Handles the file upload to our backend/IPFS.
   */
  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setUploadStatus("Uploading to IPFS via server...");
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Send the file to our backend server (which we will build)
      const response = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(`Success! File on IPFS:`);
        setIpfsHash(data.ipfsHash);
        
        // --- NEXT STEP WILL GO HERE ---
        // We will add the code to call our smart contract here
        // console.log("Next, call smart contract with hash:", data.ipfsHash);
        // ------------------------------

      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(`Error: ${error.message}`);
    }
  };


  /**
   * A helper function to truncate the wallet address for display
   */
  const truncateAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8 font-sans">
      
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-green-400">MedChain</h1>
        
        {account ? (
          <div className="bg-gray-800 text-green-400 py-2 px-4 rounded-full">
            Connected: {truncateAddress(account)}
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full transition duration-200"
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl flex-grow">
        
        {/* --- PATIENT DASHBOARD (Visible only if connected) --- */}
        {account ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Patient Dashboard</h2>
            <p className="text-gray-400 mb-6">Upload a new medical record to IPFS and the blockchain.</p>

            {/* File Input Form */}
            <div className="space-y-4">
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-100 file:text-green-700
                  hover:file:bg-green-200"
              />
              
              <button
                onClick={handleFileUpload}
                disabled={!file || uploadStatus === "Uploading..."}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {uploadStatus.startsWith("Uploading") ? "Uploading..." : "Upload File"}
              </button>
            </div>

            {/* Status Message Area */}
            {uploadStatus !== "Idle" && (
              <div className="mt-6 p-4 bg-gray-700 rounded-md">
                <p className="text-sm font-medium">{uploadStatus}</p>
                {ipfsHash && (
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 break-all hover:underline"
                  >
                    Hash: {ipfsHash}
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Welcome to Your Secure Health Portal</h2>
            <p className="text-gray-400">
              Connect your wallet to get started. Once connected, you will be able to
              upload your medical records securely to the blockchain.
            </p>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default App;

