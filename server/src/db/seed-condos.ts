/**
 * Seed: Cadastra 10 condominios da planilha Condominios_Master.xlsx
 * Associa todos ao contratante@teste.com
 *
 * Uso: npx tsx src/db/seed-condos.ts
 */
import { db } from './index.js';
import { condos, users } from './schema.js';
import { eq } from 'drizzle-orm';

const CONDOS_DATA = [
  { cnpj: '00.056.855/0001-34', razao_social: 'CONDOMINIO EDIFICIO FORTALEZA', nome_fantasia: 'FORTALEZA', cep: '80630-010', endereco: 'RUA AUGUSTO DE MARI', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '00.225.213/0001-11', razao_social: 'CONDOMINIO EDIFICIO TIFFANY', nome_fantasia: 'TIFFANY', cep: '80250-210', endereco: 'AVENIDA SETE DE SETEMBRO', numero: '4079', cidade: 'CURITIBA', uf: 'PR', porte: 'M' as const },
  { cnpj: '00.395.492/0001-61', razao_social: 'CONDOMINIO EDIFICIO VERONA II', nome_fantasia: 'VERONA II', cep: '80610-100', endereco: 'RUA RIO GRANDE DO SUL', numero: '26', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '00.395.493/0001-06', razao_social: 'CONDOMINIO EDIFICIO VERONA I', nome_fantasia: 'VERONA I', cep: '80610-030', endereco: 'RUA AMAZONAS', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '00.445.796/0001-96', razao_social: 'CONDOMINIO EDIFICIO GALIA', nome_fantasia: 'GALIA', cep: '80060-270', endereco: 'RUA FLORIANO ESSENFELDER', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '00.473.059/0001-05', razao_social: 'CONDOMINIO EDIFICIO ANTHURIUM', nome_fantasia: 'ANTHURIUM', cep: '80620-280', endereco: 'RUA PROF LUIS CESAR', numero: '837', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '01.121.341/0001-88', razao_social: 'CONDOMINIO EDIFICIO FENIX', nome_fantasia: 'FENIX', cep: '80620-040', endereco: 'RUA ACRE', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'P' as const },
  { cnpj: '01.627.217/0001-99', razao_social: 'CONDOMINIO EDIFICIO CHEVALIER', nome_fantasia: 'CHEVALIER', cep: '80060-050', endereco: 'RUA NILO CAIRO', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'M' as const },
  { cnpj: '01.704.186/0001-22', razao_social: 'CONDOMINIO EDIFICIO VITAL BRASIL', nome_fantasia: 'VITAL BRASIL', cep: '80320-120', endereco: 'RUA VITAL BRASIL', numero: 'S/N', cidade: 'CURITIBA', uf: 'PR', porte: 'M' as const },
  { cnpj: '01.850.356/0001-87', razao_social: 'CONDOMINIO RESIDENCIAL SANTA CANDIDA', nome_fantasia: 'SANTA CANDIDA', cep: '82630-496', endereco: 'RUA ALEXANDRE NADOLNY', numero: '99', cidade: 'CURITIBA', uf: 'PR', porte: 'M' as const },
];

async function seedCondos() {
  console.log('🏢 Cadastrando 10 condominios...\n');

  const [contratante] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'contratante@teste.com'))
    .limit(1);

  if (!contratante) {
    console.error('❌ contratante@teste.com nao encontrado! Rode o seed principal primeiro.');
    process.exit(1);
  }

  let ok = 0, skip = 0;

  for (const c of CONDOS_DATA) {
    const [exists] = await db.select({ id: condos.id }).from(condos).where(eq(condos.cnpj, c.cnpj)).limit(1);
    if (exists) { console.log(`⏩ ${c.nome_fantasia} - ja existe`); skip++; continue; }

    await db.insert(condos).values({ user_id: contratante.id, ...c });
    console.log(`✅ ${c.nome_fantasia} (${c.cnpj})`);
    ok++;
  }

  console.log(`\n📊 ${ok} inseridos, ${skip} ja existiam`);
  process.exit(0);
}

seedCondos().catch((e) => { console.error('❌', e); process.exit(1); });
