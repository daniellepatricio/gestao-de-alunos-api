let contador = 0;

export function novoAluno() {
  contador += 1;
  return {
    nome: `Aluno Teste ${contador}`,
    email: `aluno.teste.${Date.now()}.${contador}@example.com`,
    matricula: `TESTE-${Date.now()}-${contador}`,
    senha: '123456',
  };
}
