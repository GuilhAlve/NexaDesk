import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../../banco/database.js'

const router = Router()

router.post('/', async (req, res) => {
  const nomeOrganizacao = req.body.nomeOrganizacao?.trim()
  const nome = req.body.nome?.trim()
  const cargo = req.body.cargo?.trim()
  const email = req.body.email?.trim().toLowerCase()
  const senha = req.body.senha

  if (!nomeOrganizacao || !nome || !cargo || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos da organização.' })
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10)
    const criarOrganizacao = db.transaction(() => {
      const organizacao = db.prepare(`
        INSERT INTO organizacoes (nome, criado_em)
        VALUES (?, ?)
      `).run(nomeOrganizacao, new Date().toISOString())

      const administrador = db.prepare(`
        INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo, organizacao_id)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(nome, email, senhaHash, cargo, organizacao.lastInsertRowid)
      db.prepare(`
        UPDATE organizacoes SET administrador_id = ? WHERE id = ?
      `).run(administrador.lastInsertRowid, organizacao.lastInsertRowid)

      return {
        id: Number(organizacao.lastInsertRowid),
        nome: nomeOrganizacao
      }
    })

    const organizacao = criarOrganizacao()
    return res.status(201).json({
      mensagem: 'Organização criada com sucesso.',
      organizacao,
      administrador: { nome, cargo, email }
    })
  } catch (erro) {
    if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' })
    }

    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível criar a organização.' })
  }
})

export default router
