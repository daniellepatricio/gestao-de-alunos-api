import { expect } from 'chai';
import { api } from '../helpers/api.js';
import { novoAluno } from '../factories/alunosFactory.js';
import { getToken } from './utils.js';

describe('Login', () => {
    let token;

    before(async () => {
        token = await getToken('admin@escola.com', 'admin123');
    });

    it('deve negar o cadastro de um aluno quando ele já existe', async () => {
        const cadastroAlunoResposta = await api()
            .post('/api/admin/alunos')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nome: 'Ana Souza', 
                email: 'ana.souza@example.com', 
                matricula: '2024001',
                senha: '123456'
            });

        // Validar que ele foi cadastrado
        expect(cadastroAlunoResposta.status).to.equal(409);
        expect(cadastroAlunoResposta.body.error).to.equal('Já existe um aluno cadastrado com essa matrícula ou e-mail.');

    });

    it('deve cadastrar um novo aluno quando ele informar dados válidos', async () => {
        
        //Cadastrar novo aluno
        const aluno = novoAluno();

        const cadastroResposta = await api()
            .post('/api/admin/alunos')
            .set('Authorization', 'Bearer ' + token)
            .set('Content-Type', 'application/json')
            .send(aluno);
        
        //Validar se o status da resposta é 201 (Created)
        expect(cadastroResposta.status).to.equal(201);
        expect(cadastroResposta.body.nome).to.equal(aluno.nome);
        expect(cadastroResposta.body.email).to.equal(aluno.email);
        expect(cadastroResposta.body.matricula).to.equal(aluno.matricula);
    });
});
