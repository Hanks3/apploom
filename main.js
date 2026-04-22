const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function crearVentana() {
    const mainWindow = new BrowserWindow({
        width: 850,
        height: 780,
        minWidth: 500,
        minHeight: 650,
        resizable: true,
        maximizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
}

ipcMain.handle('abrir-selector-carpeta', async () => {
    const resultado = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (resultado.canceled) {
        return null;
    } else {
        return resultado.filePaths[0];
    }
});

ipcMain.handle('abrir-selector-cookies', async () => {
    const resultado = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Archivos de Texto', extensions: ['txt'] }]
    });
    return resultado.canceled ? null : resultado.filePaths[0];
});

ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.setSize(width, height, true);
        win.center();
    }
});

app.whenReady().then(crearVentana);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});