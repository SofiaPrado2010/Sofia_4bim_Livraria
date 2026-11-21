const URL_API = 'http://127.0.0.1:3001';

const itensCarrinho = JSON.parse(sessionStorage.getItem('itensCarrinho')) || [];

const listaLivros = document.getElementById('listaLivros');
const valorTotal = document.getElementById('valorTotal');
const mensagem = document.getElementById('mensagem');
const btFinalizar = document.getElementById('btFinalizar');
const btVoltar = document.getElementById('btVoltar');

let total = 0;

// Carregar resumo dos livros
function carregarResumo() {

    listaLivros.innerHTML = '';
    total = 0;

    if (itensCarrinho.length === 0) {

        listaLivros.textContent = 'Seu carrinho está vazio.';
        valorTotal.textContent = 'R$ 0,00';

        btFinalizar.disabled = true;

        mensagem.textContent =
            'Adicione livros ao carrinho antes de finalizar a compra.';

        return;
    }

    itensCarrinho.forEach(item => {

        const preco = Number(item.preco_unitario);
        const subtotal = preco * Number(item.quantidade);

        total += subtotal;

        const div = document.createElement('div');
        div.classList.add('item-resumo');

        const nome = document.createElement('p');
        nome.textContent = item.nome_livro;

        const quantidade = document.createElement('p');
        quantidade.textContent = `Quantidade: ${item.quantidade}`;

        const precoUnitario = document.createElement('p');
        precoUnitario.textContent =
            `Preço unitário: R$ ${preco.toFixed(2).replace('.', ',')}`;

        const sub = document.createElement('p');
        sub.textContent =
            `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`;

        div.append(nome, quantidade, precoUnitario, sub);

        listaLivros.appendChild(div);
    });

    valorTotal.textContent =
        `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Carregar endereço do cliente
async function carregarEndereco() {

    try {

        const resposta = await fetch(`${URL_API}/pessoa/minhasInformacoes`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (resposta.ok) {

            document.getElementById('endereco').value =
                dados.pessoa.endereco_pessoa || '';

            document.getElementById('cidade').value =
                dados.pessoa.cidade_pessoa || '';

            document.getElementById('estado').value =
                dados.pessoa.estado_pessoa || '';

        } else {

            mensagem.textContent = dados.mensagem;
            mensagem.style.color = 'red';
        }

    } catch (error) {

        console.error('Erro ao carregar endereço:', error);

        mensagem.textContent =
            'Não foi possível carregar seu endereço.';

        mensagem.style.color = 'red';
    }
}

// Voltar para a página inicial
btVoltar.onclick = function () {
    window.location.href = '../index.html';
};

// Atualizar o valor restante dos pagamentos
function iniciarFormasPagamento() {

    const formasPagamento = document.getElementById('formasPagamento');
    const btAdicionarForma = document.getElementById('btAdicionarForma');
    const valorRestante = document.getElementById('valorRestante');

    function atualizarValorRestante() {

        let valorPago = 0;

        const valores = document.querySelectorAll('.valorPagamento');

        valores.forEach(campo => {
            valorPago += Number(campo.value) || 0;
        });

        const restante = total - valorPago;

        valorRestante.textContent =
            `R$ ${restante.toFixed(2).replace('.', ',')}`;
    }

    // Configurar os campos de cada forma de pagamento
    function configurarCampos(item) {

        const select = item.querySelector('.formaPagamento');
        const valor = item.querySelector('.valorPagamento');
        const detalhes = item.querySelector('.detalhesForma');

        select.onchange = function () {

            detalhes.innerHTML = '';

            // Pagamento via PIX
            if (select.value === 'PIX') {

                detalhes.innerHTML = `
                    <h4>Pagamento via PIX</h4>

                    <p>QR Code demonstrativo:</p>

                    <img class="imagemPix" alt="QR Code demonstrativo">

                    <p>Código:</p>

                    <input type="text" class="codigoPix" readonly>

                    <button type="button" class="btCopiarPix">
                        Copiar código PIX
                    </button>
                `;

                const codigo = 'PIX-ENTRE-PAGINAS';

                detalhes.querySelector('.codigoPix').value = codigo;

                detalhes.querySelector('.imagemPix').src =
                    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codigo)}`;

                detalhes.querySelector('.btCopiarPix').onclick = async function () {

                    try {

                        await navigator.clipboard.writeText(codigo);

                        alert('Código demonstrativo copiado!');

                    } catch (error) {

                        alert('Não foi possível copiar o código.');
                    }
                };
            }

            // Pagamento com cartão
            if (
                select.value === 'CREDITO' ||
                select.value === 'DEBITO'
            ) {

                detalhes.innerHTML = `
                    <h4>Dados demonstrativos do cartão</h4>

                    <div class="campo">
                        <label>Nome do titular</label>
                        <input type="text" class="nomeCartao">
                    </div>

                    <div class="campo">
                        <label>Número</label>
                        <input type="text" class="numeroCartao" maxlength="19">
                    </div>

                    <div class="campo">
                        <label>Validade</label>
                        <input type="text" class="validadeCartao" placeholder="MM/AA" maxlength="5" inputmode="numeric">
                    </div>

                    <div class="campo">
                        <label>Código de segurança</label>
                        <input type="text" class="cvvCartao" maxlength="3">
                    </div>
                `;

                const validade = detalhes.querySelector('.validadeCartao');

                validade.oninput = function () {

                    let valor = validade.value.replace(/\D/g, '');

                    if (valor.length > 4) {
                        valor = valor.slice(0, 4);
                    }

                    if (valor.length > 2) {
                        valor = valor.slice(0, 2) + '/' + valor.slice(2);
                    }

                    validade.value = valor;
                };
            }

            atualizarValorRestante();
        };

        valor.oninput = atualizarValorRestante;
    }

    // Configurar a primeira forma de pagamento
    const primeiroItem = formasPagamento.querySelector('.pagamento-item');

    configurarCampos(primeiroItem);

    // Adicionar outra forma de pagamento
    btAdicionarForma.onclick = function () {

        const novoItem = document.createElement('div');
        novoItem.classList.add('pagamento-item');

        novoItem.innerHTML = `
            <div class="campo">
                <label>Forma de pagamento</label>

                <select class="formaPagamento">
                    <option value="">Escolha uma opção</option>
                    <option value="PIX">PIX</option>
                    <option value="CREDITO">Cartão de crédito</option>
                    <option value="DEBITO">Cartão de débito</option>
                </select>
            </div>

            <div class="campo">
                <label>Valor a pagar</label>

                <input type="number"
                    class="valorPagamento"
                    placeholder="Digite o valor"
                    min="0.01"
                    step="0.01">
            </div>

            <div class="detalhesForma"></div>

            <button type="button" class="btRemoverForma">
                Remover forma
            </button>
        `;

        formasPagamento.appendChild(novoItem);

        configurarCampos(novoItem);

        // Remover uma forma de pagamento
        novoItem.querySelector('.btRemoverForma').onclick = function () {

            novoItem.remove();

            atualizarValorRestante();
        };
    };

    atualizarValorRestante();
}

