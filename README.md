🤖 Chatbot de Atendimento – Postos de Saúde (Porto Velho)

📖 Visão Geral

Este projeto é um protótipo funcional de chatbot para WhatsApp, criado para automatizar o atendimento inicial em postos de saúde de Porto Velho, RO.

O bot coleta informações básicas (nome e bairro) e direciona o usuário para o posto de saúde mais próximo.

A solução é composta por dois módulos:

API REST local → funciona como um banco de dados simulado com os postos de saúde e bairros.

Chatbot no WhatsApp → criado com a biblioteca whatsapp-web.js, interagindo em tempo real com os usuários.

✨ Funcionalidades

Atendimento Automatizado: conduz a conversa em um fluxo pré-definido.

Coleta de Dados: solicita nome e bairro do usuário.

Integração com API: consulta os postos de saúde disponíveis para o bairro informado.

Direcionamento Inteligente: retorna nome e endereço do posto encontrado.

Autenticação Simples: conexão via QR Code no WhatsApp Web.

Manutenção de Sessão: armazena login localmente (não precisa escanear o QR Code toda vez).

🛠️ Tecnologias Utilizadas

Backend: Node.js

Servidor da API: Express.js

Cliente WhatsApp: whatsapp-web.js (não oficial)

Cliente HTTP: axios

Exibição de QR Code: qrcode-terminal

Gerenciamento de pacotes: npm

🚀 Como Executar o Projeto
🔑 Pré-requisitos

Node.js (versão 16 ou superior) → node -v

npm (vem junto com o Node.js) → npm -v

Um número de WhatsApp para conectar e testar.

📌 Passo a Passo

Clone ou baixe o projeto
Certifique-se de que os arquivos api-postos-saude.js e chatbot-nao-oficial.js estejam na mesma pasta.

Abra o terminal e vá até a pasta

cd caminho/para/a/pasta-do-projeto


Instale as dependências

npm init -y
npm install express axios whatsapp-web.js qrcode-terminal


Inicie a API de Postos de Saúde

node api-postos-saude.js


Saída esperada:

API de Postos de Saúde rodando em http://localhost:3000


Inicie o Chatbot (em outro terminal, mantendo o anterior aberto)

node chatbot-nao-oficial.js


Escaneie o QR Code exibido no terminal:

Abra o WhatsApp no celular

Vá em Configurações > Aparelhos Conectados > Conectar um Aparelho

Escaneie o QR Code

Teste!
Após a mensagem ✅ Cliente do WhatsApp conectado e pronto para uso!
→ Envie “Olá” do seu WhatsApp pessoal para o número conectado.
