// --- IMPORTAÇÕES NECESSÁRIAS ---
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// --- CONFIGURAÇÕES ---
const CACHE_FOLDER = './api_cache/';
const CACHE_DURATION_HOURS = 24;

// --- SESSÕES DE CONVERSA ---
const userSessions = {};

// --- INICIALIZAÇÃO DO CLIENTE DO WHATSAPP ---
console.log('Iniciando o cliente do WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// --- EVENTOS DO CLIENTE ---
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('ESCANEAR O QR CODE ABAIXO COM O SEU WHATSAPP:');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------');
});

client.on('ready', () => {
    console.log('✅ Cliente do WhatsApp conectado e pronto para uso!');
    if (!fs.existsSync(CACHE_FOLDER)) {
        fs.mkdirSync(CACHE_FOLDER);
    }
});

client.on('message', async (message) => {
    if (!message.from.endsWith('@c.us')) return;

    if (message.type === 'location') {
        const from = message.from;
        const session = userSessions[from];
        if (session && session.step === 'GET_LOCATION') {
            console.log(`Recebida localização de ${from}: Lat ${message.location.latitude}, Lon ${message.location.longitude}`);
            await handleLocation(from, message.location);
        }
        return;
    }

    const from = message.from;
    const userInput = message.body;
    console.log(`Mensagem recebida de ${from}: "${userInput}"`);
    await handleConversation(from, userInput);
});

// --- FUNÇÕES DE LÓGICA ---

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        console.log(`[DEBUG] Chamando a URL de geocodificação: ${url}`);
        const response = await axios.get(url, { headers: { 'User-Agent': 'ChatbotSaude/1.0' } });
        const isoCode = response.data.address['ISO3166-2-lvl4'];
        if (!isoCode || !isoCode.includes('-')) {
            throw new Error('Código ISO do estado (UF) não encontrado na resposta da API.');
        }
        const uf = isoCode.split('-')[1];
        return uf.toLowerCase();
    } catch (error) {
        console.error('Erro na geocodificação reversa:', error.message);
        return null;
    }
}

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

async function getPostosData(uf) {
    const cacheFilePath = `${CACHE_FOLDER}postos_cnes_${uf}.json`; // Novo nome de cache
    if (fs.existsSync(cacheFilePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
        const now = new Date();
        const cacheAgeHours = (now - new Date(cacheData.timestamp)) / (1000 * 60 * 60);
        if (cacheAgeHours < CACHE_DURATION_HOURS) {
            console.log(`Usando cache CNES para o estado: ${uf.toUpperCase()} ⚡`);
            return cacheData.data;
        }
    }
    console.log(`Buscando dados na API CNES para o estado: ${uf.toUpperCase()}...`);
    // >>>>> MUDANÇA PRINCIPAL: NOVA URL DA API <<<<<
    const apiUrl = `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?uf=${uf}`;
    const response = await axios.get(apiUrl);
    const postosData = response.data; // A estrutura da resposta é diferente
    const newCacheData = { timestamp: new Date(), data: postosData };
    fs.writeFileSync(cacheFilePath, JSON.stringify(newCacheData, null, 2));
    console.log(`Cache CNES criado para o estado: ${uf.toUpperCase()}`);
    return postosData;
}

function formatarPosto(posto, distancia) {
    // >>>>> MUDANÇA: Usando os nomes de campo da nova API <<<<<
    const nome = posto.noFantasia || 'Nome não informado';
    const rua = posto.noLogradouro || '';
    const numero = posto.nuEndereco || '';
    const bairro = posto.noBairro || '';
    const cidade = posto.noMunicipio || 'Cidade não informada';
    const enderecoCompleto = [rua, numero, bairro].filter(part => part).join(', ');
    const query = enderecoCompleto ? `${nome}, ${enderecoCompleto}, ${cidade}` : `${nome}, ${cidade}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const enderecoDisplay = enderecoCompleto || 'Endereço não informado.';
    return `📍 *${nome}* (~${distancia.toFixed(1)} km)\n   Endereço: ${enderecoDisplay}\n   🗺️ Ver no mapa: ${mapsUrl}`;
}

async function handleLocation(from, location) {
    await client.sendMessage(from, 'Ótimo, recebi sua localização! Só um momento enquanto procuro os postos de saúde mais próximos... 🗺️');
    const userLat = parseFloat(location.latitude);
    const userLon = parseFloat(location.longitude);

    try {
        const uf = await reverseGeocode(userLat, userLon);
        if (!uf) {
            await client.sendMessage(from, 'Desculpe, não consegui identificar o estado em que você está. Tente enviar a localização novamente.');
            delete userSessions[from];
            return;
        }

        const todosPostos = await getPostosData(uf);
        if (!todosPostos || todosPostos.length === 0) {
            await client.sendMessage(from, `Não encontrei dados de postos de saúde para o estado de ${uf.toUpperCase()}.`);
            delete userSessions[from];
            return;
        }

        const postosComDistancia = todosPostos
            // >>>>> MUDANÇA: Usando os nomes de campo da nova API (vlrLatitude, vlrLongitude) <<<<<
            .filter(p => p.vlrLatitude && p.vlrLongitude)
            .map(posto => {
                const postoLat = parseFloat(posto.vlrLatitude);
                const postoLon = parseFloat(posto.vlrLongitude);
                const distancia = calculateDistance(userLat, userLon, postoLat, postoLon);
                return { ...posto, distancia };
            });

        postosComDistancia.sort((a, b) => a.distancia - b.distancia);
        const postosProximos = postosComDistancia.slice(0, 5);

        if (postosProximos.length > 0) {
            let botResponse = 'Aqui estão os 5 postos de saúde mais próximos de você:\n\n';
            botResponse += postosProximos.map(p => formatarPosto(p, p.distancia)).join('\n\n');
            botResponse += '\n\nObrigado por utilizar nosso sistema! Se cuida na estrada!';
            await client.sendMessage(from, botResponse);
        } else {
            await client.sendMessage(from, 'Não encontrei postos de saúde com geolocalização próximos a você neste estado.');
        }

    } catch (error) {
        console.error("Erro ao processar localização:", error);
        await client.sendMessage(from, 'Ocorreu um erro técnico ao processar sua localização. Tente novamente mais tarde.');
    } finally {
        delete userSessions[from];
    }
}

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
            botResponse = `Obrigado pelas informações! Para encontrar o posto de saúde mais próximo, por favor, me envie sua localização atual.\n\nVocê pode fazer isso clicando no *clipe de anexo (📎)* aqui no WhatsApp, depois em *'Localização'* e em seguida em *'Localização atual'*.`;
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