// Obter ou criar a chave da tentativa de compra
function obterChaveIdempotencia() {

    let chave = sessionStorage.getItem('chavePedido');

    if (!chave) {

        chave = crypto.randomUUID();

        sessionStorage.setItem('chavePedido', chave);
    }

    return chave;
}

// Finalizar compra
async function finalizarCompra() {

    const endereco = document.getElementById('endereco').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim();

    const pagamentos = [];
    const formasEscolhidas = [];

    const itensPagamento =
        document.querySelectorAll('.pagamento-item');

    if (!endereco || !cidade || !estado) {

        mensagem.textContent = 'Preencha todos os dados de entrega.';
        mensagem.style.color = 'red';

        return;
    }

    let valorPago = 0;

    // Verificar cada pagamento escolhido
    for (const item of itensPagamento) {

        const forma = item.querySelector('.formaPagamento').value;

        const valor =
            Number(item.querySelector('.valorPagamento').value);

        if (!forma || !Number.isFinite(valor) || valor <= 0) {

            mensagem.textContent =
                'Preencha todas as formas e seus valores.';

            mensagem.style.color = 'red';

            return;
        }

        // Não permitir repetir a mesma forma
        if (formasEscolhidas.includes(forma)) {

            mensagem.textContent =
                'Não repita a mesma forma de pagamento.';

            mensagem.style.color = 'red';

            return;
        }

        formasEscolhidas.push(forma);

        // Verificar os dados demonstrativos do cartão
        if (forma === 'CREDITO' || forma === 'DEBITO') {

            const nome =
                item.querySelector('.nomeCartao')?.value.trim() || '';

            const numero =
                item.querySelector('.numeroCartao')?.value.trim() || '';

            const validade =
                item.querySelector('.validadeCartao')?.value.trim() || '';

            const cvv =
                item.querySelector('.cvvCartao')?.value.trim() || '';

            if (!nome || !numero || !validade || !cvv) {

                mensagem.textContent =
                    'Preencha os dados demonstrativos do cartão.';

                mensagem.style.color = 'red';

                return;
            }

            const partesValidade = validade.split('/');

            const mes = Number(partesValidade[0]);
            const ano = Number(partesValidade[1]);

            const dataAtual = new Date();

            const anoAtual = dataAtual.getFullYear() % 100;
            const mesAtual = dataAtual.getMonth() + 1;

            if (
                partesValidade.length !== 2 ||
                partesValidade[0].length !== 2 ||
                partesValidade[1].length !== 2 ||
                mes < 1 || mes > 12 ||
                ano < anoAtual ||
                (ano === anoAtual && mes < mesAtual)
            ) {

                mensagem.textContent =
                    'Informe uma validade válida e futura para o cartão.';

                mensagem.style.color = 'red';

                return;
            }
        }

        valorPago += Math.round(valor * 100);

        pagamentos.push({
            formaPagamento: forma,
            valor: valor
        });
    }

    // Conferir se os pagamentos correspondem ao total
    if (Math.round(total * 100) !== valorPago) {

        mensagem.textContent =
            'A soma dos pagamentos precisa ser igual ao total da compra.';

        mensagem.style.color = 'red';

        return;
    }

    if (itensCarrinho.length === 0) {

        mensagem.textContent = 'Seu carrinho está vazio.';
        mensagem.style.color = 'red';

        return;
    }

    try {

        btFinalizar.disabled = true;

        mensagem.textContent = 'Registrando seu pedido...';
        mensagem.style.color = '#80665e';

        // Manter a mesma chave quando houver uma tentativa repetida
        const chaveIdempotencia = obterChaveIdempotencia();

        const resposta = await fetch(`${URL_API}/pedido`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({
                itens: itensCarrinho,
                endereco: endereco,
                cidade: cidade,
                estado: estado,
                pagamentos: pagamentos,
                chaveIdempotencia: chaveIdempotencia
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            // Uma chave utilizada com outros dados não pode ser reutilizada
            if (resposta.status === 409) {
                sessionStorage.removeItem('chavePedido');
            }

            throw new Error(
                dados.mensagem || 'Erro ao realizar a compra.'
            );
        }

        mensagem.style.color = 'green';

        if (dados.repetido) {

            mensagem.textContent =
                `Este pedido já havia sido registrado! Pedido nº ${dados.idPedido}.`;

        } else {

            mensagem.textContent =
                `Compra simulada realizada com sucesso! Pedido nº ${dados.idPedido}.`;
        }

        sessionStorage.removeItem('itensCarrinho');
        sessionStorage.removeItem('chavePedido');

        btFinalizar.disabled = true;

    } catch (error) {

        console.error('Erro ao finalizar compra:', error);

        mensagem.textContent = error.message;
        mensagem.style.color = 'red';

        btFinalizar.disabled = false;
    }
}

// Iniciar as funções da página
carregarResumo();
carregarEndereco();
iniciarFormasPagamento();

btFinalizar.onclick = finalizarCompra;