Chatbot de Atendimento - Postos de Saúde (Porto Velho)
📖 Visão Geral
Este projeto é um protótipo funcional de um chatbot para WhatsApp, desenvolvido como um trabalho acadêmico. O objetivo principal do bot é realizar um atendimento inicial automatizado, coletando informações básicas do usuário (nome e bairro) para, em seguida, direcioná-lo ao posto de saúde mais próximo em Porto Velho, RO.

A solução é dividida em dois componentes principais:

Uma API REST local que serve como um banco de dados simulado, contendo a lista de postos de saúde e seus respectivos bairros.

Um serviço de chatbot que se conecta ao WhatsApp através da biblioteca whatsapp-web.js para interagir com os usuários em tempo real.

✨ Funcionalidades Principais
Atendimento Automatizado: Inicia a conversa e guia o usuário através de um fluxo pré-definido.

Coleta de Dados: Solicita e armazena temporariamente o nome e o bairro do usuário.

Integração com API: Consulta a API local para buscar postos de saúde com base no bairro informado.

Direcionamento Inteligente: Retorna ao usuário o nome e o endereço do(s) posto(s) de saúde encontrado(s).

Autenticação Simples: Utiliza um QR Code para conectar uma sessão do WhatsApp Web, facilitando a prototipagem.

Manutenção de Sessão: Salva o login localmente para não exigir a leitura do QR Code a cada reinicialização.

🛠️ Tecnologias Utilizadas
Backend: Node.js

API Server: Express.js

Cliente WhatsApp (Não Oficial): whatsapp-web.js

Cliente HTTP (para consumir a API): axios

Exibição de QR Code no Terminal: qrcode-terminal

Gerenciador de Pacotes: npm

🚀 Como Executar o Projeto
Siga os passos abaixo para rodar o projeto em sua máquina local.

Pré-requisitos
Node.js: Versão 16 ou superior. (Você pode verificar com node -v).

npm: Geralmente instalado junto com o Node.js. (Você pode verificar com npm -v).

Um número de WhatsApp para conectar e testar o bot.

Passo a Passo
Clone ou Baixe os Arquivos

Certifique-se de que os arquivos api-postos-saude.js e chatbot-nao-oficial.js estejam na mesma pasta.

Abra o Terminal

Navegue até a pasta do projeto usando o comando cd.

cd caminho/para/a/pasta/do-projeto

Instale as Dependências

Execute o comando abaixo para instalar todas as bibliotecas necessárias listadas no package.json (se não tiver um, este comando irá criá-lo e adicionar as dependências).

npm init -y
npm install express axios whatsapp-web.js qrcode-terminal

Inicie a API de Postos de Saúde

Em um terminal, inicie o servidor da API. Este terminal precisa permanecer aberto.

node api-postos-saude.js

Você deverá ver a mensagem: API de Postos de Saúde rodando em http://localhost:3000

Inicie o Chatbot

Abra um segundo terminal (mantenha o primeiro rodando!). Na mesma pasta do projeto, execute o serviço do chatbot.

node chatbot-nao-oficial.js

Escaneie o QR Code

O terminal exibirá um QR Code. Abra o WhatsApp no seu celular, vá em Configurações > Aparelhos Conectados > Conectar um Aparelho e escaneie o código.

Teste!

Após a mensagem ✅ Cliente do WhatsApp conectado e pronto para uso! aparecer no terminal, envie uma mensagem como "Olá" do seu número pessoal para o número que você conectou. A conversa deverá começar!

🔧 Como Customizar
Adicionar ou Editar Postos de Saúde
Para alterar a lista de postos de saúde, basta editar o array postosDeSaude dentro do arquivo api-postos-saude.js. O formato de cada objeto deve ser mantido:

const postosDeSaude = [
    { id: 1, nome: 'UBS Aponiã', endereco: 'R. Andréia, 4851', bairro: 'aponiã' },
    { id: 2, nome: 'UBS Agenor de Carvalho', endereco: 'R. Anari, 2220', bairro: 'agenor de carvalho' },
    // Adicione novos postos aqui
];

Importante: O bairro deve estar sempre em letras minúsculas para garantir que a busca funcione corretamente.

📈 Possíveis Melhorias (Próximos Passos)
Substituir o array de postos por um banco de dados real (como MongoDB, PostgreSQL ou Firebase).

Implementar um tratamento de erros mais robusto (ex: quando o usuário envia uma resposta inesperada).

Adicionar mais etapas à conversa (coletar idade, telefone, etc.).

Migrar para a API Oficial do WhatsApp (Meta) para um ambiente de produção estável.
