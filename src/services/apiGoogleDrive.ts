
// This service handles Google Drive API interactions.

const ENV_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export interface DriveFile {
    id: string;
    name: string;
    thumbnailLink: string;
    webContentLink: string; // Original max res
    mimeType: string;
}

import { getSetting } from './apiSettings';

export const listDriveFiles = async (folderId: string): Promise<DriveFile[]> => {
    // Priority: Database -> Env Var
    let API_KEY = await getSetting('google_drive_api_key');

    if (!API_KEY) {
        API_KEY = ENV_API_KEY;
    }

    if (!API_KEY) {
        console.warn("No Google API Key found (checked database and env). Returning mock data.");
        return getMockFiles();
    }

    try {
        const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink,webContentLink,mimeType)&key=${API_KEY}&pageSize=100`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Drive API Error: ${response.status} ${response.statusText}`);
            // If 403, key might be invalid or Drive API not enabled
            throw new Error(`Google Drive Hatası: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.files) return [];

        // High-res thumbnail hack: Replace 's220' with 's1000' in thumbnailLink
        return data.files.map((f: any) => ({
            ...f,
            thumbnailLink: f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s600') : '', // Grid thumbnail
            webContentLink: f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s3000') : f.webContentLink, // Lightbox high-res
        }));

    } catch (error) {
        console.error("Failed to fetch drive files", error);
        throw error;
    }
};

// Mock data generator for development without API Key
const getMockFiles = (): DriveFile[] => {
    return Array.from({ length: 20 }).map((_, i) => ({
        id: `mock_img_${i}`,
        name: `Photo_${i + 1}.jpg`,
        thumbnailLink: `https://picsum.photos/seed/${i + 100}/400/600`,
        webContentLink: `https://picsum.photos/seed/${i + 100}/1200/1800`,
        mimeType: 'image/jpeg'
    }));
};
