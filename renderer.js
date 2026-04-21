const { exec, spawn } = require('child_process');
const { ipcRenderer, shell } = require('electron');
const os = require('os');
const path = require('path');

// Variables globales de estado
let carpetaDestino = path.join(os.homedir(), 'Downloads');
let rutaCookies = '';

/**
 * 1. LÓGICA DE COOKIES
 * Maneja la carga del archivo y actualiza el texto en la interfaz
 */
document.getElementById('inputCookies').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    const display = document.getElementById('fileNameDisplay');

    if (archivo) {
        rutaCookies = archivo.path;
        display.innerText = "Archivo cargado: " + archivo.name;
        display.style.color = "#10b981"; // Verde éxito
        document.getElementById('estado').innerText = "✅ Cookies listas para usar.";
    } else {
        display.innerText = "Ningún archivo seleccionado";
        display.style.color = "#94a3b8";
    }
});

/**
 * 2. SELECCIÓN DE CARPETA
 * Se comunica con main.js para abrir el selector nativo de Windows
 */
document.getElementById('btnCarpeta').addEventListener('click', async () => {
    const rutaElegida = await ipcRenderer.invoke('abrir-selector-carpeta');

    if (rutaElegida) {
        carpetaDestino = rutaElegida;
        document.getElementById('textoCarpeta').innerText = rutaElegida;
    }
});

/**
 * 3. LÓGICA DE MINIATURA DINÁMICA
 * Detecta el enlace y muestra la previa del video
 */
document.getElementById('inputUrl').addEventListener('input', (e) => {
    const url = e.target.value.trim();
    const thumbContainer = document.getElementById('thumbContainer');
    const videoThumb = document.getElementById('videoThumb');
    const placeholder = document.getElementById('placeholder-text');

    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('loom.com')) {
        const comandoThumb = `yt-dlp --get-thumbnail --no-warnings "${url}"`;

        exec(comandoThumb, (error, stdout) => {
            if (!error && stdout) {
                videoThumb.src = stdout.trim();
                videoThumb.onload = () => {
                    placeholder.style.display = 'none';
                    videoThumb.style.display = 'block';
                    thumbContainer.classList.add('active');
                    // Ajustamos la ventana a tu medida ideal de 650px de alto
                    ipcRenderer.send('resize-window', 870, 870);
                };
            }
        });
    } else {
        videoThumb.style.display = 'none';
        placeholder.style.display = 'block';
        thumbContainer.classList.remove('active');
        ipcRenderer.send('resize-window', 870, 870);
    }
});

/**
 * 4. PROCESO DE DESCARGA
 * Usa spawn para capturar el progreso y soporta diferentes calidades
 */
document.getElementById('btnDescargar').addEventListener('click', () => {
    const url = document.getElementById('inputUrl').value;
    const calidad = document.getElementById('selectCalidad').value;
    const textoEstado = document.getElementById('estado');
    const boton = document.getElementById('btnDescargar');
    const barra = document.getElementById('barra-progreso');
    const contenedorBarra = document.getElementById('contenedor-progreso');

    if (!url) {
        textoEstado.innerText = "⚠️ Pega un enlace primero.";
        return;
    }

    // Preparar Interfaz
    boton.disabled = true;
    boton.innerText = "Descargando...";
    contenedorBarra.style.display = "block";
    barra.style.width = "0%";
    textoEstado.innerText = "Iniciando descarga...";
    textoEstado.style.color = "#eab308";

    // Configuración de calidad y formato para máxima compatibilidad con Windows
    let formato = 'bv*[ext=mp4]+ba*[ext=m4a]/b[ext=mp4]';
    let extraArgs = [];

    if (calidad === "1080p") {
        formato = 'bv*[height<=1080][ext=mp4]+ba*[ext=m4a]/b[height<=1080][ext=mp4]';
    } else if (calidad === "720p") {
        formato = 'bv*[height<=720][ext=mp4]+ba*[ext=m4a]/b[height<=720][ext=mp4]';
    } else if (calidad === "audio") {
        formato = 'ba/b';
        extraArgs = ['-x', '--audio-format', 'mp3']; // Conversión automática a MP3
    }

    // Construcción de argumentos para yt-dlp
    const args = [
        '-f', formato,
        '--merge-output-format', 'mp4',
        '--newline', // Necesario para leer el progreso línea a línea
        '--no-cache-dir',
        '--no-warnings',
        '-P', carpetaDestino,
        ...extraArgs,
        url
    ];

    if (rutaCookies) {
        args.push('--cookies', rutaCookies);
    }

    // Iniciar descarga
    const proceso = spawn('yt-dlp', args);

    // Capturar progreso desde la consola
    proceso.stdout.on('data', (data) => {
        const salida = data.toString();
        const match = salida.match(/(\d+(\.\d+)?)%/);

        if (match) {
            const porcentaje = match[1];
            barra.style.width = `${porcentaje}%`;
            textoEstado.innerText = `Descargando: ${porcentaje}%`;
        }
    });

    proceso.on('close', (code) => {
        boton.disabled = false;
        boton.innerText = "Descargar Video";

        if (code === 0) {
            barra.style.width = "100%";
            textoEstado.innerText = "✅ ¡Éxito! Video guardado.";
            textoEstado.style.color = "#10b981";
            document.getElementById('inputUrl').value = '';
        } else {
            textoEstado.innerText = "❌ Error en la descarga.";
            textoEstado.style.color = "#ef4444";
        }
    });
});

/**
 * 5. DONACIONES
 * Abre el enlace de apoyo en el navegador predeterminado
 */
document.getElementById('btnDonar').addEventListener('click', (e) => {
    e.preventDefault();
    shell.openExternal('https://www.buymeacoffee.com/Hanks3');
});