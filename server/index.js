require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const multer = require('multer'); // Middleware for handling file uploads
const cors = require('cors'); // Middleware for enabling Cross-Origin Resource Sharing
const pinataSDK = require('@pinata/sdk'); // Pinata SDK for IPFS
const fs = require('fs');
const stream = require('stream');

const app = express();
const port = 3001; // We'll run this server on port 3001

// CRITICAL: Check if Pinata keys are loaded and not placeholders
if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY || process.env.PINATA_API_KEY === 'YOUR_PINATA_API_KEY_HERE') {
    console.error("Error: Pinata API keys not found or are still placeholders in .env file.");
    console.error("Please ensure you have a .env file in the /server directory with your real keys.");
    process.exit(1); // Stop the server if keys are missing
}

// Initialize Pinata
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

// --- Middlewares ---
// Enable CORS for all routes, so our React app (on port 3000) can communicate
app.use(cors());

// Set up Multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

// --- Routes ---

// Test route
app.get('/', (req, res) => {
    res.send('MedChain Backend Server is running!');
});

/**
 * The main file upload endpoint.
 * 'upload.single('file')' matches the 'file' key in our frontend's FormData.
 */
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Log received file
    console.log(`Received file: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    try {
        // We need to convert the file buffer (from memory) into a readable stream for Pinata
        const readableStreamForFile = new stream.Readable();
        readableStreamForFile.push(req.file.buffer);
        readableStreamForFile.push(null); // Signifies end of stream

        const options = {
            pinataMetadata: {
                name: req.file.originalname,
            },
        };
        
        // Pin the file to IPFS using the stream
        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        console.log('File uploaded to IPFS successfully:', result);

        // Send the IPFS hash back to the frontend
        res.status(200).json({ ipfsHash: result.IpfsHash });

    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        res.status(500).json({ message: 'Error uploading file to IPFS.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

