/**
 * Seed: Insere novas categorias de serviço
 * Uso: npx tsx src/db/seed-categories.ts
 */
import 'dotenv/config';
import { db } from './index.js';
import { serviceCategories } from './schema.js';
import { eq } from 'drizzle-orm';

const NEW_CATEGORIES = [
  {
    name: 'Manutenção de Elevador',
    slug: 'manutencao-elevador',
    icon: 'elevator',
    description: 'Manutenção preventiva e corretiva de elevadores',
  },
  {
    name: 'Seguros Condominiais',
    slug: 'seguros',
    icon: 'shield-check',
    description: 'Seguro obrigatório, incêndio, responsabilidade civil',
  },
  {
    name: 'Dedetização',
    slug: 'dedetizacao',
    icon: 'bug',
    description: 'Controle de pragas e dedetização periódica',
  },
  {
    name: 'Limpeza de Caixa d\'Água',
    slug: 'limpeza-caixa-agua',
    icon: 'water',
    description: 'Limpeza e higienização de reservatórios de água',
  },
  {
    name: 'Vigilância',
    slug: 'vigilancia',
    icon: 'eye',
    description: 'Vigilância patrimonial, rondas e segurança',
  },
];

async function seedCategories() {
  console.log('📂 Inserindo novas categorias de serviço...\n');

  let ok = 0, skip = 0;

  for (const cat of NEW_CATEGORIES) {
    const [exists] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.slug, cat.slug))
      .limit(1);

    if (exists) {
      console.log(`⏩ ${cat.name} — já existe`);
      skip++;
      continue;
    }

    await db.insert(serviceCategories).values(cat);
    console.log(`✅ ${cat.name} (${cat.slug})`);
    ok++;
  }

  console.log(`\n📊 ${ok} inseridas, ${skip} já existiam`);
  process.exit(0);
}

seedCategories().catch((e) => { console.error('❌', e); process.exit(1); });
