// --- IMPORTAÇÕES NECESSÁRIAS ---
// Axios é uma biblioteca popular para fazer requisições HTTP (para "conversar" com a API).
const axios = require('axios');

// URL onde a nossa API está rodando.
const API_URL = 'http://localhost:3000';

/**
 * Função que busca postos de saúde na API com base em um bairro.
 * @param {string} bairro - O bairro do usuário para a busca.
 * @returns {Promise<Array>} Uma promessa que resolve para uma lista de postos encontrados.
 */
async function encontrarPostoDeSaude(bairro) {
    console.log(`\n🤖 Bot: Buscando postos de saúde no bairro "${bairro}"...`);
    try {
        // Faz a chamada GET para a API, passando o bairro como parâmetro.
        const response = await axios.get(`${API_URL}/postos-saude`, {
            params: {
                bairro: bairro
            }
        });

        // Retorna os dados (a lista de postos) da resposta.
        return response.data;

    } catch (error) {
        console.error('❌ Erro ao se conectar com a API:', error.message);
        console.error('🤖 Bot: Parece que o serviço está fora do ar. Tente novamente mais tarde.');
        return []; // Retorna uma lista vazia em caso de erro.
    }
}

/**
 * Simula a lógica principal do chatbot.
 */
async function simularConversa() {
    console.log("--- Simulação de Atendimento Iniciada ---");

    // 1. Simula a coleta de dados do usuário.
    const dadosUsuario = {
        nome: 'Maria Souza',
        idade: 34,
        cidade: 'Porto Velho',
        telefone: '(69) 99999-8888',
        bairro: 'Centro' // <--- Altere aqui para testar outros bairros!
    };

    console.log('👤 Usuário Informou os seguintes dados:', dadosUsuario);

    // 2. Chama a função para buscar o posto com base no bairro do usuário.
    const postosEncontrados = await encontrarPostoDeSaude(dadosUsuario.bairro);

    // 3. Processa o resultado e dá a resposta final para o usuário.
    if (postosEncontrados && postosEncontrados.length > 0) {
        console.log(`\n🤖 Bot: Olá, ${dadosUsuario.nome}! Encontrei ${postosEncontrados.length} posto(s) para você no bairro ${dadosUsuario.bairro}:`);
        
        // Mostra os detalhes de cada posto encontrado.
        postosEncontrados.forEach(posto => {
            console.log(`\n  📍 Nome: ${posto.nome}`);
            console.log(`     Endereço: ${posto.endereco}`);
        });

        console.log('\n🤖 Bot: Por favor, dirija-se ao local mais conveniente. Seu atendimento será agilizado.');

    } else {
        console.log(`\n🤖 Bot: Olá, ${dadosUsuario.nome}. Infelizmente, não encontrei um posto de atendimento diretamente no seu bairro (${dadosUsuario.bairro}).`);
        console.log('🤖 Bot: Recomendo procurar a unidade de saúde mais próxima ou entrar em contato com a central da prefeitura.');
    }
    
    console.log("\n--- Simulação de Atendimento Finalizada ---");
}

// Inicia a simulação.
simularConversa();
