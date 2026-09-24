import mongoose from 'mongoose';

// Root hooks do Mocha: fecha a conexão com o MongoDB só depois que TODOS os
// arquivos de teste rodarem. Fechar dentro de um describe quebra os testes
// in-process (supertest(app)) dos arquivos executados na sequência.
export const mochaHooks = {
  async afterAll() {
    await mongoose.connection.close();
  },
};
