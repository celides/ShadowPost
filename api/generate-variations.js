export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' });
    }

    try {
        // Manejo robusto del body (Vercel puede mandarlo como string u objeto)
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { idea, telefonos } = body;

        if (!idea) {
            return res.status(400).json({ error: 'Falta la idea base.' });
        }

        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({
                error: 'Falta la configuración de la llave Gemini en el servidor.',
                debug: 'Variable GEMINI_API_KEY no encontrada en entorno de Producción.'
            });
        }

        // Construcción dinámica de instrucciones de teléfonos
        const telefonosActivos = (telefonos || []).filter(t => t && t.trim() !== '');
        let instruccionTelefonos = '';
        if (telefonosActivos.length > 0) {
            instruccionTelefonos = `Distribuye los siguientes números de WhatsApp entre las variaciones de forma natural:\n`;
            telefonosActivos.forEach((t, i) => {
                instruccionTelefonos += `- Variación ${i + 1}: wa.me/${t.replace(/\D/g,'')}\n`;
            });
            if (telefonosActivos.length < 3) {
                instruccionTelefonos += `- Las variaciones restantes usan: wa.me/${telefonosActivos[0].replace(/\D/g,'')}\n`;
            }
        }

        const systemPrompt = `Eres el motor de IA de ShadowPost Pro, un estratega de élite en neuroventas y cambaceo digital para telecomunicaciones en México.

Tu tarea: transformar una oferta base en exactamente 3 variaciones de textos persuasivos para grupos de Facebook y WhatsApp.

REGLAS ESTRICTAS:
1. Genera EXACTAMENTE 3 variaciones. Nada más, nada menos.
2. Cada variación debe tener estructura diferente (una con emojis, una formal, una con urgencia/escasez) para evadir filtros de SPAM.
3. Usa psicología de ventas: urgencia, escasez, beneficio claro, llamada a acción directa.
4. Incluye el enlace de WhatsApp al final de cada variación.
5. Textos concisos y directos. Sin relleno. Sin hashtags.
6. Lenguaje natural mexicano, no corporativo.
${instruccionTelefonos}

FORMATO DE RESPUESTA: Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown, sin texto extra:
{"variaciones": ["texto_variacion_1", "texto_variacion_2", "texto_variacion_3"]}`;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nOferta base: ${idea}` }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.8,
                        maxOutputTokens: 1500
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            throw new Error(`Gemini status ${geminiResponse.status}: ${errorBody}`);
        }

        const rawData = await geminiResponse.json();

        if (!rawData.candidates || rawData.candidates.length === 0) {
            throw new Error('Gemini no devolvió candidatos. Posible bloqueo de contenido o límite de cuota.');
        }

        let aiResponseText = rawData.candidates[0].content.parts[0].text.trim();

        // Limpieza defensiva de bloques markdown
        aiResponseText = aiResponseText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        const jsonValidado = JSON.parse(aiResponseText);

        if (!jsonValidado.variaciones || !Array.isArray(jsonValidado.variaciones)) {
            throw new Error('Formato inesperado de Gemini: falta el campo "variaciones".');
        }

        return res.status(200).json(jsonValidado);

    } catch (error) {
        console.error('[ShadowPost API Error]', error.message);
        return res.status(500).json({
            error: 'Error al procesar la solicitud.',
            detalle: error.message
        });
    }
}
