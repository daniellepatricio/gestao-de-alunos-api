import { expect } from 'chai';
import { api } from '../helpers/api.js';
import { comTokenDeAdmin, comTokenDeAluno } from '../helpers/auth.js';
import dados from '../data/aluno.json' with { type: 'json' };

// Garante e-mail/matrícula inéditos, para que o cenário de sucesso possa ser
// executado várias vezes contra o mesmo servidor sem cair no 409.
function comDadosUnicos(aluno) {
    const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [usuario, dominio] = aluno.email.split('@');
    return {
        ...aluno,
        email: `${usuario}.${sufixo}@${dominio}`,
        matricula: `${aluno.matricula}-${sufixo}`,
    };
}

describe('Cadastrar Aluno', () => {
    const headersAuthorization = {};

    before(async () => {
        headersAuthorization.admin = await comTokenDeAdmin();
        headersAuthorization.aluno = await comTokenDeAluno();
        headersAuthorization.invalido = 'Bearer token-invalido';
    });

    function cadastrarAluno(token, aluno) {
        const requisicao = api()
            .post('/api/admin/alunos')
            .set('Content-Type', 'application/json');

        if (token !== 'ausente') {
            requisicao.set('Authorization', headersAuthorization[token]);
        }

        return requisicao.send(aluno);
    }

    dados.cadastroComSucesso.forEach((cenario) => {
        it(cenario.descricao, async () => {
            const aluno = comDadosUnicos(cenario.aluno);

            const resposta = await cadastrarAluno(cenario.token, aluno);

            expect(resposta.status).to.equal(cenario.statusEsperado);
            expect(resposta.body).to.have.property('id').that.is.a('string');
            expect(resposta.body.nome).to.equal(aluno.nome);
            expect(resposta.body.email).to.equal(aluno.email);
            expect(resposta.body.matricula).to.equal(aluno.matricula);
            expect(resposta.body.role).to.equal('aluno');
            expect(resposta.body).to.not.have.property('senha');
        });
    });

    dados.cadastroComFalha.forEach((cenario) => {
        it(cenario.descricao, async () => {
            const resposta = await cadastrarAluno(cenario.token, cenario.aluno);

            expect(resposta.status).to.equal(cenario.statusEsperado);
            expect(resposta.body.error).to.equal(cenario.mensagemEsperada);
        });
    });
});
