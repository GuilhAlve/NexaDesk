const form = document.getElementById('cadastro-form')
const statusCadastro = document.getElementById('cadastro-status')

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  statusCadastro.textContent = 'Criando organização...'

  try {
    const resposta = await fetch('/api/organizacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    })
    const resultado = await resposta.json()

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Erro ao criar organização.')
    }

    const usuario = {
      nome: resultado.administrador.nome,
      organizacaoId: resultado.organizacao.id,
      organizacaoNome: resultado.organizacao.nome,
      cargo: 'admin'
    }
    sessionStorage.setItem('usuario', JSON.stringify(usuario))
    sessionStorage.setItem('usuarioLogadoNome', usuario.nome)
    sessionStorage.setItem('organizacaoId', String(usuario.organizacaoId))
    sessionStorage.setItem('organizacaoNome', usuario.organizacaoNome)
    window.location.assign('/html/principalADM.html')
  } catch (erro) {
    statusCadastro.textContent = erro.message || 'Não foi possível conectar ao servidor.'
  }
})