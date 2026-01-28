const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const targetScript = path.join(__dirname, 'local-server', 'server_launcher.bat');
const shortcutPath = path.join(startupFolder, 'HayaletLocalServer.lnk');

// Create the bat file that launches the server securely/in background
const batContent = `@echo off
cd /d "%~dp0"
npm start
`;

const batPath = path.join(__dirname, 'local-server', 'server_launcher.bat');
fs.writeFileSync(batPath, batContent);

// Create shortcut using PowerShell
const psCommand = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
$Shortcut.TargetPath = "${batPath}"
$Shortcut.WorkingDirectory = "${path.join(__dirname, 'local-server')}"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
`;

exec(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
    if (err) {
        console.error('Kısayol oluşturulamadı:', err);
    } else {
        console.log('Başlangıç kısayolu oluşturuldu:', shortcutPath);
    }
});
