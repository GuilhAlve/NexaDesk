function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openTicketModal() {
  const modal = document.getElementById('ticket-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  const input = document.querySelector('#ticket-form input[name="titulo"]');
  input?.focus();
}

function closeTicketModal() {
  const modal = document.getElementById('ticket-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function announce(message, isError = false) {
  const status = document.getElementById('ticket-status') || document.getElementById('request-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.error = String(isError);
}

function renderAdminTickets(tickets) {
  const list = document.getElementById('lista-chamados');
  const emptyState = document.getElementById('sem-chamados');
  if (!list) return;

  const detalhesAbertos = new Set(
    Array.from(list.querySelectorAll('details[open]'))
      .map((details) => details.closest('[data-ticket-id]')?.dataset.ticketId)
      .filter(Boolean)
  );

  if (!tickets.length) {
    list.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  list.innerHTML = tickets
    .map((ticket) => {
      const categoria = escapeHtml(ticket.categoria || 'Geral');
      const titulo = escapeHtml(ticket.titulo || 'Chamado sem título');
      const mensagem = escapeHtml(ticket.descricao || 'Sem descrição');
      const usuario = escapeHtml(ticket.usuario || 'Usuário');
      const setor = escapeHtml(ticket.setor || ticket.prioridade || 'Não informado');
      const prioridade = escapeHtml(ticket.prioridade || 'Não informada');
      const status = escapeHtml(ticket.status || 'Aberto');
      const id = escapeHtml(ticket.id);
      const data = escapeHtml(ticket.criadoEm
        ? new Date(ticket.criadoEm).toLocaleString('pt-BR')
        : '');
      const concluido = ticket.status === 'Concluído';

      return `
        <article class="ticket-card" data-ticket-id="${id}">
          <div class="ticket-card__header">
            <div>
              <p class="ticket-card__label">${categoria}</p>
              <h3>${titulo}</h3>
            </div>
            <span class="ticket-badge">${setor}</span>
          </div>
          <p class="ticket-card__message">${mensagem}</p>
          <div class="ticket-card__meta">
            <span>Usuário: ${usuario}</span>
            <span>Status: ${status}</span>
            <span>${data}</span>
          </div>
          <details class="ticket-details"${detalhesAbertos.has(String(ticket.id)) ? ' open' : ''}>
            <summary>Ver detalhes</summary>
            <dl class="ticket-details__list">
              <div><dt>Solicitante</dt><dd>${usuario}</dd></div>
              <div><dt>Categoria</dt><dd>${categoria}</dd></div>
              <div><dt>Setor</dt><dd>${escapeHtml(ticket.setor || 'Não informado')}</dd></div>
              <div><dt>Prioridade</dt><dd>${prioridade}</dd></div>
              <div><dt>Descrição</dt><dd>${mensagem}</dd></div>
            </dl>
            ${concluido
              ? '<p class="ticket-card__completed">Chamado concluído</p>'
              : '<button class="panel-action ticket-card__complete" type="button" data-conclude-ticket>Concluir chamado</button>'}
          </details>
        </article>
      `;
    })
    .join('');
}

function updateSummaryCounts(tickets) {
  const abertos = tickets.filter((ticket) => (ticket.status || 'Aberto') === 'Aberto').length;
  const andamento = tickets.filter((ticket) => (ticket.status || 'Em andamento') === 'Em andamento').length;
  const finalizados = tickets.filter((ticket) => (ticket.status || 'Concluído') === 'Concluído').length;

  const openCount = document.getElementById('count-abertos');
  const progressCount = document.getElementById('count-em-andamento');
  const doneCount = document.getElementById('count-finalizados');

  if (openCount) openCount.textContent = String(abertos);
  if (progressCount) progressCount.textContent = String(andamento);
  if (doneCount) doneCount.textContent = String(finalizados);
}

async function loadTickets() {
  const resposta = await fetch('/api/chamados');
  const resultado = await resposta.json();
  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Não foi possível carregar os chamados.');
  }

  renderAdminTickets(resultado);
  updateSummaryCounts(resultado);
}

async function sendTicket(ticket) {
  const resposta = await fetch('/api/chamados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Não foi possível enviar o chamado.');
  }
}

async function concludeTicket(id) {
  const resposta = await fetch(`/api/chamados/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Concluído' })
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    throw new Error(resultado.erro || 'Não foi possível concluir o chamado.');
  }
}

function bindAdminTicketActions() {
  const list = document.getElementById('lista-chamados');
  if (!list) return;

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-conclude-ticket]');
    if (!button) return;

    const ticket = button.closest('[data-ticket-id]');
    if (!ticket) return;

    button.disabled = true;
    announce('Concluindo chamado...');
    try {
      await concludeTicket(ticket.dataset.ticketId);
      await loadTickets();
      announce('Chamado concluído com sucesso.');
    } catch (erro) {
      announce(erro.message || 'Não foi possível concluir o chamado.', true);
      button.disabled = false;
    }
  });
}

function currentUser() {
  return sessionStorage.getItem('usuarioLogadoNome') || 'Usuário';
}

function bindTicketModal() {
  const modal = document.getElementById('ticket-modal');
  if (!modal) return;

  const openButtons = document.querySelectorAll('[data-open-ticket], #abrir-chamado-btn');
  openButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openTicketModal();
    });
  });

  const closeButtons = document.querySelectorAll('[data-close-ticket], #cancelar-ticket, #close-ticket-modal');
  closeButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      closeTicketModal();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeTicketModal();
  });

  const form = document.getElementById('ticket-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const ticket = {
      titulo: String(formData.get('titulo') || '').trim(),
      categoria: String(formData.get('categoria') || 'Geral').trim(),
      setor: String(formData.get('setor') || '').trim(),
      descricao: String(formData.get('descricao') || '').trim(),
      usuario: currentUser()
    };

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    announce('Enviando chamado...');
    try {
      await sendTicket(ticket);
      form.reset();
      closeTicketModal();
      try {
        await loadTickets();
        announce('Chamado enviado com sucesso.');
      } catch (erro) {
        announce(`Chamado enviado, mas a lista não atualizou: ${erro.message}`, true);
      }
    } catch (erro) {
      announce(erro.message || 'Não foi possível conectar ao servidor.', true);
    } finally {
      submitButton.disabled = false;
    }
  });
}

function bindRequestForm() {
  const form = document.getElementById('request-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ticket = {
      titulo: document.getElementById('assunto').value.trim(),
      categoria: document.getElementById('categoria').value,
      prioridade: document.getElementById('prioridade').value,
      descricao: document.getElementById('descricao').value.trim(),
      usuario: document.getElementById('solicitante').value.trim() || currentUser()
    };
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    announce('Enviando chamado...');
    try {
      await sendTicket(ticket);
      form.reset();
      announce('Chamado enviado com sucesso.');
    } catch (erro) {
      announce(erro.message || 'Não foi possível conectar ao servidor.', true);
    } finally {
      submitButton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindTicketModal();
  bindRequestForm();
  if (document.getElementById('lista-chamados')) {
    bindAdminTicketActions();
    loadTickets()
      .then(() => announce(''))
      .catch((erro) => announce(erro.message || 'Não foi possível carregar os chamados.', true));
    window.setInterval(() => {
      loadTickets()
        .then(() => announce(''))
        .catch((erro) => announce(erro.message || 'Não foi possível atualizar os chamados.', true));
    }, 10000);
  }
});
