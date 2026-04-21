const { exec } = require('child_process');
const { ipcRenderer, shell } = require('electron');
const os = require('os');
const path = require('path');

// Definimos la carpeta por defecto (Descargas)
let carpetaDestino = path.join(os.homedir(), 'Downloads');
let rutaCookies = '';

// 1. Lógica para las Cookies
document.getElementById('inputCookies').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (archivo) {
        // Obtenemos la ruta real del archivo
        rutaCookies = archivo.path;
        document.getElementById('estado').innerText = "✅ Cookies cargadas correctamente.";
        document.getElementById('estado').style.color = "#10b981";
    }
});

// 2. Lógica para Seleccionar Carpeta
document.getElementById('btnCarpeta').addEventListener('click', async () => {
    const rutaElegida = await ipcRenderer.invoke('abrir-selector-carpeta');

    if (rutaElegida) {
        carpetaDestino = rutaElegida;
        document.getElementById('textoCarpeta').innerText = rutaElegida;
    }
});

// 3. Lógica para Descargar
document.getElementById('btnDescargar').addEventListener('click', () => {
    const url = document.getElementById('inputUrl').value;
    const textoEstado = document.getElementById('estado');
    const boton = document.getElementById('btnDescargar');

    if (rutaCookies === '') {
        textoEstado.innerText = "⚠️ Carga el archivo de cookies primero.";
        textoEstado.style.color = "#eab308";
        return;
    }

    if (!url.includes('loom.com')) {
        textoEstado.innerText = "⚠️ Enlace de Loom no válido.";
        textoEstado.style.color = "#ef4444";
        return;
    }

    boton.innerText = "Descargando...";
    boton.disabled = true;
    textoEstado.innerText = "Procesando... Mira tu carpeta elegida.";
    textoEstado.style.color = "#eab308";

    const comando = `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 --no-cache-dir --no-warnings --no-check-certificate --cookies "${rutaCookies}" -P "${carpetaDestino}" "${url}"`;

    exec(comando, (error, salidaNormal, salidaError) => {
        boton.disabled = false;
        boton.innerText = "Descargar Video";

        const descargaExitosa = salidaNormal.includes('100%') || salidaNormal.includes('has already been downloaded');

        if (error && !descargaExitosa) {
            textoEstado.innerText = "❌ Error en la descarga.";
            textoEstado.style.color = "#ef4444";
            return;
        }

        textoEstado.innerText = "✅ ¡Éxito! Video guardado.";
        textoEstado.style.color = "#10b981";
        document.getElementById('inputUrl').value = '';
    });
});

// 4. Lógica para Donaciones (Abrir navegador externo)
document.getElementById('btnDonar').addEventListener('click', (e) => {
    e.preventDefault();
    shell.openExternal('https://www.buymeacoffee.com/Hanks3');
});