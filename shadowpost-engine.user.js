// ==UserScript==
// @name         ShadowPost Pro v4.1 — Stealth Engine + Imágenes Múltiples
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Publica automáticamente con variaciones de texto y una imagen aleatoria de la galería. Sincronizado con ShadowPost Dashboard.
// @author       ShadowPost Technologies
// @match        https://m.facebook.com/groups/*
// @match        https://www.facebook.com/groups/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    const ESPERA_INICIAL_MIN = 4000;   // 4 segundos
    const ESPERA_INICIAL_MAX = 9000;   // 9 segundos
    const DELAY_LETRA_MIN = 60;
    const DELAY_LETRA_MAX = 220;
    const PAUSA_REVISION_MIN = 3000;
    const PAUSA_REVISION_MAX = 7000;
    const PAUSA_POST_PUBLICACION = 3000;

    // ═══════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ═══════════════════════════════════════════════════════════════════════
    function esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function rnd(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function log(msg) {
        console.log(`%c🥷 ShadowPost %c${msg}`, 'color:#00d4aa;font-weight:bold', 'color:#e6edf3');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEER ESTADO DESDE LOCALSTORAGE (sincronizado con el dashboard)
    // ═══════════════════════════════════════════════════════════════════════
    function leerVariaciones() {
        try {
            return JSON.parse(localStorage.getItem('sp_copies') || '[]');
        } catch {
            return [];
        }
    }

    function leerIndice() {
        return parseInt(localStorage.getItem('sp_idx') || '0');
    }

    function escribirIndice(n) {
        localStorage.setItem('sp_idx', String(n));
    }

    function leerCola() {
        try {
            return JSON.parse(localStorage.getItem('sp_queue') || '[]');
        } catch {
            return [];
        }
    }

    function escribirCola(arr) {
        localStorage.setItem('sp_queue', JSON.stringify(arr));
    }

    function botActivo() {
        return localStorage.getItem('sp_bot_active') === 'true';
    }

    // Leer la galería de imágenes (array de objetos { name, dataURL })
    function leerGalería() {
        try {
            return JSON.parse(localStorage.getItem('sp_gallery') || '[]');
        } catch {
            return [];
        }
    }

    // Selecciona una variación de texto rotativa según el índice actual
    function seleccionarVariacion() {
        const copies = leerVariaciones();
        if (!copies.length) {
            log('❌ No hay variaciones de texto. Genera o guarda manualmente desde el dashboard.');
            return null;
        }
        const idx = leerIndice();
        const variacion = copies[idx % copies.length];
        log(`📝 Variación seleccionada: #${(idx % copies.length) + 1} de ${copies.length}`);
        return variacion;
    }

    // Selecciona una imagen aleatoria de la galería (si existe)
    function seleccionarImagenAleatoria() {
        const galeria = leerGalería();
        if (!galeria.length) {
            log('⚠️ No hay imágenes en la galería. Se publicará solo texto.');
            return null;
        }
        const idx = Math.floor(Math.random() * galeria.length);
        const img = galeria[idx];
        log(`🖼️ Imagen seleccionada: ${img.name}`);
        return img;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBIR IMAGEN A FACEBOOK (simula clic humano en el botón de foto)
    // ═══════════════════════════════════════════════════════════════════════
    async function subirImagen(dataURL) {
        // Convertir dataURL a Blob
        const fetchBlob = async (url) => {
            const res = await fetch(url);
            return res.blob();
        };
        const blob = await fetchBlob(dataURL);
        const file = new File([blob], "flyer.jpg", { type: "image/jpeg" });

        // Buscar el input de archivo (botón "Agregar foto")
        let fileInput = document.querySelector('input[type="file"][accept*="image"]');
        if (!fileInput) {
            // Intentar encontrar un botón que diga "Foto/Video" y hacer clic para que aparezca el input
            const botones = Array.from(document.querySelectorAll('button, [role="button"]'));
            const botonFoto = botones.find(btn => {
                const texto = (btn.textContent || '').toLowerCase();
                return texto.includes('foto') || texto.includes('photo') || texto.includes('imagen');
            });
            if (botonFoto) {
                log('📸 Haciendo clic en botón de foto...');
                botonFoto.click();
                await esperar(1500);
                fileInput = document.querySelector('input[type="file"][accept*="image"]');
            }
        }

        if (!fileInput) {
            log('❌ No se encontró el botón para subir imagen. Se publicará solo texto.');
            return false;
        }

        // Inyectar el archivo
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        log('⬆️ Imagen adjuntada al post');
        await esperar(2000);
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ESCRITURA HUMANA (letra por letra con pausas aleatorias)
    // ═══════════════════════════════════════════════════════════════════════
    async function escribirComoHumano(elemento, texto) {
        elemento.focus();
        await esperar(rnd(300, 700));

        for (let i = 0; i < texto.length; i++) {
            const char = texto[i];
            // Eventos realistas
            elemento.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));

            if (elemento.tagName === 'TEXTAREA') {
                elemento.value += char;
            } else {
                elemento.textContent += char;
            }

            elemento.dispatchEvent(new Event('input', { bubbles: true }));
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

            let delay = rnd(DELAY_LETRA_MIN, DELAY_LETRA_MAX);
            if (Math.random() < 0.08) delay += rnd(400, 900); // pausa pensante
            await esperar(delay);
        }
        log(`✍️ Texto escrito: ${texto.length} caracteres.`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUSCAR CUADRO DE TEXTO (adaptado a Facebook)
    // ═══════════════════════════════════════════════════════════════════════
    async function encontrarAreaTexto(intentos = 15) {
        for (let i = 0; i < intentos; i++) {
            const selectores = [
                '[role="textbox"]',
                'textarea[name="xc_message"]',
                'textarea',
                '[contenteditable="true"]',
                '[data-lexical-editor="true"]'
            ];
            for (const sel of selectores) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) {
                    log(`🎯 Cuadro de texto encontrado con: ${sel}`);
                    return el;
                }
            }
            await esperar(2000);
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUSCAR BOTÓN PUBLICAR
    // ═══════════════════════════════════════════════════════════════════════
    async function encontrarBotonPublicar(intentos = 10) {
        for (let i = 0; i < intentos; i++) {
            const botones = Array.from(document.querySelectorAll('button, [role="button"]'));
            const boton = botones.find(btn => {
                const txt = (btn.textContent || '').toLowerCase().trim();
                return txt === 'publicar' || txt === 'post' || txt === 'compartir' || txt === 'share';
            });
            if (boton && !boton.disabled) {
                log('🚀 Botón "Publicar" localizado.');
                return boton;
            }
            await esperar(1500);
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AVANZAR ÍNDICE Y COLA (al terminar una publicación)
    // ═══════════════════════════════════════════════════════════════════════
    function avanzarIndice() {
        const actual = leerIndice();
        const nuevo = actual + 1;
        escribirIndice(nuevo);

        const cola = leerCola();
        if (cola.length > 0) {
            cola.shift();   // eliminar el grupo actual
            escribirCola(cola);
        }
        log(`✅ Grupo completado. Nuevo índice: ${nuevo}. Cola restante: ${cola.length}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ALGORITMO PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════
    async function publicarEnGrupo() {
        log('🟢 Motor iniciado en este grupo.');

        // 1. Verificar que el bot está activo
        if (!botActivo()) {
            log('⏸️ Bot inactivo. Presiona PLAY en el dashboard.');
            return false;
        }

        // 2. Obtener texto e imagen
        const texto = seleccionarVariacion();
        if (!texto) return false;
        const imagen = seleccionarImagenAleatoria();

        // 3. Espera inicial (simular lectura)
        const esperaInicial = rnd(ESPERA_INICIAL_MIN, ESPERA_INICIAL_MAX);
        log(`⏳ Esperando ${(esperaInicial/1000).toFixed(1)}s antes de publicar...`);
        await esperar(esperaInicial);

        // 4. Encontrar área de texto
        const areaTexto = await encontrarAreaTexto();
        if (!areaTexto) {
            log('❌ No se encontró el cuadro de texto. ¿El grupo permite publicaciones?');
            return false;
        }

        // 5. Si hay imagen, subirla primero (Facebook permite adjuntar antes de escribir)
        if (imagen) {
            await subirImagen(imagen.dataURL);
        }

        // 6. Escribir el texto
        await escribirComoHumano(areaTexto, texto);

        // 7. Pausa de revisión
        const pausaRevision = rnd(PAUSA_REVISION_MIN, PAUSA_REVISION_MAX);
        log(`👀 Revisando texto durante ${(pausaRevision/1000).toFixed(1)}s...`);
        await esperar(pausaRevision);

        // 8. Buscar y hacer clic en Publicar
        const botonPublicar = await encontrarBotonPublicar();
        if (!botonPublicar) {
            log('❌ No se encontró el botón "Publicar".');
            return false;
        }
        botonPublicar.click();
        log('📤 Publicación enviada.');

        // 9. Esperar a que se publique
        await esperar(PAUSA_POST_PUBLICACION);

        // 10. Avanzar índice y cola
        avanzarIndice();

        // 11. Navegar al siguiente grupo si existe en la cola
        const cola = leerCola();
        if (cola.length > 0 && botActivo()) {
            const nextUrl = cola[0];
            log(`➡️ Navegando al siguiente grupo en 3 segundos: ${nextUrl}`);
            await esperar(3000);
            window.location.href = nextUrl;
        } else {
            log('🏁 Cola completada o motor detenido.');
            localStorage.setItem('sp_bot_active', 'false');
        }
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUNTO DE ENTRADA (cuando carga el grupo)
    // ═══════════════════════════════════════════════════════════════════════
    window.addEventListener('load', async () => {
        // Pequeña espera para que Facebook termine de cargar su interfaz
        await esperar(2500);
        publicarEnGrupo();
    });
})();
