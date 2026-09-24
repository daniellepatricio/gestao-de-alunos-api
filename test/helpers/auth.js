import 'dotenv/config';
import { api } from './api.js';

// Credenciais padrão vêm do seed da API (src/database/seed.js) e podem ser
// sobrescritas pelo .env local ou pelas variáveis de ambiente da pipeline.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@escola.com';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'admin123';
const ALUNO_EMAIL = process.env.ALUNO_EMAIL || 'ana.souza@example.com';
const ALUNO_SENHA = process.env.ALUNO_SENHA || '123456';

// Retorna o corpo da resposta de login: { token, usuario: { id, nome, email, role } }.
export async function login(email, senha) {
  const resposta = await api()
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, senha });

  if (resposta.status !== 200) {
    throw new Error(`Falha no login de "${email}": ${resposta.status} ${JSON.stringify(resposta.body)}`);
  }

  return resposta.body;
}

export async function getToken(email, senha) {
  return (await login(email, senha)).token;
}

export async function loginComoAdmin() {
  return login(ADMIN_EMAIL, ADMIN_SENHA);
}

export async function loginComoAluno() {
  return login(ALUNO_EMAIL, ALUNO_SENHA);
}

// Retornam o valor pronto para o header Authorization ("Bearer <token>").
export async function comTokenDeAdmin() {
  return `Bearer ${(await loginComoAdmin()).token}`;
}

export async function comTokenDeAluno() {
  return `Bearer ${(await loginComoAluno()).token}`;
}
