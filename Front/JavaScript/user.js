const nomeUsuario = sessionStorage.getItem('usuarioLogadoNome')
const organizacaoId = sessionStorage.getItem('organizacaoId')
if (!nomeUsuario) {
    window.location.replace('/html/login.html')
}

const tabelaUsuarios = document.getElementById('usuarios-body')
const statusUsuarios = document.getElementById('usuarios-status')
const totalUsuarios = document.getElementById('total-usuarios')
const campoBusca = document.getElementById('busca-usuarios')
const dialogEditar = document.getElementById('dialog-editar')
const formEditar = document.getElementById('form-editar')
const campoEmail = document.getElementById('editar-email')
const campoNome = document.getElementById('editar-nome')
const campoSenha = document.getElementById('editar-senha')
const campoCargo = document.getElementById('editar-cargo')
const campoComputador = document.getElementById('editar-computador')
const campoCodigoAcesso = document.getElementById('editar-codigo-acesso')
const botaoGerarCodigo = document.getElementById('gerar-codigo-acesso')
const campoAtivo = document.getElementById('editar-ativo')
const statusDialogo = document.getElementById('dialog-status')
const camposCadastro = document.querySelectorAll('.create-only')
const camposEdicao = document.querySelectorAll('.edit-only')
const tituloDialogo = document.getElementById('dialog-titulo')
const textoDialogo = document.getElementById('dialog-eyebrow')
const botaoSalvar = formEditar.querySelector('button[type="submit"]')
let usuarios = []
let usuarioEmEdicao
let modoDialogo = 'edit'

function gerarCodigoAcesso() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const valores = new Uint32Array(8)
    crypto.getRandomValues(valores)
    campoCodigoAcesso.value = Array.from(valores, (valor) =>
        caracteres[valor % caracteres.length]
    ).join('')
}

document.getElementById('nome-sidebar').textContent = nomeUsuario
document.getElementById('avatar-usuario').textContent = nomeUsuario.trim().charAt(0).toUpperCase()
document.getElementById('sair').addEventListener('click', () => {
    sessionStorage.removeItem('usuarioLogadoNome')
    sessionStorage.removeItem('usuario')
    sessionStorage.removeItem('organizacaoId')
    sessionStorage.removeItem('organizacaoNome')
    window.location.assign('/html/login.html')
})

function mostrarUsuarios() {
    const termo = campoBusca.value.trim().toLocaleLowerCase('pt-BR')
    const usuariosFiltrados = usuarios.filter((usuario) =>
        [usuario.nome, usuario.email, usuario.cargo, usuario.computador_nome, usuario.ativo ? 'ativa' : 'desativada']
            .some((valor) => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo))
    )

    tabelaUsuarios.replaceChildren()
    totalUsuarios.textContent = `${usuarios.length} ${usuarios.length === 1 ? 'usuário' : 'usuários'}`

    for (const usuario of usuariosFiltrados) {
        const linha = document.createElement('tr')
        const nome = document.createElement('td')
        nome.className = 'user-name-cell'
        nome.textContent = usuario.nome

        const email = document.createElement('td')
        email.className = 'user-email-cell'
        email.textContent = usuario.email

        const cargo = document.createElement('td')
        const etiquetaCargo = document.createElement('span')
        etiquetaCargo.className = 'user-role'
        etiquetaCargo.textContent = usuario.cargo
        cargo.append(etiquetaCargo)

        const computador = document.createElement('td')
        computador.className = 'user-email-cell'
        computador.textContent = usuario.computador_nome || 'Não registrado'

        const status = document.createElement('td')
        const etiquetaStatus = document.createElement('span')
        etiquetaStatus.className = `account-status ${usuario.ativo ? 'is-active' : 'is-inactive'}`
        etiquetaStatus.textContent = usuario.ativo ? 'Ativa' : 'Desativada'
        status.append(etiquetaStatus)

        const acoes = document.createElement('td')
        const grupoAcoes = document.createElement('div')
        grupoAcoes.className = 'user-actions'
        for (const [acao, rotulo, classe] of [
            ['edit', 'Editar', 'edit-button'],
            ['delete', 'Remover', 'delete-button']
        ]) {
            const botao = document.createElement('button')
            botao.type = 'button'
            botao.className = classe
            botao.dataset.userAction = acao
            botao.dataset.userId = String(usuario.id)
            botao.textContent = rotulo
            grupoAcoes.append(botao)
        }
        acoes.append(grupoAcoes)
        linha.append(nome, email, cargo, computador, status, acoes)
        tabelaUsuarios.append(linha)
    }

    statusUsuarios.textContent = usuariosFiltrados.length
        ? ''
        : termo ? 'Nenhum usuário corresponde à busca.' : 'Ainda não há usuários cadastrados.'
}

async function carregarUsuarios() {
    statusUsuarios.textContent = 'Carregando usuários...'
    document.getElementById('atualizar-usuarios').disabled = true

    try {
        const resposta = await fetch('/api/usuarios', {
            headers: { 'X-Organization-Id': organizacaoId }
        })
        const resultado = await resposta.json()
        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível carregar os usuários.')
        }
        usuarios = resultado
        mostrarUsuarios()
    } catch (erro) {
        tabelaUsuarios.replaceChildren()
        totalUsuarios.textContent = 'Indisponível'
        statusUsuarios.textContent = erro.message || 'Não foi possível conectar ao servidor.'
    } finally {
        document.getElementById('atualizar-usuarios').disabled = false
    }
}

