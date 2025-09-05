// --- IMPORTAÇÕES NECESSÁRIAS ---
// Biblioteca whatsapp-web.js para integração com WhatsApp Web
// Biblioteca qrcode-terminal para gerar QR codes no terminal
// Biblioteca axios para fazer requisições HTTP
// Biblioteca fs para manipulação de arquivos (cache)   

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// --- CONFIGURAÇÕES ---
// Pasta para armazenar cache de respostas da API
// Duração do cache em horas
// (Exemplo: 24 horas)  
// Você pode ajustar conforme necessário
// Certifique-se de que a pasta exista ou o código a criará automaticamente

const CACHE_FOLDER = './api_cache/';
const CACHE_DURATION_HOURS = 24;

// --- SESSÕES DE CONVERSA ---
// Armazena o estado da conversa para cada usuário
// Estrutura: { 'user_id': { step: 'STEP_NAME', data: { ... } } }
// Exemplo de steps: START, GET_NAME, GET_AGE, GET_PHONE, GET_LOCATION
// Você pode expandir conforme necessário
const userSessions = {};

// --- INICIALIZAÇÃO DO CLIENTE DO WHATSAPP ---
// Configura o cliente com autenticação local e opções do Puppeteer
// (headless, args para evitar problemas em certos ambientes)
// Gera o QR code no terminal para autenticação
// Configura eventos para lidar com mensagens recebidas e estado do cliente
// Inicia o cliente

console.log('Iniciando o cliente do WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- EVENTOS DO CLIENTE ---
// Gera o QR code no terminal para autenticação
// Indica quando o cliente está pronto
// Lida com mensagens recebidas (texto e localização)
// Filtra mensagens para garantir que são de usuários (não grupos ou sistemas)
// Processa a lógica de conversa e localização
// Envia respostas apropriadas
// Usa funções auxiliares para geocodificação, cálculo de distância, cache e formatação de respostas
// Limpa sessões de usuários após completar a interação
// Fornece feedback no console para monitoramento

client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('ESCANEAR O QR CODE ABAIXO COM O SEU WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('✅ Cliente do WhatsApp conectado e pronto para uso!');
    // Garante que a pasta de cache exista
    if (!fs.existsSync(CACHE_FOLDER)) {
        fs.mkdirSync(CACHE_FOLDER);
    }
});

client.on('message', async (message) => {
    if (!message.from.endsWith('@c.us')) return;

    // Lógica especial para mensagens de localização

    if (message.type === 'location') {
        const from = message.from;
        const session = userSessions[from];
        if (session && session.step === 'GET_LOCATION') {
            console.log(`Recebida localização de ${from}: Lat ${message.location.latitude}, Lon ${message.location.longitude}`);
            await handleLocation(from, message.location);
        }
        return;
    }

    // Lógica para mensagens de texto
    // Continua a conversa com base no estado atual da sessão do usuário

    if (message.type !== 'chat') return;
    const from = message.from;
    const userInput = message.body;
    console.log(`Mensagem recebida de ${from}: "${userInput}"`);
    await handleConversation(from, userInput);
});

// --- FUNÇÕES DE LÓGICA ---
// Funções auxiliares para geocodificação, cálculo de distância, cache e formatação de respostas
// Limpa sessões de usuários após completar a interação
// Fornece feedback no console para monitoramento

// Converte coordenadas (lat/lon) em endereço para pegar o UF
// Usa a API Nominatim do OpenStreetMap
// Retorna o código do estado (UF) em minúsculas ou null se não encontrado

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'ChatbotSaude/1.0' } });
        const stateCode = response.data.address.state_code;
        if (!stateCode) throw new Error('UF não encontrado para as coordenadas.');
        return stateCode.toLowerCase();
    } catch (error) {
        console.error('Erro na geocodificação reversa:', error.message);
        return null;
    }
}

// Calcula a distância em KM entre dois pontos geográficos
// Usa a fórmula de Haversine
// Retorna a distância em quilômetros
// Fonte: https://stackoverflow.com/a/21623206
// (Adaptado para JavaScript)
// (lat1, lon1) e (lat2, lon2) são as coordenadas dos dois pontos

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Busca os postos de saúde (com cache por estado)
// Usa a API do Governo para obter os dados
// Armazena o resultado em cache para evitar chamadas repetidas
// Retorna a lista de postos de saúde
// (uf deve ser em minúsculas, ex: 'sp', 'rj')

