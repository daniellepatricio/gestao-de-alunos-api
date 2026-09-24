import { api } from '../helpers/api.js';
import { expect } from 'chai';

describe('Login', () => {
    
    it('deve retornar 200 quando o usuário e senha forem corretos', async () => {
        const loginResposta = await api()
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send({ 'email': 'admin@escola.com', 'senha': 'admin123' });
        
        expect(loginResposta.status).to.equal(200);
    });
    it('deve retornar 400 quando a senha não for informada', async () => {
        const loginResposta = await api()
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send({ 
                email: 'admin@escola.com', 
                senha: ''
            });
        
        expect(loginResposta.status).to.equal(400);
        expect(loginResposta.body.error).to.equal('Os campos "email" e "senha" são obrigatórios.');
    });
    it('deve retornar 401 quando o usuário estiver correto mas senha incorreta', async () => {
        const loginResposta = await api()
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send({ 
                email: 'admin@escola.com', 
                senha: 'admin4444'
            });
        
        expect(loginResposta.status).to.equal(401);
    });
});