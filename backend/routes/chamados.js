import { Router } from 'express'
import db from '../../banco/database.js'

const router = Router()

router.get('/', (_req, res) => {
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
        criado_em AS criadoEm
      FROM chamados
      ORDER BY criado_em DESC, id DESC
    `).all()

    return res.json(chamados)
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível carregar os chamados.' })
  }
})

router.post('/', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  const categoria = typeof body.categoria === 'string' ? body.categoria.trim() : 'Geral'
  const setor = typeof body.setor === 'string' ? body.setor.trim() : ''
  const prioridade = typeof body.prioridade === 'string' ? body.prioridade.trim() : ''
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : ''
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim() : ''

  if (!titulo || !descricao || !usuario) {
    return res.status(400).json({ erro: 'Informe o assunto, a descrição e o solicitante.' })
  }
  if (titulo.length > 120 || descricao.length > 5000 || usuario.length > 120) {
    return res.status(400).json({ erro: 'Um ou mais campos excedem o limite permitido.' })
  }

  try {
    const criadoEm = new Date().toISOString()
    const resultado = db.prepare(`
      INSERT INTO chamados (titulo, categoria, setor, prioridade, descricao, usuario, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      titulo,
      categoria || 'Geral',
      setor || null,
      prioridade || null,
      descricao,
      usuario,
      criadoEm
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

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Identificador de chamado inválido.' })
  }
  if (status !== 'Concluído') {
    return res.status(400).json({ erro: 'O status informado é inválido.' })
  }

  try {
    const chamado = db.prepare('SELECT status FROM chamados WHERE id = ?').get(id)
    if (!chamado) {
      return res.status(404).json({ erro: 'Chamado não encontrado.' })
    }
    if (chamado.status === 'Concluído') {
      return res.status(409).json({ erro: 'Este chamado já foi concluído.' })
    }

    db.prepare('UPDATE chamados SET status = ? WHERE id = ?').run(status, id)
    return res.json({ mensagem: 'Chamado concluído com sucesso.', id, status })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível concluir o chamado.' })
  }
})

export default router