async function getPostosData(uf) {
    const cacheFilePath = `${CACHE_FOLDER}postos_${uf}.json`;
    if (fs.existsSync(cacheFilePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
        const now = new Date();
        const cacheAgeHours = (now - new Date(cacheData.timestamp)) / (1000 * 60 * 60);
        if (cacheAgeHours < CACHE_DURATION_HOURS) {
            console.log(`Usando cache para o estado: ${uf.toUpperCase()} ⚡`);
            return cacheData.data;
        }
    }
    console.log(`Buscando dados na API do Governo para o estado: ${uf.toUpperCase()}...`);
    const apiUrl = `https://apidadosabertos.saude.gov.br/assistencia-a-saude/hospitais-e-leitos?uf=${uf}`;
    const response = await axios.get(apiUrl);
    const postosData = response.data.hospitais_leitos;
    const newCacheData = { timestamp: new Date(), data: postosData };
    fs.writeFileSync(cacheFilePath, JSON.stringify(newCacheData, null, 2));
    console.log(`Cache criado para o estado: ${uf.toUpperCase()}`);
    return postosData;
}

// Formata a resposta do posto de saúde
// Inclui nome, endereço, distância e link para o Google Maps
// Retorna uma string formatada para envio no WhatsApp 
// (posto é o objeto do posto, distancia é a distância em KM)
// Usa encodeURIComponent para criar o link do Google Maps
// Formata o endereço de forma amigável para o usuário do WhatsApp 
// Inclui emojis para melhorar a aparência da mensagem 

function formatarPosto(posto, distancia) {
    const nome = posto.nomeFantasia || 'Nome não informado';
    const rua = posto.logradouro || '';
    const numero = posto.numero || '';
    const bairro = posto.bairro || '';
    const cidade = posto.municipio || 'Cidade não informada';
    const enderecoCompleto = [rua, numero, bairro].filter(part => part).join(', ');
    const query = enderecoCompleto ? `${nome}, ${enderecoCompleto}, ${cidade}` : `${nome}, ${cidade}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const enderecoDisplay = enderecoCompleto || 'Endereço não informado.';
    return `📍 *${nome}* (~${distancia.toFixed(1)} km)\n   Endereço: ${enderecoDisplay}\n   🗺️ Ver no mapa: ${mapsUrl}`;
}


// --- HANDLERS DE CONVERSA ---

// Lida com a localização recebida
async function handleLocation(from, location) {
    await client.sendMessage(from, 'Ótimo, recebi sua localização! Só um momento enquanto procuro os postos de saúde mais próximos... 🗺️');
    const userLat = parseFloat(location.latitude);
    const userLon = parseFloat(location.longitude);

    try {
        const uf = await reverseGeocode(userLat, userLon);
        if (!uf) {
            await client.sendMessage(from, 'Desculpe, não consegui identificar o estado em que você está. Por favor, tente enviar a localização novamente.');
            return;
        }

        const todosPostos = await getPostosData(uf);
        if (!todosPostos || todosPostos.length === 0) {
            await client.sendMessage(from, `Não encontrei dados de postos de saúde para o estado de ${uf.toUpperCase()}.`);
            delete userSessions[from];
            return;
        }

        const postosComDistancia = todosPostos
            .filter(p => p.latitude && p.longitude)
            .map(posto => {
                const postoLat = parseFloat(posto.latitude.replace(',', '.'));
                const postoLon = parseFloat(posto.longitude.replace(',', '.'));
                const distancia = calculateDistance(userLat, userLon, postoLat, postoLon);
                return { ...posto, distancia };
            });

        postosComDistancia.sort((a, b) => a.distancia - b.distancia);

        const postosProximos = postosComDistancia.slice(0, 5); // Pega os 5 mais próximos

        if (postosProximos.length > 0) {
            let botResponse = 'Aqui estão os 5 postos de saúde mais próximos de você:\n\n';
            botResponse += postosProximos.map(p => formatarPosto(p, p.distancia)).join('\n\n');
            botResponse += '\n\nObrigado por utilizar nosso sistema! Se cuida na estrada!';
            await client.sendMessage(from, botResponse);
        } else {
            await client.sendMessage(from, 'Não encontrei postos de saúde com geolocalização próximos a você. Verificando a cidade...');
        }

    } catch (error) {
        console.error("Erro ao processar localização:", error);
        await client.sendMessage(from, 'Ocorreu um erro técnico ao processar sua localização. Por favor, tente novamente mais tarde.');
    } finally {
        delete userSessions[from];
    }
}


// Lida com a conversa por texto
async function handleConversation(from, userInput) {
    if (!userSessions[from]) {
        userSessions[from] = { step: 'START', data: {} };
    }
    const session = userSessions[from];
    let botResponse = '';

    switch (session.step) {
        case 'START':
            botResponse = 'Olá, amigo(a) da estrada! Sou seu assistente de saúde. Para começarmos, qual seu nome?';
            session.step = 'GET_NAME';
            break;
        case 'GET_NAME':
            session.data.nome = userInput;
            botResponse = `Prazer, ${userInput.split(' ')[0]}! Agora, por favor, me diga sua idade.`;
            session.step = 'GET_AGE';
            break;
        case 'GET_AGE':
            session.data.idade = userInput;
            botResponse = 'Entendido. E qual o seu telefone para contato?';
            session.step = 'GET_PHONE';
            break;
        case 'GET_PHONE':
            session.data.telefone = userInput;
            botResponse = `Obrigado pelas informações! Para encontrar o posto de saúde mais próximo, por favor, me envie sua localização atual.\n\nVocê pode fazer isso clicando no *clipe de anexo (📎)* aqui no WhatsApp, depois em *'Localização'* e em seguida em *'Localização em tempo real'* ou *'Localização atual'*.`;
            session.step = 'GET_LOCATION';
            break;
        case 'GET_LOCATION':
             botResponse = `Por favor, me envie sua localização usando o clipe de anexo (📎) para que eu possa encontrar os postos mais próximos.`;
             break;
    }

    if (botResponse) {
        await client.sendMessage(from, botResponse);
        console.log(`Resposta enviada para ${from}.`);
    }
}


// --- INICIA O CLIENTE ---
client.initialize();
