// --- IMPORTAÇÕES NECESSÁRIAS ---
// Express para criar o servidor web.
// Axios para fazer chamadas para a nossa API de postos e para a API do WhatsApp.
// Body-parser para interpretar o corpo das requisições que a Meta nos envia.
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// --- SUAS VARIÁVEIS DE AMBIENTE (NUNCA COLOQUE NO CÓDIGO DIRETAMENTE) ---
// Carregue estas variáveis de um arquivo .env ou das configurações do seu servidor de hospedagem.
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'SEU_TOKEN_DE_ACESSO_DA_META';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'SEU_TOKEN_DE_VERIFICACAO_CUSTOMIZADO'; // Crie qualquer string aqui
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'ID_DO_SEU_NUMERO_DE_TELEFONE';
const API_POSTOS_URL = 'http://localhost:3000/postos-saude'; // Mude para a URL pública quando hospedar a API

// --- "BANCO DE DADOS" SIMULADO PARA MANTER O ESTADO DA CONVERSA ---
// Em um projeto real, use um banco de dados como Redis ou Firestore para isso.
// A chave é o número de telefone do usuário (ex: '5569999998888').
const userSessions = {};

// --- ROTA DE VERIFICAÇÃO DO WEBHOOK (PASSO 1 DA CONFIGURAÇÃO) ---
// O WhatsApp envia uma requisição GET para esta rota para confirmar que seu servidor está funcionando.
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado com sucesso!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// --- ROTA PRINCIPAL PARA RECEBER MENSAGENS DO WHATSAPP ---
app.post('/webhook', (req, res) => {
    const body = req.body;

    // Verifica se é uma notificação do WhatsApp
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry[0];
        const change = entry.changes[0];
        
        if (change.value && change.value.messages && change.value.messages[0]) {
            const message = change.value.messages[0];
            const from = message.from; // Número do usuário
            const msg_body = message.text.body; // Texto da mensagem

            console.log(`Mensagem recebida de ${from}: "${msg_body}"`);
            
            // Processa a mensagem recebida
            handleConversation(from, msg_body);
        }
    }
    // Retorna 200 OK para a Meta saber que recebemos a notificação.
    res.sendStatus(200);
});

// --- FUNÇÃO PARA ENVIAR MENSAGENS DE VOLTA PARA O USUÁRIO ---
async function sendMessage(to, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log(`Resposta enviada para ${to}: "${text}"`);
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.response ? error.response.data : error.message);
    }
}

// --- LÓGICA PRINCIPAL DO CHATBOT ---
async function handleConversation(from, userInput) {
    // Garante que o usuário tenha uma sessão iniciada.
    if (!userSessions[from]) {
        userSessions[from] = { step: 'START', data: {} };
    }

    const session = userSessions[from];
    let botResponse = '';

    switch (session.step) {
        case 'START':
            botResponse = 'Olá! Bem-vindo ao Atendimento de Saúde de Porto Velho. Para começar, qual é o seu nome completo?';
            session.step = 'GET_NAME';
            await sendMessage(from, botResponse);
            break;

        case 'GET_NAME':
            session.data.nome = userInput;
            botResponse = `Prazer, ${userInput.split(' ')[0]}! Para te direcionar ao posto mais próximo, em qual bairro você está?`;
            session.step = 'GET_BAIRRO';
            await sendMessage(from, botResponse);
            break;

        case 'GET_BAIRRO':
            session.data.bairro = userInput;
            
            // Chama nossa API de postos de saúde
            try {
                const response = await axios.get(API_POSTOS_URL, { params: { bairro: userInput } });
                const postos = response.data;

                if (postos && postos.length > 0) {
                    let postosText = `Encontrei ${postos.length} posto(s) para você no bairro ${userInput}:\n`;
                    postos.forEach(p => {
                        postosText += `\n📍 *${p.nome}*\n   Endereço: ${p.endereco}`;
                    });
                    botResponse = postosText + '\n\nPor favor, dirija-se ao local mais conveniente. Seu atendimento será agilizado.';
                } else {
                    botResponse = `Não encontrei um posto de atendimento no bairro "${userInput}". Recomendo procurar a unidade de saúde mais próxima ou entrar em contato com a central da prefeitura.`;
                }

            } catch (error) {
                console.error("Erro ao buscar postos:", error.message);
                botResponse = 'Desculpe, estou com um problema para acessar a lista de postos de saúde no momento. Tente novamente mais tarde.';
            }
            
            await sendMessage(from, botResponse);
            // Reinicia a conversa
            delete userSessions[from];
            break;
    }
}


// --- ROTA PADRÃO E INICIALIZAÇÃO DO SERVIDOR ---
app.get('/', (req, res) => {
    res.send('Servidor do Chatbot para WhatsApp está no ar!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor Webhook está escutando na porta ${PORT}`);
    console.log('Certifique-se de configurar as variáveis de ambiente: WHATSAPP_TOKEN, VERIFY_TOKEN, PHONE_NUMBER_ID');
});
// E que o webhook está configurado corretamente na Meta para apontar para este servidor.   
