import 'dotenv/config';

// SAFETY: Never run seed in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ SEED BLOQUEADO: Não é permitido rodar seed em produção.');
  process.exit(1);
}

import bcrypt from 'bcryptjs';
import { db } from './index.js';
import {
  users,
  professionalProfiles,
  professionalServices,
  serviceCategories,
  serviceEstimationParams,
  condos,
  condoAreas,
  bookings,
  reviews,
} from './schema.js';
import { eq } from 'drizzle-orm';

const categories = [
  { name: 'Limpeza Geral', slug: 'limpeza-geral', icon: 'broom', description: 'Limpeza de áreas comuns, halls, escadas e corredores' },
  { name: 'Limpeza de Piscina', slug: 'limpeza-piscina', icon: 'pool', description: 'Tratamento de água, limpeza de bordas e manutenção' },
  { name: 'Jardinagem', slug: 'jardinagem', icon: 'leaf', description: 'Poda, plantio, irrigação e manutenção de jardins' },
  { name: 'Manutenção Elétrica', slug: 'manutencao-eletrica', icon: 'zap', description: 'Reparos elétricos, troca de lâmpadas e instalações' },
  { name: 'Manutenção Hidráulica', slug: 'manutencao-hidraulica', icon: 'droplet', description: 'Reparos em encanamentos, torneiras e válvulas' },
  { name: 'Pintura', slug: 'pintura', icon: 'paintbrush', description: 'Pintura de paredes, grades, portões e áreas comuns' },
  { name: 'Limpeza de Vidros', slug: 'limpeza-vidros', icon: 'maximize', description: 'Limpeza de vidros, janelas e fachadas' },
  { name: 'Portaria', slug: 'portaria', icon: 'shield', description: 'Serviço de portaria e controle de acesso' },
  { name: 'Salão de Festas', slug: 'salao-festas', icon: 'party-popper', description: 'Limpeza e organização de salão de festas' },
  { name: 'Serviços Gerais', slug: 'servicos-gerais', icon: 'wrench', description: 'Manutenções diversas e pequenos reparos' },
];

// Profissionais de teste
const testProfessionals = [
  {
    email: 'carlos.silva@teste.com',
    full_name: 'Carlos Eduardo Silva',
    cpf: '11111111111',
    phone: '41999001001',
    bio: 'Profissional com 8 anos de experiência em limpeza condominial. Trabalho com dedicação e pontualidade.',
    hourly_rate: '45',
    service_radius_km: 20,
    avg_rating: 4.8,
    total_services: 127,
    fibonacci_level: 5,
    categorySlugs: ['limpeza-geral', 'limpeza-vidros', 'salao-festas'],
  },
  {
    email: 'ana.oliveira@teste.com',
    full_name: 'Ana Paula Oliveira',
    cpf: '22222222222',
    phone: '41999002002',
    bio: 'Especialista em jardinagem e paisagismo para condomínios. Formada em técnica agrícola.',
    hourly_rate: '55',
    service_radius_km: 15,
    avg_rating: 4.9,
    total_services: 89,
    fibonacci_level: 4,
    categorySlugs: ['jardinagem', 'limpeza-piscina'],
  },
  {
    email: 'rafael.santos@teste.com',
    full_name: 'Rafael Santos Pereira',
    cpf: '33333333333',
    phone: '41999003003',
    bio: 'Eletricista certificado NR-10. Atuo em instalações, manutenção preventiva e corretiva.',
    hourly_rate: '70',
    service_radius_km: 25,
    avg_rating: 4.7,
    total_services: 203,
    fibonacci_level: 6,
    categorySlugs: ['manutencao-eletrica', 'servicos-gerais'],
  },
  {
    email: 'maria.costa@teste.com',
    full_name: 'Maria Fernanda Costa',
    cpf: '44444444444',
    phone: '41999004004',
    bio: 'Pintora profissional com experiência em fachadas, áreas internas e externas de condomínios.',
    hourly_rate: '50',
    service_radius_km: 18,
    avg_rating: 4.6,
    total_services: 64,
    fibonacci_level: 3,
    categorySlugs: ['pintura', 'servicos-gerais', 'limpeza-geral'],
  },
  {
    email: 'joao.almeida@teste.com',
    full_name: 'João Pedro Almeida',
    cpf: '55555555555',
    phone: '41999005005',
    bio: 'Encanador com 12 anos de experiência. Especialista em reparos hidráulicos urgentes e preventivos.',
    hourly_rate: '65',
    service_radius_km: 30,
    avg_rating: 4.5,
    total_services: 156,
    fibonacci_level: 5,
    categorySlugs: ['manutencao-hidraulica', 'manutencao-eletrica'],
  },
  {
    email: 'patricia.lima@teste.com',
    full_name: 'Patricia Lima Souza',
    cpf: '66666666666',
    phone: '41999006006',
    bio: 'Zeladora profissional. Cuidado com áreas comuns, portaria e organização de salões de festas.',
    hourly_rate: '40',
    service_radius_km: 12,
    avg_rating: 4.9,
    total_services: 312,
    fibonacci_level: 7,
    categorySlugs: ['portaria', 'limpeza-geral', 'salao-festas', 'servicos-gerais'],
  },
  {
    email: 'lucas.ferreira@teste.com',
    full_name: 'Lucas Ferreira Neto',
    cpf: '77777777777',
    phone: '41999007007',
    bio: 'Técnico de piscinas certificado. Tratamento químico, limpeza e manutenção de equipamentos.',
    hourly_rate: '60',
    service_radius_km: 20,
    avg_rating: 4.3,
    total_services: 45,
    fibonacci_level: 2,
    categorySlugs: ['limpeza-piscina', 'jardinagem'],
  },
  {
    email: 'fernanda.rocha@teste.com',
    full_name: 'Fernanda Rocha',
    cpf: '88888888888',
    phone: '41999008008',
    bio: 'Profissional multifuncional. Limpeza de vidros em altura com rapel e equipamentos de segurança.',
    hourly_rate: '80',
    service_radius_km: 35,
    avg_rating: 4.8,
    total_services: 78,
    fibonacci_level: 4,
    categorySlugs: ['limpeza-vidros', 'limpeza-geral', 'pintura'],
  },
];

