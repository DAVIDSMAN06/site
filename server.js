const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Contextul cursului - materiile permise
const COURSE_CONTEXT = `Tu ești un asistent educațional pentru un curs de Psihologie - Clasa X, 
cu tema "Gândirea și Inteligența". Trebuie să răspunzi DOAR la întrebări legate de:

1. GÂNDIREA:
   - Definiția gândirii
   - Caracteristici (generalitate, abstractitate, caracter activ, determinare socială)
   - Diferența de percepție, reprezentare, memorie
   - Rolul în cunoaștere
   - Poziția în procesele cognitive

2. PROCESELE GÂNDIRII:
   - Analiza (descompunere)
   - Sinteza (reunire)
   - Abstractizarea (extragere esență)
   - Generalizarea (trecere la general)

3. FORMELE LOGICE ALE GÂNDIRII:
   - Conceptul (intensiune, extensiune)
   - Judecata (tipuri, structură)
   - Raționamentul (deductiv, inductiv, analogic)

4. NATURA INTELIGENȚEI:
   - Definiție și caracteristici
   - Componente (abstractă, practică, socială, emoțională)
   - Modelul Triarhic (Sternberg)
   - Inteligenţe multiple (Gardner)
   - Factori influenți
   - Plasticitate cerebrală

5. MĂSURAREA INTELIGENȚEI:
   - Formula IQ
   - Teste de inteligență
   - Limitări și critici
   - Implicații etice

INSTRUCȚIUNI IMPORTANTE:
- Răspunde la orice întrebare cu claritate și respect
- Explică răspunsurile în limbă română
- Oferă exemple practice acolo unde se potrivește
- Dacă nu ești sigur, spune "nu știu" sau explică ce nu e clar
- Fii amical și educativ`;

// Funcție pentru a valida dacă întrebarea e în domeniu.
// Doar psihologie / gândire / inteligență sunt permise aici.
async function isQuestionInCourseScope(question) {
  const keywordsCourse = [
    'gândire', 'gândit', 'proces', 'analiz', 'sintez', 'concept', 'judecată',
    'raționament', 'logică', 'inteligență', 'iq', 'test', 'psiholog',
    'psihologie', 'cognit', 'cunoaștere', 'măsurare', 'abstractizare', 'generalizare',
    'mental', 'creier', 'minte', 'memorie', 'percepție', 'perceptie', 'reprezentare',
    'ssu'
  ];

  const lowerQuestion = question.toLowerCase();

  // Dacă utilizatorul vine cu o întrebare despre minte/creier/psihologie/logica, considerăm în domeniu.
  if (lowerQuestion.includes('minte') || lowerQuestion.includes('creier') || lowerQuestion.includes('psihologie') || lowerQuestion.includes('logic')) {
    return true;
  }

  // Dacă nevoia de imporimitii la termeni psihologie relevanți
  return keywordsCourse.some(keyword => lowerQuestion.includes(keyword));
}

// Ruta principală pentru chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mesajul e gol' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'API Key nu e configurat' });
    }

    const inScope = await isQuestionInCourseScope(message);
    if (!inScope) {
      return res.json({
        response: "Scuze! 🙏 Pot răspunde DOAR la întrebări despre psihologie (gândire, procese cognitive, inteligență, IQ etc.). " +
                  "Te rog, pune o întrebare relevantă pentru materia de psihologie."
      });
    }

    // Apel la OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: COURSE_CONTEXT
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;

    res.json({ response: aiResponse });

  } catch (error) {
    console.error('Eroare API:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'API Key invalid' });
    }
    
    res.status(500).json({ 
      error: 'Eroare la procesarea întrebării. Încearcă din nou.' 
    });
  }
});

// Ruta de verificare dacă serverul funcționează
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server e pornit!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI Server funcționează pe http://localhost:${PORT}`);
  console.log(`📝 Endpoint chat: POST http://localhost:${PORT}/api/chat`);
});
