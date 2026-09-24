import { expect } from 'chai';
import { api } from '../helpers/api.js';
import { loginComoAluno } from '../helpers/auth.js';
import dados from '../data/trabalho.json' with { type: 'json' };

describe('Registrar Entrega de Trabalho', () => {
    const headersAuthorization = {};
    let alunoLogado;

    before(async () => {
        const { token, usuario } = await loginComoAluno();
        alunoLogado = usuario;
        headersAuthorization.aluno = `Bearer ${token}`;
        headersAuthorization.invalido = 'Bearer token-invalido';
    });

    // "proprio" no JSON indica o id do aluno que fez login.
    function resolverAlunoId(alunoId) {
        return alunoId === 'proprio' ? alunoLogado.id : alunoId;
    }

    function registrarEntrega(token, alunoId, trabalho) {
        const requisicao = api()
            .post(`/api/alunos/${alunoId}/trabalhos`)
            .set('Content-Type', 'application/json');

        if (token !== 'ausente') {
            requisicao.set('Authorization', headersAuthorization[token]);
        }

        return requisicao.send(trabalho);
    }

    dados.entregaComSucesso.forEach((cenario) => {
        it(cenario.descricao, async () => {
            const alunoId = resolverAlunoId(cenario.alunoId);

            const resposta = await registrarEntrega(cenario.token, alunoId, cenario.trabalho);

            expect(resposta.status).to.equal(cenario.statusEsperado);
            expect(resposta.body).to.have.property('id').that.is.a('string');
            expect(resposta.body.alunoId).to.equal(alunoId);
            expect(resposta.body.disciplinaId).to.equal(cenario.trabalho.disciplinaId);
            expect(resposta.body.titulo).to.equal(cenario.trabalho.titulo);
            expect(resposta.body.descricao).to.equal(cenario.trabalho.descricao ?? null);
            expect(resposta.body.status).to.equal('entregue');
            expect(resposta.body.nota).to.be.null;
            expect(resposta.body.feedback).to.be.null;
        });
    });

    dados.entregaComFalha.forEach((cenario) => {
        it(cenario.descricao, async () => {
            const alunoId = resolverAlunoId(cenario.alunoId);

            const resposta = await registrarEntrega(cenario.token, alunoId, cenario.trabalho);

            expect(resposta.status).to.equal(cenario.statusEsperado);
            expect(resposta.body.error).to.equal(cenario.mensagemEsperada);
        });
    });
});
