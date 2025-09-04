// --- MÓDULO PARA LER ENTRADA DO TERMINAL ---
// Importa o módulo 'readline' nativo do Node.js
const readline = require('readline');

// Configura a interface para ler do terminal (process.stdin) e escrever no terminal (process.stdout)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- ESTADO INICIAL DA AaPLICAÇÃO ---
let conversationStep = 'START';
const userData = {
    nome: '',
    cidade: '',
    bairro: '',
    telefone: '',
    idade: ''
};

// --- BANCO DE DADOS SIMULADO DE POSTOS DE ATENDIMENTO ---
const postosDeAtendimento = {
    'sao paulo': 'Posto Central SP - Av. Paulista, 1234. Tel: (11) 9999-0001',
    'rio de janeiro': 'Posto Copacabana RJ - Av. Atlântica, 5678. Tel: (21) 9999-0002',
    'belo horizonte': 'Posto Savassi BH - Rua Fernandes Tourinho, 90. Tel: (31) 9999-0003',
    'porto velho': {
        'caiari': 'Posto Caiari PVH - Av. Carlos Gomes, 100. Tel: (69) 9999-0004',
        'centro': 'Posto Central PVH - Av. Sete de Setembro, 500. Tel: (69) 9999-0005',
        'areal': 'Posto Areal PVH - Rua Jaci Paraná, 2000. Tel: (69) 9999-0006',
        'olaria': 'Posto Olaria PVH - Av. Pinheiro Machado, 800. Tel: (69) 9999-0007',
        'default': 'Central de Atendimento PVH - Não encontramos um posto no seu bairro. Contato geral: (69) 3222-1234'
    }
};

// --- LÓGICA DA CONVERSA (Idêntica à anterior) ---

function handleConversation(userInput = '') {
    let botResponse = '';
    switch (conversationStep) {
        case 'START':
            botResponse = 'Olá! Bem-vindo ao nosso Atendimento Rápido. Para começar, qual é o seu nome completo?';
            conversationStep = 'GET_NAME';
            break;
        case 'GET_NAME':
            if (!userInput.trim()) {
                botResponse = 'Por favor, digite um nome válido.';
            } else {
                userData.nome = userInput.trim();
                botResponse = `Prazer, ${userData.nome.split(' ')[0]}! Agora, por favor, me informe sua cidade.`;
                conversationStep = 'GET_CITY';
            }
            break;
        case 'GET_CITY':
            if (!userInput.trim()) {
                botResponse = 'Por favor, digite uma cidade válida.';
            } else {
                userData.cidade = userInput.toLowerCase().trim();
                if (postosDeAtendimento[userData.cidade] && typeof postosDeAtendimento[userData.cidade] === 'object') {
                    botResponse = 'Certo! E para te direcionar melhor, em qual bairro você está?';
                    conversationStep = 'GET_BAIRRO';
                } else {
                    botResponse = 'Entendido. Qual o seu número de telefone com DDD?';
                    conversationStep = 'GET_PHONE';
                }
            }
            break;
        case 'GET_BAIRRO':
             if (!userInput.trim()) {
                botResponse = 'Por favor, digite um bairro válido.';
            } else {
                userData.bairro = userInput.toLowerCase().trim();
                botResponse = 'Entendido. Qual o seu número de telefone com DDD?';
                conversationStep = 'GET_PHONE';
            }
            break;
        case 'GET_PHONE':
            if (!/^[0-9()-\s]+$/.test(userInput.trim()) || userInput.length < 10) {
                botResponse = 'Parece que este não é um telefone válido. Por favor, tente novamente com o DDD.';
            } else {
                userData.telefone = userInput.trim();
                botResponse = 'Obrigado. Para finalizar, qual a sua idade?';
                conversationStep = 'GET_AGE';
            }
            break;
        case 'GET_AGE':
            if (!/^\d+$/.test(userInput.trim()) || parseInt(userInput) < 1 || parseInt(userInput) > 120) {
                botResponse = 'Por favor, insira uma idade válida.';
            } else {
                userData.idade = userInput.trim();
                botResponse = 'Excelente! Estou processando suas informações...';
                const postoInfo = findServicePoint();
                botResponse += `\n\n${postoInfo}`;
                botResponse += '\n\nObrigado por utilizar nosso sistema! 😊';
                conversationStep = 'FINISHED';
            }
            break;
        case 'FINISHED':
            botResponse = 'Seu atendimento por este canal foi finalizado. Se precisar de algo mais, você pode reiniciar o processo.';
            break;
        default:
            botResponse = 'Ocorreu um erro. Por favor, reinicie o atendimento.';
            conversationStep = 'START';
            break;
    }
    return botResponse;
}

function findServicePoint() {
    const cityData = postosDeAtendimento[userData.cidade];
    let posto;
    if (typeof cityData === 'object') {
        posto = cityData[userData.bairro] || cityData['default'];
    } else {
        posto = cityData;
    }
    if (posto) {
        return `Encontrei! O melhor local para você é:\n📍 ${posto}\nEles já foram notificados e estão aguardando seu contato.`;
    } else {
        return `Não encontrei um posto de atendimento em "${userData.cidade}".\nVocê será direcionado para nossa central de atendimento geral no número: (11) 4002-8922.`;
    }
}

// --- FUNÇÃO PARA CONTROLAR O CHAT INTERATIVO ---

function startChat() {
    // Pega a primeira mensagem do bot
    const initialBotMessage = handleConversation();
    
    // Faz a primeira pergunta
    rl.question(`Bot: ${initialBotMessage}\nVocê: `, (userInput) => {
        processUserInput(userInput);
    });
}

function processUserInput(userInput) {
    // Processa a resposta do usuário e obtém a próxima mensagem do bot
    const botResponse = handleConversation(userInput);

    // Se a conversa acabou, mostra a mensagem final e encerra.
    if (conversationStep === 'FINISHED') {
        console.log(`Bot: ${botResponse}`);
        console.log("\n--- Dados Finais Coletados ---");
        console.log(userData);
        rl.close(); // Fecha a interface de leitura
        return;
    }

    // Se a conversa não acabou, faz a próxima pergunta.
    rl.question(`Bot: ${botResponse}\nVocê: `, (newInput) => {
        processUserInput(newInput); // Chama a si mesma para continuar o loop
    });
}


// --- INICIA A APLICAÇÃO ---
console.log("--- Atendimento via Terminal Iniciado (digite Ctrl+C para sair) ---");
startChat();
