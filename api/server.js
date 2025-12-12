require('dotenv').config(); // Load environment variables
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// 1. Validate API Key Existence
if (!process.env.API_KEY) {
  console.error("❌FATAL: API_KEY is missing in .env file.");
  process.exit(1); // Stop server if no key
}
console.log("✅ API Key loaded successfully.");

const API_URL = 'https://api.superparser.com/parse';

// 2. Ensure Uploads Directory Exists (Fixes crash issue)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
    console.log(`VD Created upload directory at: ${uploadDir}`);
}

// Configure Multer
const upload = multer({ dest: uploadDir });

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.post('/parse-resume', upload.single('resume'), async (req, res) => {
    // 3. Handle Missing File
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const resumeFilePath = req.file.path;
    const resumeFileName = req.file.originalname;

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(resumeFilePath), {
            filename: resumeFileName,
            contentType: req.file.mimetype,
        });

        // 4. Send Request using Env Variable
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': process.env.API_KEY, // Secure usage
                // Note: form-data headers are handled automatically by the library, 
                // but we DO NOT set Content-Type manually here or it breaks boundaries.
            },
            body: formData,
        });

        const parsedData = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error('❌ External API Error:', parsedData);
            return res.status(apiResponse.status).json({
                error: parsedData.error || parsedData.message || 'Superparser API Failed'
            });
        }

        console.log(`✅ Successfully parsed: ${resumeFileName}`);
        res.json(parsedData);

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    } finally {
        // 5. Cleanup: Delete temp file
        if (req.file && req.file.path) {
            fs.unlink(resumeFilePath, (err) => {
                if (err) console.error("⚠️ Failed to delete temp file:", err);
            });
        }
    }
});

app.listen(port, () => {
    console.log(`
🚀 Server running!
-------------------------
📂 Static Files: http://localhost:${port}
🔌 API Endpoint: http://localhost:${port}/parse-resume
-------------------------
    `);
});