const URL_API = 'http://127.0.0.1:3001';

// Verifica a conexão com o servidor backend ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resposta = await fetch(`${URL_API}/livro/listar`);
        if (resposta.ok) {
            console.log('Servidor backend conectado com sucesso!');
        }
    } catch (erro) {
        console.warn('Aviso: Não foi possível conectar ao servidor backend em ' + URL_API);
    }
});