import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import db from '../../banco/database.js'

const router = Router()

router.get('/', (req, res) => {
  const organizacaoId = Number(req.get('X-Organization-Id'))
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  try {
    const usuarios = db.prepare(`
      SELECT id, nome, email, cargo, ativo, computador_nome
      FROM usuarios
      WHERE organizacao_id = ?
      ORDER BY nome COLLATE NOCASE
    `).all(organizacaoId)

    return res.json(usuarios)
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível carregar os usuários.' })
  }
})

router.post('/login', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase()
  const senha = req.body.senha

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha.' })
  }

  try {
    const usuario = db.prepare(`
      SELECT u.id, u.nome, u.senha_hash, u.cargo, u.ativo, u.organizacao_id,
             o.nome AS organizacao_nome, o.administrador_id
      FROM usuarios u
      LEFT JOIN organizacoes o ON o.id = u.organizacao_id
      WHERE u.email = ?
    `).get(email)

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' })
    }
    if (!usuario.ativo) {
      return res.status(403).json({ erro: 'Esta conta está desativada.' })
    }

    return res.json({
      usuario: {
        nome: usuario.nome,
        organizacaoId: usuario.organizacao_id,
        organizacaoNome: usuario.organizacao_nome,
        cargo: usuario.administrador_id === usuario.id ? 'admin' : 'usuario'
      }
    })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível entrar na conta.' })
  }
})

router.post('/', async (req, res) => {
  const nome = req.body.nome?.trim()
  const email = req.body.email?.trim().toLowerCase()
  const senha = req.body.senha
  const cargo = req.body.cargo?.trim()
  const organizacaoId = Number(req.get('X-Organization-Id'))
  const computador = req.body.computador?.trim()
  const codigoAcesso = typeof req.body.codigoAcesso === 'string'
    ? req.body.codigoAcesso.trim()
    : ''

  if (!nome || !email || !senha || !cargo || !computador || !codigoAcesso) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' })
  }
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  if (codigoAcesso.length < 4 || codigoAcesso.length > 20) {
    return res.status(400).json({ erro: 'O código de acesso deve ter entre 4 e 20 caracteres.' })
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10)
    const codigoAcessoHash = crypto.createHash('sha256').update(codigoAcesso).digest('hex')
    db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, cargo, computador_nome, codigo_acesso_hash, organizacao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, email, senhaHash, cargo, computador, codigoAcessoHash, organizacaoId)

    return res.status(201).json({ mensagem: 'Conta criada com sucesso.', nome })
  } catch (erro) {
    if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ erro: 'Este email já está cadastrado.' })
    }

    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível criar a conta.' })
  }
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const organizacaoId = Number(req.get('X-Organization-Id'))
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : undefined
  const senha = typeof req.body.senha === 'string' ? req.body.senha : undefined
  const cargo = typeof req.body.cargo === 'string' ? req.body.cargo.trim() : undefined
  const computador = typeof req.body.computador === 'string' ? req.body.computador.trim() : undefined
  const codigoAcesso = typeof req.body.codigoAcesso === 'string' ? req.body.codigoAcesso.trim() : undefined
  const ativo = req.body.ativo

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Identificador de usuário inválido.' })
  }
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }
  if (req.body.nome !== undefined && !nome) {
    return res.status(400).json({ erro: 'O nome não pode ficar vazio.' })
  }
  if (req.body.senha !== undefined && typeof req.body.senha !== 'string') {
    return res.status(400).json({ erro: 'A senha informada é inválida.' })
  }
  if (req.body.cargo !== undefined && !cargo) {
    return res.status(400).json({ erro: 'O cargo não pode ficar vazio.' })
  }
  if (req.body.computador !== undefined && !computador) {
    return res.status(400).json({ erro: 'O nome do computador não pode ficar vazio.' })
  }
  if (codigoAcesso && (codigoAcesso.length < 4 || codigoAcesso.length > 20)) {
    return res.status(400).json({ erro: 'O código de acesso deve ter entre 4 e 20 caracteres.' })
  }
  if (ativo !== undefined && typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'O status da conta é inválido.' })
  }
  if (!nome && !senha && !cargo && !computador && !codigoAcesso && ativo === undefined) {
    return res.status(400).json({ erro: 'Informe alguma alteração para o usuário.' })
  }

  try {
    const usuario = db.prepare(
      'SELECT id FROM usuarios WHERE id = ? AND organizacao_id = ?'
    ).get(id, organizacaoId)
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' })
    }

    const senhaHash = senha ? await bcrypt.hash(senha, 10) : undefined
    const codigoAcessoHash = codigoAcesso
      ? crypto.createHash('sha256').update(codigoAcesso).digest('hex')
      : undefined
    const atualizarUsuario = db.transaction(() => {
      if (nome) {
        db.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').run(nome, id)
      }
      if (cargo) {
        db.prepare('UPDATE usuarios SET cargo = ? WHERE id = ?').run(cargo, id)
      }
      if (computador) {
        db.prepare('UPDATE usuarios SET computador_nome = ? WHERE id = ?').run(computador, id)
      }
      if (codigoAcessoHash) {
        db.prepare('UPDATE usuarios SET codigo_acesso_hash = ? WHERE id = ?').run(codigoAcessoHash, id)
      }
      if (senhaHash) {
        db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(senhaHash, id)
      }
      if (ativo !== undefined) {
        db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(Number(ativo), id)
      }
    })
    atualizarUsuario()

    return res.json({ mensagem: 'Usuário atualizado com sucesso.' })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível atualizar o usuário.' })
  }
})

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const organizacaoId = Number(req.get('X-Organization-Id'))

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ erro: 'Identificador de usuário inválido.' })
  }
  if (!Number.isInteger(organizacaoId) || organizacaoId < 1) {
    return res.status(400).json({ erro: 'Organização não informada.' })
  }

  try {
    const resultado = db.prepare(
      'DELETE FROM usuarios WHERE id = ? AND organizacao_id = ?'
    ).run(id, organizacaoId)
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' })
    }

    return res.json({ mensagem: 'Usuário removido com sucesso.' })
  } catch (erro) {
    console.error(erro)
    return res.status(500).json({ erro: 'Não foi possível remover o usuário.' })
  }
})

export default router