// Reviews de teste
const testReviews = [
  { rating: 5, comment: 'Excelente profissional! Pontual e muito dedicado.' },
  { rating: 5, comment: 'Trabalho impecável. Recomendo muito!' },
  { rating: 4, comment: 'Bom serviço, chegou no horário combinado.' },
  { rating: 5, comment: 'Superou minhas expectativas. Área ficou perfeita.' },
  { rating: 4, comment: 'Profissional competente. Voltaria a contratar.' },
  { rating: 3, comment: 'Serviço ok, mas poderia melhorar na comunicação.' },
  { rating: 5, comment: 'Melhor profissional que já contratei pelo app!' },
  { rating: 4, comment: 'Muito cuidadoso com os detalhes. Ótimo trabalho.' },
  { rating: 5, comment: 'Rápido, eficiente e muito educado.' },
  { rating: 4, comment: 'Resolveu o problema em pouco tempo. Muito bom!' },
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. Categories ─────────────────────────────────
  for (const cat of categories) {
    await db
      .insert(serviceCategories)
      .values(cat)
      .onConflictDoNothing({ target: serviceCategories.slug });
  }
  console.log(`✅ ${categories.length} categorias de serviço`);

  // Get category map (slug -> id)
  const allCategories = await db.select().from(serviceCategories);
  const catMap = new Map(allCategories.map((c) => [c.slug, c.id]));

  // ─── 2. Contratante de teste ────────────────────────
  const password_hash = await bcrypt.hash('teste123', 10);

  const [contratante] = await db
    .insert(users)
    .values({
      email: 'contratante@teste.com',
      password_hash,
      full_name: 'Laise Teste',
      cpf: '00000000000',
      phone: '41999000000',
      role: 'CONTRATANTE',
      is_verified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (contratante) {
    console.log(`✅ Contratante: contratante@teste.com / teste123`);

    // Create condo for contratante
    await db
      .insert(condos)
      .values({
        user_id: contratante.id,
        cnpj: '00000000000100',
        razao_social: 'Condomínio Teste Residencial',
        nome_fantasia: 'Residencial Teste',
        cep: '80010000',
        endereco: 'Rua XV de Novembro',
        numero: '100',
        cidade: 'Curitiba',
        uf: 'PR',
        num_torres: 2,
        num_unidades: 48,
        porte: 'M',
        latitude: -25.4284,
        longitude: -49.2733,
      });
    console.log(`✅ Condomínio de teste criado`);
  } else {
    console.log(`⏭️  Contratante já existia`);
  }

  // Get contratante ID (might already exist)
  const [contratanteUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'contratante@teste.com'))
    .limit(1);

  // ─── 3. Profissionais ───────────────────────────────
  let proCount = 0;
  const createdProfessionals: { userId: string; profileId: string; name: string }[] = [];

  for (const pro of testProfessionals) {
    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: pro.email,
        password_hash,
        full_name: pro.full_name,
        cpf: pro.cpf,
        phone: pro.phone,
        role: 'PROFISSIONAL',
        is_verified: true,
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (!newUser) continue;

    // Create professional profile
    const [profile] = await db
      .insert(professionalProfiles)
      .values({
        user_id: newUser.id,
        bio: pro.bio,
        hourly_rate: pro.hourly_rate,
        service_radius_km: pro.service_radius_km,
        avg_rating: pro.avg_rating,
        total_services: pro.total_services,
        fibonacci_level: pro.fibonacci_level,
        quiz_approved: true,
        quiz_approved_at: new Date(),
      })
      .returning();

    // Associate services/categories
    for (const slug of pro.categorySlugs) {
      const categoryId = catMap.get(slug);
      if (categoryId) {
        await db.insert(professionalServices).values({
          professional_id: profile.id,
          category_id: categoryId,
        });
      }
    }

    createdProfessionals.push({ userId: newUser.id, profileId: profile.id, name: pro.full_name });
    proCount++;
  }
  console.log(`✅ ${proCount} profissionais criados com serviços associados`);

  // ─── 4. Bookings + Reviews ──────────────────────────
  if (contratanteUser && createdProfessionals.length > 0) {
    // Get condo
    const [condo] = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, contratanteUser.id))
      .limit(1);

    if (condo) {
      let bookingCount = 0;
      let reviewCount = 0;

      for (let i = 0; i < createdProfessionals.length; i++) {
        const pro = createdProfessionals[i];

        // Get a category for this professional
        const [proService] = await db
          .select()
          .from(professionalServices)
          .where(eq(professionalServices.professional_id, pro.profileId))
          .limit(1);

        if (!proService) continue;

        // Create a completed booking
        const scheduledDate = `2026-02-${String(10 + i).padStart(2, '0')}`;
        const [booking] = await db
          .insert(bookings)
          .values({
            contratante_id: contratanteUser.id,
            profissional_id: pro.userId,
            condo_id: condo.id,
            category_id: proService.category_id,
            scheduled_date: scheduledDate,
            scheduled_start: '08:00',
            scheduled_end: '16:00',
            status: 'COMPLETED',
            hourly_rate: testProfessionals[i].hourly_rate,
            total_hours: 8,
            gross_amount: String(Number(testProfessionals[i].hourly_rate) * 8),
            platform_fee: String(Number(testProfessionals[i].hourly_rate) * 8 * 0.05),
            insurance_fee: '5.00',
            net_professional_amount: String(
              Number(testProfessionals[i].hourly_rate) * 8 * 0.95 - 5
            ),
            payment_status: 'PAID',
            contratante_confirmed: true,
            profissional_confirmed: true,
          })
          .returning();

        bookingCount++;

        // Create 1-2 reviews per professional
        const numReviews = i < 4 ? 2 : 1;
        for (let r = 0; r < numReviews; r++) {
          const reviewData = testReviews[(i * 2 + r) % testReviews.length];
          await db.insert(reviews).values({
            booking_id: booking.id,
            reviewer_id: contratanteUser.id,
            reviewed_id: pro.userId,
            rating: reviewData.rating,
            comment: reviewData.comment,
          });
          reviewCount++;
        }
      }

      console.log(`✅ ${bookingCount} bookings completos`);
      console.log(`✅ ${reviewCount} reviews criados`);
    }
  }

  // ─── 5. Service Estimation Params ──────────────────────
  const estimationParams = [
    { slug: 'limpeza-geral', m2_por_hora: 25, min_horas: 4, max_horas: 8, fator: 1.0, desc: 'Limpeza de halls, escadas, corredores — 25m²/h' },
    { slug: 'limpeza-piscina', m2_por_hora: 50, min_horas: 2, max_horas: 6, fator: 1.2, desc: 'Piscina + bordas + casa de máquinas — 50m²/h' },
    { slug: 'jardinagem', m2_por_hora: 40, min_horas: 3, max_horas: 8, fator: 1.0, desc: 'Poda, plantio, irrigação — 40m²/h' },
    { slug: 'manutencao-eletrica', m2_por_hora: 0, min_horas: 2, max_horas: 8, fator: 1.0, desc: 'Por chamado (não baseado em m²)' },
    { slug: 'manutencao-hidraulica', m2_por_hora: 0, min_horas: 2, max_horas: 8, fator: 1.0, desc: 'Por chamado (não baseado em m²)' },
    { slug: 'pintura', m2_por_hora: 15, min_horas: 4, max_horas: 10, fator: 1.3, desc: 'Pintura de paredes — 15m²/h (inclui preparação)' },
    { slug: 'limpeza-vidros', m2_por_hora: 20, min_horas: 3, max_horas: 8, fator: 1.5, desc: 'Vidros e janelas — 20m²/h (fator alto por altura)' },
    { slug: 'portaria', m2_por_hora: 0, min_horas: 6, max_horas: 12, fator: 1.0, desc: 'Turno de portaria (não baseado em m²)' },
    { slug: 'salao-festas', m2_por_hora: 30, min_horas: 2, max_horas: 6, fator: 1.0, desc: 'Limpeza e organização de salão — 30m²/h' },
    { slug: 'servicos-gerais', m2_por_hora: 0, min_horas: 2, max_horas: 8, fator: 1.0, desc: 'Manutenções diversas (não baseado em m²)' },
  ];

  let estCount = 0;
  for (const param of estimationParams) {
    const catId = catMap.get(param.slug);
    if (catId) {
      await db
        .insert(serviceEstimationParams)
        .values({
          category_id: catId,
          m2_por_hora: param.m2_por_hora,
          min_horas: param.min_horas,
          max_horas: param.max_horas,
          fator_complexidade: param.fator,
          descricao: param.desc,
        })
        .onConflictDoNothing({ target: serviceEstimationParams.category_id });
      estCount++;
    }
  }
  console.log(`✅ ${estCount} parâmetros de estimativa`);

  // ─── 6. Áreas comuns do condomínio de teste ───────────
  if (contratanteUser) {
    const [condo] = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, contratanteUser.id))
      .limit(1);

    if (condo) {
      // Atualizar condo com dados de metragem
      await db
        .update(condos)
        .set({
          metragem_total: 850,
          tem_portaria: true,
          num_andares_por_torre: 12,
          num_elevadores: 4,
          regras_lixo: 'Lixo orgânico: seg/qua/sex até 09h. Reciclável: ter/qui até 09h.',
          horario_mudanca: 'Segunda a sábado, 08h às 17h. Agendar com 48h de antecedência.',
          horario_obra: 'Segunda a sexta, 08h às 17h. Sábados, 08h às 12h. Proibido domingos e feriados.',
        })
        .where(eq(condos.id, condo.id));

      const testAreas = [
        { nome: 'Salão de Festas', metragem: 120, tipo: 'SALAO_FESTAS' as const, andar: 'Térreo' },
        { nome: 'Piscina Adulto', metragem: 200, tipo: 'PISCINA' as const, andar: 'Térreo' },
        { nome: 'Academia', metragem: 80, tipo: 'ACADEMIA' as const, andar: 'Térreo' },
        { nome: 'Churrasqueira', metragem: 60, tipo: 'CHURRASQUEIRA' as const, andar: 'Térreo' },
        { nome: 'Playground', metragem: 100, tipo: 'PLAYGROUND' as const, andar: 'Térreo' },
        { nome: 'Hall Torre A', metragem: 45, tipo: 'HALL' as const, andar: 'Térreo' },
        { nome: 'Hall Torre B', metragem: 45, tipo: 'HALL' as const, andar: 'Térreo' },
        { nome: 'Garagem Subsolo', metragem: 150, tipo: 'GARAGEM' as const, andar: 'Subsolo' },
        { nome: 'Jardim Central', metragem: 50, tipo: 'JARDIM' as const, andar: 'Térreo' },
      ];

      for (const area of testAreas) {
        await db.insert(condoAreas).values({
          condo_id: condo.id,
          nome: area.nome,
          metragem: area.metragem,
          tipo: area.tipo,
          andar: area.andar,
        });
      }
      console.log(`✅ ${testAreas.length} áreas comuns do condomínio de teste`);
    }
  }

  console.log('\n🌱 Seed completo!');
  console.log('\n📱 Contas de teste:');
  console.log('   Contratante: contratante@teste.com / teste123');
  console.log('   Profissional: carlos.silva@teste.com / teste123');
  console.log('   (todos os profissionais usam senha: teste123)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
