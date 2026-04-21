const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function crearVentana() {
    const mainWindow = new BrowserWindow({
        width: 550,
        height: 750,
        resizable: false,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
}

// ¡NUEVO! El puente de comunicación para seleccionar la carpeta
ipcMain.handle('abrir-selector-carpeta', async () => {
    const resultado = await dialog.showOpenDialog({
        properties: ['openDirectory'] // Le decimos a Windows que solo queremos carpetas
    });

    if (resultado.canceled) {
        return null; // Si el usuario cierra la ventana sin elegir nada
    } else {
        return resultado.filePaths[0]; // Devolvemos la ruta de la carpeta elegida
    }
});

app.whenReady().then(crearVentana);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});