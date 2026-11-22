const nomeUsuario = sessionStorage.getItem('usuarioLogadoNome')

if (!nomeUsuario) {
  window.location.replace('/html/login.html')
} else {
  document.getElementById('nome-usuario').textContent = nomeUsuario
  document.getElementById('nome-sidebar').textContent = nomeUsuario
  document.getElementById('avatar-usuario').textContent = nomeUsuario.trim().charAt(0).toUpperCase()
}

document.getElementById('sair').addEventListener('click', () => {
  sessionStorage.removeItem('usuarioLogadoNome')
  window.location.assign('/html/login.html')
})

async function loadTicketSummary() {
  const status = document.getElementById('dashboard-ticket-status')
  try {
    const resposta = await fetch('/api/chamados', {
      headers: {
        'X-Organization-Id': sessionStorage.getItem('organizacaoId') || ''
      }
    })
    const chamados = await resposta.json()
    if (!resposta.ok) {
      throw new Error(chamados.erro || 'Não foi possível carregar os chamados.')
    }

    document.getElementById('count-chamados-abertos').textContent = String(
      chamados.filter((chamado) => chamado.status === 'Aberto').length
    )
    document.getElementById('count-chamados-andamento').textContent = String(
      chamados.filter((chamado) => chamado.status === 'Em andamento').length
    )
    document.getElementById('count-chamados-finalizados').textContent = String(
      chamados.filter((chamado) => chamado.status === 'Concluído').length
    )

    const titulo = document.getElementById('estado-chamados')
    const resumo = document.getElementById('resumo-ultimo-chamado')
    if (chamados.length) {
      titulo.textContent = `${chamados.length} chamado(s) registrado(s)`
      resumo.textContent = `Mais recente: ${chamados[0].titulo}`
    } else {
      titulo.textContent = 'Não há chamados no momento'
      resumo.textContent = 'Quando houver novas solicitações, elas aparecerão aqui.'
    }
    status.textContent = ''
  } catch (erro) {
    status.textContent = erro.message || 'Não foi possível conectar ao servidor.'
  }
}

loadTicketSummary()
window.setInterval(loadTicketSummary, 10000)