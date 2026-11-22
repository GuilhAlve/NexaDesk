import { Router } from 'express'
import db from '../../banco/database.js'

const router = Router()

router.get('/', (req, res) => {
  const organizacaoId = Number(req.get('X-Organization-Id'))
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  try {
    const chamados = db.prepare(`
      SELECT
        id,
        titulo,
        categoria,
        setor,
        prioridade,
        descricao,
        usuario,
        status,
        criado_em AS criadoEm,
        atendente,
        iniciado_em AS iniciadoEm
      FROM chamados
      WHERE organizacao_id = ?
      ORDER BY criado_em DESC, id DESC
    `).all(organizacaoId)

    return res.json(chamados)
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível carregar os chamados.' })
  }
})

router.post('/', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const organizacaoId = Number(req.get('X-Organization-Id'))
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const categoria = typeof body.categoria === 'string' ? body.categoria.trim() : 'Geral'
  const setor = typeof body.setor === 'string' ? body.setor.trim() : ''
  const prioridade = typeof body.prioridade === 'string' ? body.prioridade.trim() : ''
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : ''
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim() : ''

  if (!titulo || !descricao || !usuario) {
    return res.status(400).json({ erro: 'Informe o assunto, a descrição e o solicitante.' })
  }
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  if (titulo.length > 120 || descricao.length > 5000 || usuario.length > 120) {
    return res.status(400).json({ erro: 'Um ou mais campos excedem o limite permitido.' })
  }

  try {
    const criadoEm = new Date().toISOString()
    const resultado = db.prepare(`
      INSERT INTO chamados (titulo, categoria, setor, prioridade, descricao, usuario, criado_em, organizacao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      titulo,
      categoria || 'Geral',
      setor || null,
      prioridade || null,
      descricao,
      usuario,
      criadoEm,
      organizacaoId
    )

    return res.status(201).json({
      id: Number(resultado.lastInsertRowid),
      titulo,
      categoria: categoria || 'Geral',
      setor: setor || null,
      prioridade: prioridade || null,
      descricao,
      usuario,
      status: 'Aberto',
      criadoEm
    })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível salvar o chamado.' })
  }
})

router.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const status = req.body?.status
  const organizacaoId = Number(req.get('X-Organization-Id'))
  const atendente = typeof req.body?.atendente === 'string'
    ? req.body.atendente.trim()
    : ''

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Identificador de chamado inválido.' })
  }
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  if (!['Em andamento', 'Concluído'].includes(status)) {
    return res.status(400).json({ erro: 'O status informado é inválido.' })
  }
  if (status === 'Em andamento' && !atendente) {
    return res.status(400).json({ erro: 'Informe o administrador que iniciou o atendimento.' })
  }

  try {
    const chamado = db.prepare(
      'SELECT status FROM chamados WHERE id = ? AND organizacao_id = ?'
    ).get(id, organizacaoId)
    if (!chamado) {
      return res.status(404).json({ erro: 'Chamado não encontrado.' })
    }
    if (chamado.status === 'Concluído') {
      return res.status(409).json({ erro: 'Este chamado já foi concluído.' })
    }
    if (status === 'Em andamento' && chamado.status !== 'Aberto') {
      return res.status(409).json({ erro: 'Este chamado já está em andamento.' })
    }

    if (status === 'Em andamento') {
      db.prepare(`
        UPDATE chamados
        SET status = ?, atendente = ?, iniciado_em = ?
        WHERE id = ?
      `).run(status, atendente, new Date().toISOString(), id)
      return res.json({ mensagem: 'Atendimento iniciado com sucesso.', id, status, atendente })
    }

    db.prepare('UPDATE chamados SET status = ? WHERE id = ?').run(status, id)
    return res.json({ mensagem: 'Chamado concluído com sucesso.', id, status })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível concluir o chamado.' })
  }
})

export default router
