import fs from 'fs';
import path from 'path';
import https from 'https';

const modelsDir = path.join(process.cwd(), 'public', 'models');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

console.log(`Downloading models to ${modelsDir}...`);

files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    const fileUrl = `${baseUrl}/${file}`;

    console.log(`Fetching ${file}...`);

    https.get(fileUrl, (res) => {
        if (res.statusCode !== 200) {
            console.error(`Failed to download ${file}: ${res.statusCode}`);
            return;
        }
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        console.error(`Error downloading ${file}:`, err.message);
    });
});
