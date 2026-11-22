import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(process.env.DATABASE_PATH || path.join(diretorioAtual, 'banco.db'))
const colunas = db.pragma('table_info(usuarios)')

const criarTabelaUsuarios = () => db.exec(`
  CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    cargo TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    computador_nome TEXT,
    codigo_acesso_hash TEXT,
    organizacao_id INTEGER
  )
`)

if (colunas.length === 0) {
  criarTabelaUsuarios()
} else if (colunas.some((coluna) => coluna.name === 'senha')) {
  db.transaction(() => {
    db.exec('ALTER TABLE usuarios RENAME TO usuarios_legado')
    criarTabelaUsuarios()

    const usuariosAntigos = db.prepare(
      'SELECT Id AS id, nome, email, senha, cargo FROM usuarios_legado'
    ).all()
    const inserirUsuario = db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, cargo)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const usuario of usuariosAntigos) {
      inserirUsuario.run(
        usuario.id,
        usuario.nome,
        usuario.email,
        bcrypt.hashSync(usuario.senha, 10),
        usuario.cargo || 'usuarios'
      )
    }

    db.exec('DROP TABLE usuarios_legado')
  })()
} else if (!colunas.some((coluna) => coluna.name === 'ativo')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))')
}

const colunasAtuais = db.pragma('table_info(usuarios)')
if (!colunasAtuais.some((coluna) => coluna.name === 'computador_nome')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN computador_nome TEXT')
}
if (!colunasAtuais.some((coluna) => coluna.name === 'codigo_acesso_hash')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN codigo_acesso_hash TEXT')
}
if (!colunasAtuais.some((coluna) => coluna.name === 'organizacao_id')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN organizacao_id INTEGER')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS organizacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    administrador_id INTEGER
  )
`)

const colunasOrganizacoes = db.pragma('table_info(organizacoes)')
if (!colunasOrganizacoes.some((coluna) => coluna.name === 'administrador_id')) {
  db.exec('ALTER TABLE organizacoes ADD COLUMN administrador_id INTEGER')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    setor TEXT,
    prioridade TEXT,
    descricao TEXT NOT NULL,
    usuario TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aberto',
    criado_em TEXT NOT NULL,
    atendente TEXT,
    iniciado_em TEXT,
    organizacao_id INTEGER
  )
`)

const colunasChamados = db.pragma('table_info(chamados)')
if (!colunasChamados.some((coluna) => coluna.name === 'atendente')) {
  db.exec('ALTER TABLE chamados ADD COLUMN atendente TEXT')
}
if (!colunasChamados.some((coluna) => coluna.name === 'iniciado_em')) {
  db.exec('ALTER TABLE chamados ADD COLUMN iniciado_em TEXT')
}
if (!colunasChamados.some((coluna) => coluna.name === 'organizacao_id')) {
  db.exec('ALTER TABLE chamados ADD COLUMN organizacao_id INTEGER')
}

export default db