function abrirEdicao(usuario) {
    modoDialogo = 'edit'
    usuarioEmEdicao = usuario
    formEditar.reset()
    camposCadastro.forEach((campo) => { campo.hidden = true })
    camposEdicao.forEach((campo) => { campo.hidden = false })
    campoEmail.disabled = true
    campoEmail.required = false
    campoCargo.disabled = false
    campoCargo.required = true
    campoComputador.disabled = false
    campoComputador.required = true
    campoCodigoAcesso.disabled = false
    campoCodigoAcesso.required = false
    campoCodigoAcesso.placeholder = 'Gerar novo código'
    botaoGerarCodigo.disabled = false
    campoSenha.required = false
    campoSenha.placeholder = 'Deixe em branco para manter'
    tituloDialogo.textContent = 'Editar usuário'
    textoDialogo.textContent = 'CONTA'
    botaoSalvar.textContent = 'Salvar alterações'
    campoEmail.value = usuario.email
    campoNome.value = usuario.nome
    let cargoExiste = Array.from(campoCargo.options).some((option) => option.value === usuario.cargo)
    if (!cargoExiste) {
        const option = document.createElement('option')
        option.value = usuario.cargo
        option.textContent = usuario.cargo
        campoCargo.append(option)
    }
    campoCargo.value = usuario.cargo
    campoComputador.value = usuario.computador_nome || ''
    campoCodigoAcesso.value = ''
    campoSenha.value = ''
    campoAtivo.checked = Boolean(usuario.ativo)
    statusDialogo.textContent = ''
    dialogEditar.showModal()
    campoNome.focus()
}

function abrirCadastro() {
    modoDialogo = 'create'
    usuarioEmEdicao = undefined
    formEditar.reset()
    camposCadastro.forEach((campo) => { campo.hidden = false })
    camposEdicao.forEach((campo) => { campo.hidden = true })
    campoEmail.disabled = false
    campoEmail.required = true
    campoCargo.disabled = false
    campoCargo.required = true
    campoComputador.disabled = false
    campoComputador.required = true
    campoCodigoAcesso.disabled = false
    campoCodigoAcesso.required = true
    botaoGerarCodigo.disabled = false
    campoSenha.required = true
    campoSenha.placeholder = 'Mínimo de 8 caracteres'
    tituloDialogo.textContent = 'Novo usuário'
    textoDialogo.textContent = 'NOVA CONTA'
    botaoSalvar.textContent = 'Criar usuário'
    gerarCodigoAcesso()
    statusDialogo.textContent = ''
    dialogEditar.showModal()
    campoNome.focus()
}

document.getElementById('atualizar-usuarios').addEventListener('click', carregarUsuarios)
document.getElementById('novo-usuario').addEventListener('click', abrirCadastro)
botaoGerarCodigo.addEventListener('click', gerarCodigoAcesso)
campoBusca.addEventListener('input', mostrarUsuarios)
tabelaUsuarios.addEventListener('click', async (event) => {
    const botao = event.target.closest('button[data-user-action]')
    if (!botao) return

    const usuario = usuarios.find((item) => item.id === Number(botao.dataset.userId))
    if (!usuario) return
    if (botao.dataset.userAction === 'edit') {
        abrirEdicao(usuario)
        return
    }

    if (!window.confirm(`Remover a conta de ${usuario.nome}? Essa ação não pode ser desfeita.`)) return

    botao.disabled = true
    try {
        const resposta = await fetch(`/api/usuarios/${usuario.id}`, {
            method: 'DELETE',
            headers: { 'X-Organization-Id': organizacaoId }
        })
        const resultado = await resposta.json()
        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível remover o usuário.')
        }
        usuarios = usuarios.filter((item) => item.id !== usuario.id)
        mostrarUsuarios()
    } catch (erro) {
        window.alert(erro.message || 'Não foi possível conectar ao servidor.')
        botao.disabled = false
    }
})

formEditar.addEventListener('submit', async (event) => {
    event.preventDefault()
    statusDialogo.textContent = ''
    botaoSalvar.disabled = true

    try {
        const cadastro = modoDialogo === 'create'
        const dados = { nome: campoNome.value.trim() }
        let url = `/api/usuarios/${usuarioEmEdicao?.id}`
        let metodo = 'PATCH'
        if (cadastro) {
            dados.email = campoEmail.value.trim()
            dados.senha = campoSenha.value
            dados.cargo = campoCargo.value.trim()
            dados.computador = campoComputador.value.trim()
            dados.codigoAcesso = campoCodigoAcesso.value.trim()
            url = '/api/usuarios'
            metodo = 'POST'
        } else {
            dados.cargo = campoCargo.value.trim()
            dados.computador = campoComputador.value.trim()
            if (campoSenha.value) dados.senha = campoSenha.value
            if (campoCodigoAcesso.value.trim()) dados.codigoAcesso = campoCodigoAcesso.value.trim()
        }
        if (!cadastro) dados.ativo = campoAtivo.checked

        const resposta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'X-Organization-Id': organizacaoId
            },
            body: JSON.stringify(dados)
        })
        const resultado = await resposta.json()
        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível atualizar o usuário.')
        }

        dialogEditar.close()
    if (cadastro) campoBusca.value = ''
        await carregarUsuarios()
    } catch (erro) {
        statusDialogo.textContent = erro.message || 'Não foi possível conectar ao servidor.'
    } finally {
        botaoSalvar.disabled = false
    }
})

document.getElementById('fechar-dialogo').addEventListener('click', () => dialogEditar.close())
document.getElementById('cancelar-edicao').addEventListener('click', () => dialogEditar.close())

carregarUsuarios()