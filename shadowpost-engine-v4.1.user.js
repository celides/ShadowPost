// ==UserScript==
// @name         ShadowPost Pro v4.2 — Motor Sigiloso + Preview
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Publica automáticamente con variaciones de texto e imagen, guarda URL del post para preview.
// @author       ShadowPost Technologies
// @match        https://m.facebook.com/groups/*
// @match        https://www.facebook.com/groups/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const ESPERA_INICIAL_MIN = 4000;
    const ESPERA_INICIAL_MAX = 9000;
    const DELAY_LETRA_MIN = 60;
    const DELAY_LETRA_MAX = 220;
    const PAUSA_REVISION_MIN = 3000;
    const PAUSA_REVISION_MAX = 7000;
    const PAUSA_POST_PUBLICACION = 3000;

    function esperar(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function log(msg) { console.log(`%c🥷 ShadowPost %c${msg}`, 'color:#00d4aa;font-weight:bold', 'color:#e6edf3'); }

    function leerVariaciones() { try { return JSON.parse(localStorage.getItem('sp_copies') || '[]'); } catch { return []; } }
    function leerIndice() { return parseInt(localStorage.getItem('sp_idx') || '0'); }
    function escribirIndice(n) { localStorage.setItem('sp_idx', String(n)); }
    function leerCola() { try { return JSON.parse(localStorage.getItem('sp_queue') || '[]'); } catch { return []; } }
    function escribirCola(arr) { localStorage.setItem('sp_queue', JSON.stringify(arr)); }
    function botActivo() { return localStorage.getItem('sp_bot_active') === 'true'; }
    function leerGalería() { try { return JSON.parse(localStorage.getItem('sp_gallery') || '[]'); } catch { return []; } }

    function seleccionarVariacion() {
        const copies = leerVariaciones();
        if (!copies.length) { log('❌ No hay variaciones.'); return null; }
        const idx = leerIndice();
        const variacion = copies[idx % copies.length];
        log(`📝 Variación #${(idx % copies.length) + 1}`);
        return variacion;
    }

    function seleccionarImagenAleatoria() {
        const galeria = leerGalería();
        if (!galeria.length) { log('⚠️ No hay imágenes.'); return null; }
        const idx = Math.floor(Math.random() * galeria.length);
        log(`🖼️ Imagen: ${galeria[idx].name}`);
        return galeria[idx];
    }

    async function subirImagen(dataURL) {
        const res = await fetch(dataURL);
        const blob = await res.blob();
        const file = new File([blob], "flyer.jpg", { type: "image/jpeg" });

        let fileInput = document.querySelector('input[type="file"][accept*="image"]');
        if (!fileInput) {
            const botones = Array.from(document.querySelectorAll('button, [role="button"]'));
            const botonFoto = botones.find(btn => (btn.textContent || '').toLowerCase().includes('foto'));
            if (botonFoto) { botonFoto.click(); await esperar(1500); fileInput = document.querySelector('input[type="file"][accept*="image"]'); }
        }
        if (!fileInput) { log('❌ No se encontró botón de imagen'); return false; }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        log('⬆️ Imagen adjuntada');
        await esperar(2000);
        return true;
    }

    async function escribirComoHumano(elemento, texto) {
        elemento.focus();
        await esperar(rnd(300, 700));
        for (let i = 0; i < texto.length; i++) {
            const char = texto[i];
            elemento.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            if (elemento.tagName === 'TEXTAREA') elemento.value += char;
            else elemento.textContent += char;
            elemento.dispatchEvent(new Event('input', { bubbles: true }));
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
            elemento.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            let delay = rnd(DELAY_LETRA_MIN, DELAY_LETRA_MAX);
            if (Math.random() < 0.08) delay += rnd(400, 900);
            await esperar(delay);
        }
        log(`✍️ Texto escrito: ${texto.length} caracteres.`);
    }

    async function encontrarAreaTexto(intentos = 15) {
        for (let i = 0; i < intentos; i++) {
            const selectores = ['[role="textbox"]', 'textarea[name="xc_message"]', 'textarea', '[contenteditable="true"]'];
            for (const sel of selectores) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) { log(`🎯 Encontrado: ${sel}`); return el; }
            }
            await esperar(2000);
        }
        return null;
    }

    async function encontrarBotonPublicar(intentos = 10) {
        for (let i = 0; i < intentos; i++) {
            const botones = Array.from(document.querySelectorAll('button, [role="button"]'));
            const boton = botones.find(btn => {
                const txt = (btn.textContent || '').toLowerCase().trim();
                return txt === 'publicar' || txt === 'post' || txt === 'compartir';
            });
            if (boton && !boton.disabled) { log('🚀 Botón "Publicar" encontrado'); return boton; }
            await esperar(1500);
        }
        return null;
    }

    function avanzarIndice() {
        const actual = leerIndice();
        const nuevo = actual + 1;
        escribirIndice(nuevo);
        const cola = leerCola();
        if (cola.length > 0) { cola.shift(); escribirCola(cola); }
        log(`✅ Grupo completado. Nuevo índice: ${nuevo}`);
    }

    async function publicarEnGrupo() {
        log('🟢 Motor iniciado.');
        if (!botActivo()) { log('⏸️ Inactivo'); return false; }
        const texto = seleccionarVariacion();
        if (!texto) return false;
        const imagen = seleccionarImagenAleatoria();

        await esperar(rnd(ESPERA_INICIAL_MIN, ESPERA_INICIAL_MAX));
        const areaTexto = await encontrarAreaTexto();
        if (!areaTexto) { log('❌ No hay cuadro de texto'); return false; }

        if (imagen) await subirImagen(imagen.dataURL);
        await escribirComoHumano(areaTexto, texto);
        await esperar(rnd(PAUSA_REVISION_MIN, PAUSA_REVISION_MAX));

        const botonPublicar = await encontrarBotonPublicar();
        if (!botonPublicar) { log('❌ No hay botón Publicar'); return false; }
        botonPublicar.click();
        log('📤 Publicado');

        // Guardar la URL del post recién creado para el botón Preview
        await esperar(4000);
        const postLink = document.querySelector('a[href*="/posts/"]:first-child')?.href;
        if (postLink) {
            localStorage.setItem('sp_last_post_url', postLink);
            log(`🔗 URL del post guardada: ${postLink}`);
        }

        await esperar(PAUSA_POST_PUBLICACION);
        avanzarIndice();

        const cola = leerCola();
        if (cola.length > 0 && botActivo()) {
            log(`➡️ Siguiente grupo en 3s: ${cola[0]}`);
            await esperar(3000);
            window.location.href = cola[0];
        } else {
            log('🏁 Cola completada');
            localStorage.setItem('sp_bot_active', 'false');
        }
        return true;
    }

    window.addEventListener('load', async () => { await esperar(2500); publicarEnGrupo(); });
})();
