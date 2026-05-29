// api/generate-variations.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        const { idea, t1, t2 } = JSON.parse(req.body);

        if (!idea) {
            return res.status(400).json({ error: 'Falta la idea o propuesta base.' });
        }

        const API_KEY = process.env.GROQ_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'Falta la configuración de la llave IA en el servidor.' });
        }

        const systemPrompt = `Eres el motor de IA de ShadowPost Pro v3, un estratega de elite en neuroventas y cambaceo digital para telecomunicaciones.
Tu tarea es transformar una idea base en 3 variaciones de textos altamente persuasivos y optimizados para grupos de Facebook.

REGLAS ESTRICTAS DE COPIADO:
- Genera exactamente 3 variaciones ingeniosas, directas y al grano.
- Usa gatillos mentales de urgencia o escasez de manera sutil pero letal (ej: cupos de instalación limitados, precio especial temporal).
- Cada variación debe ser diferente en su estructura de texto para evadir los algoritmos de detección de SPAM de Facebook (Usa sinonimia y orden caótico).
- Al final de cada variación, debes incluir de forma obligatoria y exacta el enlace de WhatsApp dinámico apuntando al número principal proporcionado.
- Si viene un segundo número (t2), alterna el enlace en la variación 2 para usar ese número de respaldo, maximizando la rotación.
- NO agregues introducciones, notas, ni explicaciones adicionales. Devuelve ÚNICAMENTE un arreglo en formato JSON con los 3 textos.

DATOS DEL VENDEDOR:
- Número Principal: ${t1}
- Número Respaldo: ${t2 || 'No disponible'}`;

        const userPrompt = `Transforma esta oferta base en las 3 variaciones tácticas: "${idea}"`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                response_format: { type: "json_object" }
            })
        });

        const rawData = await response.json();
        
        if (!rawData.choices || rawData.choices.length === 0) {
            throw new Error('La IA no devolvió resultados válidos.');
        }

        const aiResponseText = rawData.choices[0].message.content;
        
        let parsedJSON;
        try {
            parsedJSON = JSON.parse(aiResponseText);
        } catch (e) {
            parsedJSON = { variaciones: [aiResponseText] };
        }

        return res.status(200).json(parsedJSON);

    } catch (error) {
        console.error('Error en Servidor ShadowPost:', error);
        return res.status(500).json({ error: 'Fallo crítico en el procesamiento de la variación.', detalle: error.message });
    }
}
