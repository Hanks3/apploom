const { exec, spawn } = require('child_process');
const { ipcRenderer, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

const rutaProyecto = process.cwd();
const rutaEjecutable = path.join(rutaProyecto, 'yt-dlp.exe');

let carpetaDestino = path.join(os.homedir(), 'Downloads');
let rutaCookies = '';
let descargasRealizadas = JSON.parse(localStorage.getItem('historial')) || [];

document.getElementById('btnCarpeta').addEventListener('click', async () => {
    const rutaElegida = await ipcRenderer.invoke('abrir-selector-carpeta');
    if (rutaElegida) {
        carpetaDestino = rutaElegida;
        document.getElementById('textoCarpeta').innerText = rutaElegida;
    }
});

document.getElementById('btnCargarCookies').addEventListener('click', async () => {
    const rutaFile = await ipcRenderer.invoke('abrir-selector-cookies');
    if (rutaFile) {
        rutaCookies = rutaFile;
        document.getElementById('fileNameDisplay').innerText = path.basename(rutaFile);
        document.getElementById('fileNameDisplay').style.color = "#10b981";
        actualizarMiniatura();
    }
});

const actualizarMiniatura = () => {
    let urlRaw = document.getElementById('inputUrl').value.trim();
    if (!urlRaw) {
        document.getElementById('videoThumb').style.display = 'none';
        document.getElementById('placeholder-text').style.display = 'block';
        return;
    }

    let url = urlRaw;
    if (url.includes('instagram.com')) {
        url = url.split('?')[0].replace('/reels/', '/reel/');
    }

    const videoThumb = document.getElementById('videoThumb');
    const placeholder = document.getElementById('placeholder-text');

    if (url.startsWith('http')) {
        placeholder.innerText = "Buscando...";
        let comandoThumb = `"${rutaEjecutable}" --get-thumbnail --no-warnings --no-check-certificate `;
        comandoThumb += `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36" `;
        if (rutaCookies) comandoThumb += `--cookies "${rutaCookies}" `;
        comandoThumb += ` "${url}"`;

        exec(comandoThumb, (error, stdout) => {
            if (!error && stdout) {
                videoThumb.src = stdout.trim();
                videoThumb.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                placeholder.innerText = "Vista previa no disponible";
            }
        });
    }
};

document.getElementById('inputUrl').addEventListener('input', actualizarMiniatura);

document.getElementById('btnDescargar').addEventListener('click', () => {
    let url = document.getElementById('inputUrl').value.trim();
    if (!url) return;

    const textoEstado = document.getElementById('estado');
    const boton = document.getElementById('btnDescargar');
    const barra = document.getElementById('barra-progreso');
    const contenedorBarra = document.getElementById('contenedor-progreso');

    boton.disabled = true;
    boton.innerText = "Obteniendo info...";
    contenedorBarra.style.display = "block";
    barra.style.width = "0%";

    let comandoNombre = `"${rutaEjecutable}" --get-filename -o "%(title)s.mp4" --no-warnings `;
    if (rutaCookies) comandoNombre += `--cookies "${rutaCookies}" `;
    comandoNombre += `"${url}"`;

    exec(comandoNombre, (err, stdout) => {
        const nombreArchivo = err ? "Video_" + Date.now() + ".mp4" : stdout.trim();
        const rutaCompletaVideo = path.join(carpetaDestino, nombreArchivo);

        boton.innerText = "Descargando...";

        let formato = document.getElementById('selectCalidad').value === "audio" ? "ba/b" : "bv*[ext=mp4]+ba*[ext=m4a]/b[ext=mp4]";

        const args = [
            '--no-check-certificate', '--no-cache-dir', '-f', formato,
            '--merge-output-format', 'mp4', '-o', rutaCompletaVideo, url
        ];
        if (rutaCookies) args.push('--cookies', rutaCookies);

        const proceso = spawn(rutaEjecutable, args);

        proceso.stdout.on('data', (data) => {
            const match = data.toString().match(/(\d+(\.\d+)?)%/);
            if (match) {
                barra.style.width = `${match[1]}%`;
                textoEstado.innerText = `Descargando: ${match[1]}%`;
            }
        });

        proceso.on('close', (code) => {
            boton.disabled = false;
            boton.innerText = "Descargar Video";
            if (code === 0) {
                textoEstado.innerText = "✅ ¡Éxito!";
                textoEstado.style.color = "#10b981";
                agregarAlHistorial(nombreArchivo, rutaCompletaVideo);
            } else {
                textoEstado.innerText = "❌ Error en la descarga.";
                textoEstado.style.color = "#ef4444";
            }
        });
    });
});

document.getElementById('btnActualizar').addEventListener('click', () => {
    const textoEstado = document.getElementById('estado');
    textoEstado.innerText = "🔄 Actualizando motor...";
    exec(`"${rutaEjecutable}" --update`, (error) => {
        textoEstado.innerText = error ? "❌ Error al actualizar" : "✅ Motor al día";
    });
});

document.getElementById('btnTema').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('tema', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

const panel = document.getElementById('panelHistorial');
document.getElementById('btnHistorial').addEventListener('click', () => panel.classList.add('active'));
document.getElementById('btnCerrarHistorial').addEventListener('click', () => panel.classList.remove('active'));

const agregarAlHistorial = (nombre, ruta) => {
    descargasRealizadas.unshift({ nombre, ruta });
    if (descargasRealizadas.length > 15) descargasRealizadas.pop();
    localStorage.setItem('historial', JSON.stringify(descargasRealizadas));
    renderizarHistorial();
};

const renderizarHistorial = () => {
    const lista = document.getElementById('listaDescargas');
    lista.innerHTML = descargasRealizadas.map((d, index) => `
        <div class="descarga-item">
            <span title="${d.nombre}">📦 ${d.nombre}</span>
            <div class="item-btns">
                <button onclick="abrirArchivo('${d.ruta.replace(/\\/g, '/')}')">Abrir</button>
                <button onclick="verEnCarpeta('${d.ruta.replace(/\\/g, '/')}')">Carpeta</button>
                <button class="btn-delete" onclick="eliminarArchivo('${d.ruta.replace(/\\/g, '/')}', ${index})">Eliminar</button>
            </div>
        </div>
    `).join('');
};

window.eliminarArchivo = (ruta, index) => {
    if (confirm("¿Estás seguro de que quieres eliminar el archivo y el registro del historial?")) {
        if (fs.existsSync(ruta)) {
            try {
                fs.unlinkSync(ruta);
                console.log("Archivo físico eliminado correctamente.");
            } catch (err) {
                console.error("Error al eliminar el archivo físico:", err);
            }
        }

        descargasRealizadas.splice(index, 1);
        localStorage.setItem('historial', JSON.stringify(descargasRealizadas));

        renderizarHistorial();
    }
};

window.abrirArchivo = (ruta) => {
    shell.openPath(ruta);
};

window.verEnCarpeta = (ruta) => {
    shell.showItemInFolder(ruta);
};

renderizarHistorial();