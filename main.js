const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function crearVentana() {
    const mainWindow = new BrowserWindow({
        width: 870,
        height: 870,         // Altura fija y cómoda para cualquier monitor
        resizable: false,
        maximizable: false,
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

// Escuchamos la orden de cambiar el tamaño de la ventana
ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.setSize(width, height, true); // El 'true' añade una animación suave
        win.center(); // Opcional: vuelve a centrar la ventana tras el cambio
    }
});

app.whenReady().then(crearVentana);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
