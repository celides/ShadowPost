        // Conexión del motor de IA Real con el Serverless Proxy de Vercel
        async function generarVariacionesIA() {
            const idea = document.getElementById('base-prompt').value.trim();
            const t1 = document.getElementById('tel-1').value.trim() || "4420000000";
            const t2 = document.getElementById('tel-2').disabled ? "" : document.getElementById('tel-2').value.trim();
            
            if(!idea) { alert("Escribe una idea base primero, Juan Carlos."); return; }

            const outputsContainer = document.getElementById('ai-outputs');
            outputsContainer.innerHTML = `<p class="text-xs text-cyan-400 animate-pulse font-mono">📡 Conectando con Servidor ShadowPost... Invocando Neuroventas IA...</p>`;

            try {
                // Petición real a nuestra función en Vercel
                const response = await fetch('/api/generate-variations', { 
                    method: 'POST', 
                    body: JSON.stringify({ idea, t1, t2 }) 
                });
                
                if (!response.ok) throw new Error('Fallo en la respuesta del servidor.');
                
                const data = await response.json();
                
                // Extraemos las variaciones (asumiendo que vienen en un arreglo dentro del JSON)
                // Ajustable según la estructura exacta que decidas retornar de la IA
                const variaciones = data.variaciones || Object.values(data)[0] || [];
                
                if(variaciones.length === 0) {
                    throw new Error('Arreglo de variaciones vacío.');
                }
                
                outputsContainer.innerHTML = "";
                variaciones.forEach((v, i) => {
                    outputsContainer.innerHTML += `
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono relative group">
                            <span class="text-cyan-500 font-bold block mb-1">Variación Evasiva #${i+1}:</span>
                            <p>${v}</p>
                        </div>`;
                });
                
                // Persistencia inmediata en la memoria local para el UserScript
                localStorage.setItem('shadow_copies', JSON.stringify(variaciones));

            } catch (error) {
                console.error(error);
                outputsContainer.innerHTML = `
                    <p class="text-xs text-red-400 font-mono p-1">⚠️ Error en la red neuronal. Verifica la consola o las variables de entorno de Vercel.</p>
                    <button onclick="generarVariacionesIA()" class="text-[10px] text-cyan-400 underline mt-1 block">Reintentar Conexión</button>
                `;
            }
        }
