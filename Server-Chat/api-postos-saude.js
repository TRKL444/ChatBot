// --- IMPORTAÇÕES NECESSÁRIAS ---
// Express é um framework que facilita a criação de servidores e APIs em Node.js.
const express = require('express');
const app = express();
const PORT = 3000; // A porta em que nossa API vai rodar.

// --- BANCO DE DADOS (SIMULADO) DE POSTOS DE SAÚDE DE PORTO VELHO ---
// A estrutura é: nome, endereço e, mais importante, o bairro em letras minúsculas.
const postosDeSaude = [
    { id: 1, nome: 'UBS Aponiã', endereco: 'R. Andréia, 4851', bairro: 'aponiã' },
    { id: 2, nome: 'UBS Agenor de Carvalho', endereco: 'R. Anari, 2220', bairro: 'agenor de carvalho' },
    { id: 3, nome: 'UBS Hamilton Gondim', endereco: 'R. Veleiros, 3144', bairro: 'socialista' },
    { id: 4, nome: 'UBS Castanheiras', endereco: 'Av. Mamoré, 4000', bairro: 'castanheiras' },
    { id: 5, nome: 'UBS Maurício Bustani', endereco: 'Av. Campos Sales, 2697', bairro: 'centro' },
    { id: 6, nome: 'Policlínica Ana Adelaide', endereco: 'Av. Campos Sales, 1850', bairro: 'centro' },
    { id: 7, nome: 'UBS Ernandes Índio', endereco: 'Av. Amazonas, 5328', bairro: 'escola de polícia' },
    { id: 8, nome: 'UBS Pedacinho de Chão', endereco: 'R. Petrolina, 500', bairro: 'embratel' },
    { id: 9, nome: 'UBS Caladinho', endereco: 'R. Tancredo Neves, 4587', bairro: 'caladinho' },
    { id: 10, nome: 'UBS Nova Floresta', endereco: 'R. João Paulo I, s/n', bairro: 'nova floresta' },
    { id: 11, nome: 'UBS São Sebastião', endereco: 'R. Goiás, 213', bairro: 'são sebastião' },
    { id: 12, nome: 'UBS Mariana', endereco: 'R. Piraíba, s/n', bairro: 'mariana' }
];

// --- ENDPOINTS DA API ---

// Endpoint principal: /postos-saude
// Ele permite filtrar os postos por bairro.
// Exemplo de uso: http://localhost:3000/postos-saude?bairro=centro
app.get('/postos-saude', (req, res) => {
    // Pega o parâmetro 'bairro' da URL.
    const bairroQuery = req.query.bairro;

    // Se um bairro foi informado na URL...
    if (bairroQuery) {
        // Converte para minúsculas para garantir a correspondência.
        const bairroNormalizado = bairroQuery.toLowerCase();
        
        // Filtra a lista, retornando apenas os postos do bairro solicitado.
        const postosFiltrados = postosDeSaude.filter(posto => posto.bairro === bairroNormalizado);
        
        // Retorna a lista filtrada em formato JSON.
        res.json(postosFiltrados);
    } else {
        // Se nenhum bairro foi informado, retorna a lista completa.
        res.json(postosDeSaude);
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
// A API começa a "ouvir" por requisições na porta definida.
app.listen(PORT, () => {
    console.log(`API de Postos de Saúde rodando em http://localhost:${PORT}`);
    console.log('Use Ctrl+C para parar o servidor.');
});
