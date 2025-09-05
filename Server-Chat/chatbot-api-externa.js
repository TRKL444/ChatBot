// --- IMPORTAÇÕES NECESSÁRIAS ---
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// --- CONFIGURAÇÕES ---
const API_URL = 'https://apidadosabertos.saude.gov.br/assistencia-a-saude/hospitais-e-leitos?uf=ro';

// BASE DE CONHECIMENTO DE VIZINHANÇA DE PORTO VELHO
// Esta é a nossa "inteligência" de proximidade. Podemos adicionar mais bairros aqui.
// As chaves e valores devem estar em minúsculo e sem acentos para facilitar a busca.
const bairrosVizinhos = {
    'aponia': ['igarapé', 'pedrinhas', 'lagoinha'],
    'centro': ['caiari', 'olaria', 'arigolandia', 'panair'],
    'pedrinhas': ['aponia', 'costa e silva', 'eldorado'],
    'costa e silva': ['pedrinhas', 'eldorado', 'novo horizonte'],
    'caiari': ['centro', 'olaria'],
    'olaria': ['centro', 'caiari']
};

// --- SESSÕES DE CONVERSA ---
const userSessions = {};

// --- INICIALIZAÇÃO DO CLIENTE DO WHATSAPP ---
console.log('Iniciando o cliente do WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth()
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
});

client.on('message', async (message) => {
    if (!message.from.endsWith('@c.us')) return;
    const from = message.from;
    const userInput = message.body;
    console.log(`Mensagem recebida de ${from}: "${userInput}"`);
    await handleConversation(from, userInput);
});

// --- FUNÇÃO AUXILIAR PARA FORMATAR A RESPOSTA ---
function formatarPosto(posto) {
    const nome = posto.nomeFantasia || 'Nome não informado';
    const rua = posto.logradouro || 'Endereço não informado';
    const numero = posto.numero || 'S/N';
    const bairro = posto.bairro || '';
    const cidade = posto.municipio || 'PORTO VELHO';

    // Cria a query para o Google Maps e codifica para formato de URL
    const query = `${nome}, ${rua}, ${numero}, ${bairro}, ${cidade}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    return `📍 *${nome}*\n   Endereço: ${rua}, ${numero}\n   🗺️ Ver no mapa: ${mapsUrl}`;
}

// --- LÓGICA PRINCIPAL DO CHATBOT ---
async function handleConversation(from, userInput) {
    if (!userSessions[from]) {
        const startKeywords = ['oi', 'ola', 'olá', 'começar', 'iniciar', 'ajuda'];
        if (startKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
            userSessions[from] = { step: 'START', data: {} };
        } else {
            return;
        }
    }

    const session = userSessions[from];
    let botResponse = '';

    switch (session.step) {
        case 'START':
            botResponse = 'Olá! Bem-vindo ao Atendimento de Saúde de Porto Velho. Para começar, qual é o seu nome?';
            session.step = 'GET_NAME';
            break;

        case 'GET_NAME':
            session.data.nome = userInput;
            botResponse = `Prazer, ${userInput.split(' ')[0]}! Para te direcionar, em qual bairro você está?`;
            session.step = 'GET_BAIRRO';
            break;

        case 'GET_BAIRRO':
            const bairroUsuario = userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normaliza o input
            session.data.bairro = bairroUsuario;
            
            try {
                console.log('Buscando dados na API do Governo...');
                const response = await axios.get(API_URL);
                const todosHospitaisRO = response.data.hospitais_leitos;

                console.log(`Recebidos ${todosHospitaisRO.length} registros de Rondônia.`);

                // Filtra apenas por Porto Velho para otimizar
                const postosEmPVH = todosHospitaisRO.filter(p => p.municipio && p.municipio.toLowerCase() === 'porto velho');

                // 1. Busca no bairro exato
                const postosNoBairro = postosEmPVH.filter(p => p.bairro && p.bairro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bairroUsuario);
                
                // 2. Busca nos bairros vizinhos
                const vizinhos = bairrosVizinhos[bairroUsuario] || [];
                const postosVizinhos = postosEmPVH.filter(p => p.bairro && vizinhos.includes(p.bairro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

                let finalResponse = '';

                if (postosNoBairro.length > 0) {
                    finalResponse += `Encontrei este(s) no seu bairro (*${userInput}*):\n\n`;
                    finalResponse += postosNoBairro.map(formatarPosto).join('\n\n');
                }

                if (postosVizinhos.length > 0) {
                    finalResponse += `\n\nE também encontrei este(s) em bairros próximos:\n\n`;
                    finalResponse += postosVizinhos.map(formatarPosto).join('\n\n');
                }

                if (finalResponse) {
                    botResponse = finalResponse + '\n\nObrigado por utilizar nosso sistema!';
                } else {
                    botResponse = `Desculpe, não encontrei um estabelecimento de saúde no bairro "${userInput}" ou em suas proximidades nos dados do governo. Por favor, verifique se o nome do bairro está correto.`;
                }

            } catch (error) {
                console.error("Erro ao conectar na API externa:", error.message);
                botResponse = 'Desculpe, estou com um problema técnico para consultar os dados do governo. Tente novamente em alguns instantes.';
            }
            delete userSessions[from]; // Reinicia a conversa
            break;
    }

    if (botResponse) {
        await client.sendMessage(from, botResponse);
        console.log(`Resposta enviada para ${from}.`);
    }
}

// --- INICIA O CLIENTE ---
client.initialize();
