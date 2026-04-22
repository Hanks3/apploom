const { exec, spawn } = require('child_process');
const { ipcRenderer, shell } = require('electron');
const path = require('path');
const os = require('os');

const rutaProyecto = process.cwd();
const rutaEjecutable = path.join(rutaProyecto, 'yt-dlp.exe');

let carpetaDestino = path.join(os.homedir(), 'Downloads');
let rutaCookies = '';

// 1. SELECTOR DE CARPETA
document.getElementById('btnCarpeta').addEventListener('click', async () => {
    const rutaElegida = await ipcRenderer.invoke('abrir-selector-carpeta');
    if (rutaElegida) {
        carpetaDestino = rutaElegida;
        document.getElementById('textoCarpeta').innerText = rutaElegida;
    }
});

// 2. NUEVO SELECTOR DE COOKIES (NATIVO)
document.getElementById('btnCargarCookies').addEventListener('click', async () => {
    const rutaFile = await ipcRenderer.invoke('abrir-selector-cookies');
    const display = document.getElementById('fileNameDisplay');

    if (rutaFile) {
        rutaCookies = rutaFile;
        display.innerText = "Cargado: " + path.basename(rutaFile);
        display.style.color = "#10b981";
        console.log("Cookies cargadas correctamente en:", rutaCookies);
        // Refrescamos miniatura si hay un link puesto
        actualizarMiniatura();
    }
});

// 3. LÓGICA DE MINIATURA
const actualizarMiniatura = () => {
    let urlRaw = document.getElementById('inputUrl').value.trim();
    if (!urlRaw) {
        document.getElementById('videoThumb').style.display = 'none';
        document.getElementById('placeholder-text').style.display = 'block';
        return;
    }

    // Limpieza de URL para evitar fallos con caracteres especiales
    let url = urlRaw.split(' ')[0]; // Evitar espacios accidentales

    const videoThumb = document.getElementById('videoThumb');
    const placeholder = document.getElementById('placeholder-text');

    if (url.includes('instagram.com') || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('loom.com')) {

        // Ponemos un texto de "Cargando..."
        placeholder.innerText = "Cargando vista previa...";

        let comandoThumb = `"${rutaEjecutable}" --get-thumbnail --no-warnings --no-check-certificate `;
        comandoThumb += `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36" `;

        if (url.includes('instagram.com')) {
            comandoThumb += `--extractor-args "instagram:get_test_data" `;
        }

        if (rutaCookies) {
            comandoThumb += `--cookies "${rutaCookies}" `;
        }

        comandoThumb += ` "${url}"`;

        exec(comandoThumb, (error, stdout, stderr) => {
            if (error) {
                console.error("Error al obtener miniatura:", stderr);
                placeholder.innerText = "Vista previa no disponible";
                return;
            }
            if (stdout) {
                videoThumb.src = stdout.trim();
                videoThumb.style.display = 'block';
                placeholder.style.display = 'none';
                console.log("Miniatura cargada con éxito");
            }
        });
    }
};

document.getElementById('inputUrl').addEventListener('input', actualizarMiniatura);

// 4. BOTÓN DESCARGAR
document.getElementById('btnDescargar').addEventListener('click', () => {
    let urlRaw = document.getElementById('inputUrl').value.trim();
    let url = urlRaw.split('?')[0].replace('/reels/', '/reel/');

    const calidad = document.getElementById('selectCalidad').value;
    const textoEstado = document.getElementById('estado');
    const boton = document.getElementById('btnDescargar');
    const barra = document.getElementById('barra-progreso');
    const contenedorBarra = document.getElementById('contenedor-progreso');

    if (!url) {
        textoEstado.innerText = "⚠️ Pega un enlace primero.";
        return;
    }

    boton.disabled = true;
    boton.innerText = "Descargando...";
    contenedorBarra.style.display = "block";
    barra.style.width = "0%";
    textoEstado.innerText = "Iniciando descarga...";

    let formato = 'bv*[ext=mp4]+ba*[ext=m4a]/b[ext=mp4]';
    let extraArgs = [];
    if (calidad === "1080p") formato = 'bv*[height<=1080][ext=mp4]+ba*[ext=m4a]/b[height<=1080][ext=mp4]';
    else if (calidad === "720p") formato = 'bv*[height<=720][ext=mp4]+ba*[ext=m4a]/b[height<=720][ext=mp4]';
    else if (calidad === "audio") { formato = 'ba/b'; extraArgs = ['-x', '--audio-format', 'mp3']; }

    const args = [
        '--no-check-certificate',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '--no-cache-dir', '-f', formato, '--merge-output-format', 'mp4', '--newline', '-P', carpetaDestino
    ];

    if (url.includes('instagram.com')) args.push('--extractor-args', 'instagram:get_test_data');
    if (rutaCookies) args.push('--cookies', rutaCookies);
    args.push(url);

    const proceso = spawn(rutaEjecutable, args);

    proceso.stdout.on('data', (data) => {
        const match = data.toString().match(/(\d+(\.\d+)?)%/);
        if (match) { barra.style.width = `${match[1]}%`; textoEstado.innerText = `Descargando: ${match[1]}%`; }
    });

    proceso.on('close', (code) => {
        boton.disabled = false; boton.innerText = "Descargar Video";
        if (code === 0) {
            barra.style.width = "100%"; textoEstado.innerText = "✅ ¡Éxito! Video guardado.";
            textoEstado.style.color = "#10b981"; document.getElementById('inputUrl').value = '';
        } else {
            textoEstado.innerText = "❌ Error en la descarga."; textoEstado.style.color = "#ef4444";
        }
    });
});

document.getElementById('btnDonar').addEventListener('click', (e) => {
    e.preventDefault(); shell.openExternal('https://www.buymeacoffee.com/Hanks3');
});