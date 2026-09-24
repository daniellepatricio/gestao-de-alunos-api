let contador = 0;

export function novaDisciplina() {
  contador += 1;
  return {
    nome: `Disciplina Teste ${contador}`,
    codigo: `DISC-${Date.now()}-${contador}`,
    cargaHoraria: 40,
  };
}
