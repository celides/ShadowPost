// api/generate-variations.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' });
    }

    try {
        const { idea, t1, t2 } = JSON.parse(req.body);
        if (!idea) return res.status(400).json({ error: 'Falta la idea base.' });

        const API_KEY = process.env.GEMINI_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'Falta la configuración de la llave Gemini en el servidor.' });
        }

        const systemPrompt = `Eres el motor de IA de ShadowPost Pro v3, un estratega de elite en neuroventas y cambaceo digital para telecomunicaciones.
Tu tarea es transformar una idea base en exactamente 3 variaciones de textos persuasivos y optimizados para grupos de Facebook.
REGLAS ESTRICTAS:
- Genera exactamente 3 variaciones ingeniosas, directas y al grano con psicología de urgencia o escasez.
- Cada variación debe ser diferente en su estructura de texto para evadir algoritmos de SPAM de Facebook.
- Al final de cada variación, incluye el enlace de WhatsApp dinámico apuntando al número proporcionado (wa.me/${t1}). Si hay un segundo número (${t2 || ''}), úsalo en la variación 2.
- NO agregues introducciones ni notas. Devuelve ÚNICAMENTE un objeto JSON con un arreglo llamado "variaciones" conteniendo las 3 cadenas de texto. Ej: {"variaciones": ["texto1", "texto2", "texto3"]}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nOferta base del vendedor: ${idea}` }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const rawData = await response.json();
        
        if (!rawData.candidates || rawData.candidates.length === 0) {
            throw new Error('Gemini no devolvió candidatos.');
        }

        let aiResponseText = rawData.candidates[0].content.parts[0].text.trim();
        
        // FILTRO DE SEGURIDAD EXTREMA: Limpia marcas de bloques markdown si Gemini las agrega por error
        if (aiResponseText.startsWith("```")) {
            aiResponseText = aiResponseText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        }

        // Validamos que sea un JSON perfectamente limpio antes de mandarlo a tu celular
        const jsonValidado = JSON.parse(aiResponseText);
        return res.status(200).json(jsonValidado);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Fallo en la red de Gemini.', detalle: error.message });
    }
}
