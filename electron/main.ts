
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null;

function createWindow() {
    // Create Splash Window
    const splash = new BrowserWindow({
        width: 500,
        height: 600,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: '#0b0c10', // Prevent white flash
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splash.loadFile(path.join(__dirname, 'splash.html'));

    // Create Main Window (hidden initially)
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Hide until ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../build/icon.png') // Set icon
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5000');
        // mainWindow.webContents.openDevTools(); // Removed per request
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        // mainWindow.webContents.openDevTools(); // Removed per request
    }

    // Wait for main window to be ready, then switch
    mainWindow.once('ready-to-show', () => {
        // Simulate a small delay for the splash effect (optional, or just wait for load)
        setTimeout(() => {
            splash.close();
            mainWindow?.maximize();
            mainWindow?.show();
        }, 2500); // 2.5 seconds minimum splash
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
