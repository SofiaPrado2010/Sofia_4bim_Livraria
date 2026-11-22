const URL_API = 'http://127.0.0.1:3001';

const parametros = new URLSearchParams(window.location.search);
const idPedido = parametros.get('id');

const informacoesPedido = document.getElementById('informacoesPedido');
const listaLivros = document.getElementById('listaLivros');
const valorTotal = document.getElementById('valorTotal');
const totalPedido = document.getElementById('totalPedido');
const totalPago = document.getElementById('totalPago');
const diferenca = document.getElementById('diferenca');

const listaPagamentos = document.getElementById('listaPagamentos');
const contadorFormas = document.getElementById('contadorFormas');

const btAdicionar = document.getElementById('btAdicionar');
const btFinalizar = document.getElementById('btFinalizar');
const btVoltar = document.getElementById('btVoltar');

const mensagem = document.getElementById('mensagem');

let valorPedido = 0;
let pagamentos = [];


// Formatar valores em reais
function formatarMoeda(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


// Exibir mensagem
function exibirMensagem(texto, cor = 'red') {

    mensagem.textContent = texto;
    mensagem.style.color = cor;
}


// Carregar detalhes do pedido
async function carregarPedido() {

    if (!idPedido || !Number.isInteger(Number(idPedido)) || Number(idPedido) <= 0) {

        exibirMensagem('Número do pedido inválido.');

        btFinalizar.disabled = true;
        btAdicionar.disabled = true;

        return;
    }

    try {

        const resposta = await fetch(`${URL_API}/pedido/${idPedido}`, {
            credentials: 'include'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || 'Não foi possível carregar o pedido.');
        }

        if (dados.pedido.status_pedido !== 'Pendente') {
            throw new Error('Este pedido não está disponível para pagamento.');
        }

        if (
            !dados.pedido.prazo_pagamento ||
            new Date(dados.pedido.prazo_pagamento) <= new Date()
        ) {
            throw new Error('O prazo de pagamento deste pedido expirou.');
        }

        valorPedido = Number(dados.pedido.valor_total);

        valorTotal.textContent = formatarMoeda(valorPedido);
        totalPedido.textContent = formatarMoeda(valorPedido);

        informacoesPedido.textContent =
            `Pedido nº ${dados.pedido.id_pedido} | ` +
            `Data: ${new Date(dados.pedido.data_pedido).toLocaleDateString('pt-BR')}`;

        listaLivros.innerHTML = '';

        dados.itens.forEach(item => {

            const subtotal = Number(item.preco_unitario) * Number(item.quantidade);

            const div = document.createElement('div');
            div.classList.add('item-resumo');

            const nome = document.createElement('p');
            nome.textContent = item.nome_livro;

            const quantidade = document.createElement('p');
            quantidade.textContent = `Quantidade: ${item.quantidade}`;

            const preco = document.createElement('p');
            preco.textContent = `Preço unitário: ${formatarMoeda(item.preco_unitario)}`;

            const sub = document.createElement('p');
            sub.textContent = `Subtotal: ${formatarMoeda(subtotal)}`;

            div.append(nome, quantidade, preco, sub);

            listaLivros.appendChild(div);
        });

        adicionarPagamento();

        atualizarResumo();

        // Liberar o botão depois de carregar o pedido
        btFinalizar.disabled = false;

    } catch (error) {

        console.error('Erro ao carregar pedido:', error);

        informacoesPedido.textContent = 'Não foi possível carregar os dados do pedido.';

        exibirMensagem(error.message);

        btFinalizar.disabled = true;
        btAdicionar.disabled = true;
    }
}


// Adicionar uma forma de pagamento
function adicionarPagamento() {

    if (pagamentos.length >= 3) {
        exibirMensagem('Você pode utilizar no máximo três formas de pagamento.');
        return;
    }

    pagamentos.push({
        formaPagamento: '',
        valor: '',
        parcelas: 1,
        nomeCartao: '',
        numeroCartao: '',
        validade: '',
        cvv: ''
    });

    renderizarPagamentos();

    exibirMensagem('');
}


// Excluir uma forma de pagamento
function removerPagamento(indice) {

    pagamentos.splice(indice, 1);

    renderizarPagamentos();

    atualizarResumo();
}


// Criar os cartões de pagamento
function renderizarPagamentos() {

    listaPagamentos.innerHTML = '';

    pagamentos.forEach((pagamento, indice) => {

        const cartao = document.createElement('div');
        cartao.classList.add('cartao-pagamento');

        const cabecalho = document.createElement('div');
        cabecalho.classList.add('cabecalho-cartao');

        const titulo = document.createElement('h4');
        titulo.textContent = `Pagamento ${indice + 1}`;

        cabecalho.appendChild(titulo);

        if (pagamentos.length > 1) {

            const btRemover = document.createElement('button');

            btRemover.type = 'button';
            btRemover.classList.add('btRemover');
            btRemover.textContent = 'Remover';

            btRemover.onclick = () => removerPagamento(indice);

            cabecalho.appendChild(btRemover);
        }

        // Forma de pagamento
        const campoForma = document.createElement('div');
        campoForma.classList.add('campo');

        const labelForma = document.createElement('label');
        labelForma.textContent = 'Forma de pagamento';

        const selectForma = document.createElement('select');

        selectForma.innerHTML = `
            <option value="">Selecione uma forma</option>
            <option value="PIX">PIX</option>
            <option value="CREDITO">Cartão de crédito</option>
            <option value="DEBITO">Cartão de débito</option>
        `;

        selectForma.value = pagamento.formaPagamento;

        selectForma.onchange = () => {

            pagamento.formaPagamento = selectForma.value;

            if (pagamento.formaPagamento !== 'CREDITO') {
                pagamento.parcelas = 1;
            }

            renderizarPagamentos();
            atualizarResumo();
        };

        campoForma.append(labelForma, selectForma);

        // Valor do pagamento
        const campoValor = document.createElement('div');
        campoValor.classList.add('campo');

        const labelValor = document.createElement('label');
        labelValor.textContent = 'Valor do pagamento';

        const inputValor = document.createElement('input');

        inputValor.type = 'number';
        inputValor.min = '0.01';
        inputValor.step = '0.01';
        inputValor.placeholder = 'Ex.: 50.00';
        inputValor.value = pagamento.valor;

        inputValor.oninput = () => {

            pagamento.valor = inputValor.value;

            atualizarResumo();
        };

        campoValor.append(labelValor, inputValor);

        cartao.append(cabecalho, campoForma, campoValor);

        // Informações do PIX
        if (pagamento.formaPagamento === 'PIX') {

            const areaPix = document.createElement('div');
            areaPix.classList.add('dados-pix');

            const tituloPix = document.createElement('h4');
            tituloPix.textContent = 'Pagamento via PIX';

            const avisoPix = document.createElement('p');
            avisoPix.textContent =
                'Este é um QR Code demonstrativo. Não realize pagamentos reais.';

            const qrCode = document.createElement('img');
            qrCode.classList.add('imagem-qrcode');
            qrCode.alt = 'QR Code ilustrativo do pagamento';

            const codigoPix =
                `PIX-SIMULADO-ENTREPAGINAS-PEDIDO-${idPedido}`;

            // QR Code demonstrativo com conteúdo fictício
            qrCode.src =
                'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
                encodeURIComponent(codigoPix);

            const labelCodigo = document.createElement('label');
            labelCodigo.textContent = 'Código PIX fictício:';

            const campoCodigo = document.createElement('input');
            campoCodigo.type = 'text';
            campoCodigo.readOnly = true;
            campoCodigo.value = codigoPix;

            const btCopiar = document.createElement('button');
            btCopiar.type = 'button';
            btCopiar.classList.add('btCopiar');
            btCopiar.textContent = 'Copiar código';

            btCopiar.onclick = async () => {

                try {

                    await navigator.clipboard.writeText(codigoPix);

                    btCopiar.textContent = 'Código copiado!';

                } catch (error) {

                    exibirMensagem('Não foi possível copiar o código.');
                }
            };

            areaPix.append(
                tituloPix,
                avisoPix,
                qrCode,
                labelCodigo,
                campoCodigo,
                btCopiar
            );

            cartao.appendChild(areaPix);
        }

        // Informações do cartão de crédito ou débito
        if (
            pagamento.formaPagamento === 'CREDITO' ||
            pagamento.formaPagamento === 'DEBITO'
        ) {

            const areaCartao = document.createElement('div');
            areaCartao.classList.add('dados-cartao');

            const tituloCartao = document.createElement('h4');
            tituloCartao.textContent = 'Dados do cartão';

            const avisoCartao = document.createElement('p');
            avisoCartao.textContent =
                'Utilize somente informações fictícias para esta simulação.';


            // Nome do titular
            const campoNome = criarCampoCartao(
                'Nome impresso no cartão',
                'text',
                'Ex.: CLIENTE TESTE',
                pagamento.nomeCartao,
                valor => pagamento.nomeCartao = valor
            );

            // Número do cartão
            const campoNumero = criarCampoCartao(
                'Número fictício do cartão',
                'text',
                '0000 0000 0000 0000',
                pagamento.numeroCartao,
                valor => pagamento.numeroCartao = valor
            );

            campoNumero.input.maxLength = 19;
            campoNumero.input.inputMode = 'numeric';

            campoNumero.input.oninput = () => {

                const numeros = campoNumero.input.value
                    .replace(/\D/g, '')
                    .slice(0, 16);

                pagamento.numeroCartao = numeros.replace(/(\d{4})(?=\d)/g, '$1 ');

                campoNumero.input.value = pagamento.numeroCartao;
            };

            // Validade
            const campoValidade = criarCampoCartao(
                'Validade',
                'text',
                'MM/AA',
                pagamento.validade,
                valor => pagamento.validade = valor
            );

            campoValidade.input.maxLength = 5;
            campoValidade.input.inputMode = 'numeric';

            campoValidade.input.oninput = () => {

                const numeros = campoValidade.input.value
                    .replace(/\D/g, '')
                    .slice(0, 4);

                if (numeros.length > 2) {
                    pagamento.validade = numeros.slice(0, 2) + '/' + numeros.slice(2);
                } else {
                    pagamento.validade = numeros;
                }

                campoValidade.input.value = pagamento.validade;
            };

            // Código de segurança
            const campoCVV = criarCampoCartao(
                'Código de segurança fictício',
                'text',
                '000',
                pagamento.cvv,
                valor => pagamento.cvv = valor
            );

            campoCVV.input.maxLength = 4;
            campoCVV.input.inputMode = 'numeric';

            campoCVV.input.oninput = () => {

                pagamento.cvv = campoCVV.input.value
                    .replace(/\D/g, '')
                    .slice(0, 4);

                campoCVV.input.value = pagamento.cvv;
            };


            areaCartao.append(
                tituloCartao,
                avisoCartao,
                campoNome.div,
                campoNumero.div,
                campoValidade.div,
                campoCVV.div
            );

            cartao.appendChild(areaCartao);

            // Parcelas somente no crédito
            if (pagamento.formaPagamento === 'CREDITO') {

                const campoParcelas = document.createElement('div');
                campoParcelas.classList.add('campo');

                const labelParcelas = document.createElement('label');
                labelParcelas.textContent = 'Quantidade de parcelas';

                const selectParcelas = document.createElement('select');

                for (let i = 1; i <= 12; i++) {

                    const opcao = document.createElement('option');

                    opcao.value = i;
                    opcao.textContent = `${i}x`;

                    selectParcelas.appendChild(opcao);
                }

                selectParcelas.value = pagamento.parcelas;

                selectParcelas.onchange = () => {
                    pagamento.parcelas = Number(selectParcelas.value);
                };

                campoParcelas.append(labelParcelas, selectParcelas);

                cartao.appendChild(campoParcelas);
            }
        }

        listaPagamentos.appendChild(cartao);
    });

    contadorFormas.textContent = `${pagamentos.length}/3`;

    btAdicionar.disabled = pagamentos.length >= 3;
}


// Criar campos dos dados fictícios do cartão
function criarCampoCartao(titulo, tipo, exemplo, valor, aoAlterar) {

    const div = document.createElement('div');
    div.classList.add('campo');

    const label = document.createElement('label');
    label.textContent = titulo;

    const input = document.createElement('input');

    input.type = tipo;
    input.placeholder = exemplo;
    input.value = valor;
    input.autocomplete = 'off';

    input.oninput = () => {
        aoAlterar(input.value);
    };

    div.append(label, input);

    return {
        div,
        input
    };
}


// Atualizar os valores da conferência
function atualizarResumo() {

    let soma = 0;

    pagamentos.forEach(pagamento => {

        const valor = Number(pagamento.valor);

        if (Number.isFinite(valor) && valor > 0) {
            soma += Math.round(valor * 100);
        }
    });

    const totalCentavos = Math.round(valorPedido * 100);
    const diferencaCentavos = totalCentavos - soma;

    totalPago.textContent = formatarMoeda(soma / 100);

    if (diferencaCentavos === 0 && totalCentavos > 0) {

        diferenca.textContent = 'Os valores estão corretos!';
        diferenca.className = 'valor-correto';

    } else if (diferencaCentavos > 0) {

        diferenca.textContent =
            `Faltam ${formatarMoeda(diferencaCentavos / 100)}.`;

        diferenca.className = 'valor-incorreto';

    } else {

        diferenca.textContent =
            `O valor ultrapassa o total em ${formatarMoeda(Math.abs(diferencaCentavos) / 100)}.`;

        diferenca.className = 'valor-incorreto';
    }
}


// Validar os dados fictícios do cartão

function validarCartao(pagamento) {

    const numero = pagamento.numeroCartao.replace(/\s/g, '');

    if (!pagamento.nomeCartao.trim()) {
        return 'Informe o nome impresso no cartão.';
    }

    if (!/^\d{16}$/.test(numero)) {
        return 'O número do cartão deve possuir 16 dígitos.';
    }

    if (!/^\d{2}\/\d{2}$/.test(pagamento.validade)) {
        return 'Informe a validade no formato MM/AA.';
    }

    const partes = pagamento.validade.split('/');

    const mes = Number(partes[0]);
    const ano = 2000 + Number(partes[1]);

    if (mes < 1 || mes > 12) {
        return 'Informe um mês válido, entre 01 e 12.';
    }

    const agora = new Date();

    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;

    if (
        ano < anoAtual ||
        (ano === anoAtual && mes < mesAtual)
    ) {
        return 'A validade do cartão está vencida.';
    }

    if (!/^\d{3,4}$/.test(pagamento.cvv)) {
        return 'O código de segurança deve possuir 3 ou 4 dígitos.';
    }

    return '';
}

// Finalizar pagamento
async function finalizarPagamento() {

    exibirMensagem('');

    if (pagamentos.length === 0) {

        exibirMensagem('Adicione uma forma de pagamento.');
        return;
    }

    for (const pagamento of pagamentos) {

        if (!pagamento.formaPagamento) {

            exibirMensagem('Selecione todas as formas de pagamento.');
            return;
        }

        if (
            pagamento.valor === '' ||
            !Number.isFinite(Number(pagamento.valor)) ||
            Number(pagamento.valor) <= 0
        ) {

            exibirMensagem('Informe um valor válido para cada pagamento.');
            return;
        }

        if (
            pagamento.formaPagamento === 'CREDITO' ||
            pagamento.formaPagamento === 'DEBITO'
        ) {

            const erroCartao = validarCartao(pagamento);

            if (erroCartao) {

                exibirMensagem(erroCartao);

                return;
            }
        }
    }

    // Verificar se não há formas repetidas
    const formas = pagamentos.map(pagamento => pagamento.formaPagamento);

    if (new Set(formas).size !== formas.length) {

        exibirMensagem('Não repita a mesma forma de pagamento.');
        return;
    }

    // Conferir o total em centavos
    const soma = pagamentos.reduce((total, pagamento) => {

        return total + Math.round(Number(pagamento.valor) * 100);

    }, 0);

    if (soma !== Math.round(valorPedido * 100)) {

        exibirMensagem('A soma dos pagamentos precisa ser igual ao total do pedido.');
        return;
    }

    try {

        btFinalizar.disabled = true;

        exibirMensagem('Registrando pagamento...', '#80665e');

        const resposta = await fetch(`${URL_API}/pedido/${idPedido}/pagar`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            // Os dados do cartão não são enviados ao servidor
            body: JSON.stringify({
                pagamentos: pagamentos.map(pagamento => ({
                    formaPagamento: pagamento.formaPagamento,
                    valor: Number(pagamento.valor),
                    parcelas: pagamento.parcelas
                }))
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                dados.mensagem || 'Não foi possível realizar o pagamento.'
            );
        }

        exibirMensagem('Pagamento simulado realizado com sucesso!', 'green');

        btAdicionar.disabled = true;

        setTimeout(() => {

            window.location.href = 'pedidos.html';

        }, 2000);

    } catch (error) {

        console.error('Erro ao finalizar pagamento:', error);

        exibirMensagem(error.message);

        btFinalizar.disabled = false;
    }
}


// Voltar para os pedidos
btVoltar.onclick = () => {

    window.location.href = 'pedidos.html';
};


// Eventos
btAdicionar.onclick = adicionarPagamento;

btFinalizar.onclick = finalizarPagamento;


// Iniciar página
btFinalizar.disabled = true;
btAdicionar.disabled = true;

carregarPedido();
btFinalizar.disabled = false;