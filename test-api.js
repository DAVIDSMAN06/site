// test-api.js - Fișier de test pentru verifica API OpenAI
// 
// Utilizare: node test-api.js

const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🧪 TEST API OpenAI\n');
console.log('═'.repeat(50));

if (!OPENAI_API_KEY) {
  console.error('❌ EROARE: OPENAI_API_KEY nu e setat în .env');
  process.exit(1);
}

console.log('✅ API Key găsit (format valid)');
console.log('📝 Lungime cheie:', OPENAI_API_KEY.length, 'caractere');
console.log('\n🔄 Se testează conexiunea la OpenAI...\n');

async function testOpenAI() {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tu ești un asistent educational despre gândire și inteligență.'
        },
        {
          role: 'user',
          content: 'Ce este gândirea?'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ SUCCES! OpenAI API funcționează!\n');
    console.log('📝 Răspunsul OpenAI:');
    console.log('─'.repeat(50));
    console.log(response.data.choices[0].message.content);
    console.log('─'.repeat(50));
    console.log('\n✅ Backend ar trebui să funcționeze!');
    console.log('\n🚀 Rulează: npm start');

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ EROARE 401: API Key INVALID!');
      console.error('Verifică cheia din .env');
    } else if (error.response?.status === 429) {
      console.error('❌ EROARE 429: Rate limit atins!');
      console.error('Așteaptă puțin și încearcă din nou');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('❌ EROARE: Nicio conexiune la internet!');
    } else {
      console.error('❌ EROARE:', error.message);
    }
    console.error('\n📋 Verifică:');
    console.error('  1. OPENAI_API_KEY în .env');
    console.error('  2. Conexiunea la internet');
    console.error('  3. Quota OpenAI nu e depășită');
    process.exit(1);
  }
}

testOpenAI();
