import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Endpoint to list images in a directory (recursive)
app.post('/scan', async (req, res) => {
    const { folderPath } = req.body;

    if (!folderPath || typeof folderPath !== 'string') {
        return res.status(400).json({ error: 'Invalid folder path' });
    }

    try {
        console.log(`Scanning: ${folderPath}`);

        // Normalize path for glob
        const normalizedPath = folderPath.replace(/\\/g, '/');

        // Find all jpg, jpeg, png, webp files
        const files = await glob('**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
            cwd: normalizedPath,
            absolute: true,
            nodir: true
        });

        console.log(`Found ${files.length} images.`);
        res.json({ files });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan directory', details: error.message });
    }
});

// Endpoint to serve a local image
app.get('/image', (req, res) => {
    const filePath = req.query.path;

    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).send('Missing path parameter');
    }

    // Security check: Ensure we are only reading image files
    // In a real generic app, we might want to be careful, but this is a local tool for the user's own machine.

    // Normalize path to handle Windows/Unix discrepancies if needed
    // but fs.createReadStream usually handles OS specific paths fine if valid.

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.webp') mimeType = 'image/webp';

        res.setHeader('Content-Type', mimeType);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('Image serve error:', error);
        res.status(500).send('Error reading file');
    }
});

import { exec } from 'child_process';

// Endpoint to reveal file in Windows Explorer
app.post('/reveal', (req, res) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).send('Missing filePath');

    // Windows specific command
    // Normalize path just in case
    const normalizedPath = path.normalize(filePath);
    const command = `explorer /select,"${normalizedPath}"`;

    exec(command, (error) => {
        if (error) {
            console.error('Reveal error:', error);
            // Don't fail the request if it just opened, but exec might error if command fails
            return res.status(500).send('Failed to open folder');
        }
        res.send('Opened');
    });
});

// Endpoint to open native folder picker dialog
app.get('/select-folder', (req, res) => {
    const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms;
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
        $dialog.Description = 'Arşiv Klasörünü Seçin';
        $dialog.ShowNewFolderButton = $false;
        if ($dialog.ShowDialog() -eq 'OK') {
            Write-Output $dialog.SelectedPath
        }
    `;

    // Execute PowerShell command
    exec(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Folder select error:', error);
            return res.status(500).json({ error: 'Failed to open dialog' });
        }

        const selectedPath = stdout.trim();
        if (!selectedPath) {
            return res.json({ cancelled: true });
        }

        res.json({ path: selectedPath });
    });
});

// Endpoint to shutdown the server
app.post('/shutdown', (req, res) => {
    res.send('Shutting down...');
    setTimeout(() => {
        process.exit(0);
    }, 500);
});

// Simple health check endpoint to avoid 404 console spam
app.get('/status', (req, res) => {
    res.json({ status: 'online' });
});

app.listen(PORT, () => {
    console.log(`Hayalet Local Bridge running on http://localhost:${PORT}`);
});
