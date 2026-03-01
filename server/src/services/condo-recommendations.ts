/**
 * Serviço de recomendações inteligentes para condomínios.
 * Mapeia áreas comuns e infraestrutura → categorias de serviço recomendadas.
 * Gera checklist de manutenções periódicas pré-definidas.
 */

// Categorias que priorizam profissionais de fim de semana/feriados
export const WEEKEND_PRIORITY_SLUGS = new Set([
  'salao-festas',
  'portaria',
  'vigilancia',
]);

// Mapeamento: tipo de área comum → slugs de categorias recomendadas
export const AREA_TO_CATEGORIES: Record<string, string[]> = {
  PISCINA: ['limpeza-piscina'],
  JARDIM: ['jardinagem'],
  SALAO_FESTAS: ['salao-festas', 'limpeza-geral'],
  ACADEMIA: ['servicos-gerais', 'manutencao-eletrica'],
  CHURRASQUEIRA: ['limpeza-geral'],
  HALL: ['limpeza-geral'],
  GARAGEM: ['limpeza-geral'],
  LAVANDERIA: ['limpeza-geral', 'manutencao-hidraulica'],
  PLAYGROUND: ['limpeza-geral'],
  SAUNA: ['limpeza-geral', 'manutencao-eletrica'],
  QUADRA: ['limpeza-geral', 'pintura'],
  BRINQUEDOTECA: ['limpeza-geral'],
  COWORKING: ['limpeza-geral', 'manutencao-eletrica'],
  PET_PLACE: ['limpeza-geral', 'dedetizacao'],
  OUTRO: ['servicos-gerais'],
};

// Razão do mapeamento para exibição ao usuário
export const AREA_REASONS: Record<string, string> = {
  PISCINA: 'Piscina detectada',
  JARDIM: 'Jardim detectado',
  SALAO_FESTAS: 'Salão de festas detectado',
  ACADEMIA: 'Academia detectada',
  CHURRASQUEIRA: 'Churrasqueira detectada',
  HALL: 'Hall de entrada detectado',
  GARAGEM: 'Garagem detectada',
  LAVANDERIA: 'Lavanderia detectada',
  PLAYGROUND: 'Playground detectado',
  SAUNA: 'Sauna detectada',
  QUADRA: 'Quadra esportiva detectada',
  BRINQUEDOTECA: 'Brinquedoteca detectada',
  COWORKING: 'Coworking detectado',
  PET_PLACE: 'Pet place detectado',
};

/**
 * Gera lista de slugs recomendados (sem duplicatas) baseado nas áreas e infraestrutura.
 */
export function getRecommendedSlugs(
  areaTypes: string[],
  condoData: { num_elevadores: number; tem_portaria: boolean }
): Map<string, string> {
  // Map: slug → reason
  const recommended = new Map<string, string>();

  // Mapear áreas → categorias
  for (const areaType of areaTypes) {
    const slugs = AREA_TO_CATEGORIES[areaType];
    if (slugs) {
      for (const slug of slugs) {
        if (!recommended.has(slug)) {
          recommended.set(slug, AREA_REASONS[areaType] || `Área ${areaType} detectada`);
        }
      }
    }
  }

  // Infraestrutura → categorias extras
  if (condoData.num_elevadores > 0) {
    recommended.set('manutencao-elevador', `${condoData.num_elevadores} elevador(es) detectado(s)`);
  }
  if (condoData.tem_portaria) {
    recommended.set('portaria', 'Portaria detectada');
  }

  // Sempre recomendar
  if (!recommended.has('seguros')) {
    recommended.set('seguros', 'Obrigatório por lei');
  }
  if (!recommended.has('manutencao-eletrica')) {
    recommended.set('manutencao-eletrica', 'Manutenção preventiva essencial');
  }
  if (!recommended.has('manutencao-hidraulica')) {
    recommended.set('manutencao-hidraulica', 'Manutenção preventiva essencial');
  }

  return recommended;
}

/**
 * Item de manutenção pré-definido para criação automática.
 */
export interface MaintenanceTemplate {
  name: string;
  description: string;
  frequency: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'BIENAL' | 'QUINQUENAL';
  category_slug: string;
  icon: string;
  is_mandatory: boolean;
  condition?: (areaTypes: string[], condo: { num_elevadores: number; tem_portaria: boolean }) => boolean;
}

/**
 * Templates de manutenções periódicas.
 */
export const MAINTENANCE_TEMPLATES: MaintenanceTemplate[] = [
  // ─── Obrigatórias (sempre) ───
  {
    name: 'Seguro Obrigatório',
    description: 'Seguro condominial obrigatório por lei (art. 1.346 do Código Civil)',
    frequency: 'ANUAL',
    category_slug: 'seguros',
    icon: 'shield-check',
    is_mandatory: true,
  },
  {
    name: 'Recarga de Extintores',
    description: 'Recarga e manutenção dos extintores de incêndio',
    frequency: 'ANUAL',
    category_slug: 'servicos-gerais',
    icon: 'fire-extinguisher',
    is_mandatory: true,
  },
  {
    name: 'Inspeção de Para-raios',
    description: 'Inspeção e manutenção do sistema de proteção contra descargas atmosféricas (SPDA)',
    frequency: 'ANUAL',
    category_slug: 'manutencao-eletrica',
    icon: 'flash',
    is_mandatory: true,
  },
  {
    name: 'Limpeza de Caixa d\'Água',
    description: 'Limpeza e higienização dos reservatórios de água potável',
    frequency: 'SEMESTRAL',
    category_slug: 'limpeza-caixa-agua',
    icon: 'water',
    is_mandatory: true,
  },
  {
    name: 'Dedetização',
    description: 'Controle de pragas: baratas, ratos, formigas, cupins',
    frequency: 'SEMESTRAL',
    category_slug: 'dedetizacao',
    icon: 'bug',
    is_mandatory: true,
  },
  // ─── Obrigatória condicional ───
  {
    name: 'Manutenção de Elevador',
    description: 'Manutenção preventiva mensal obrigatória (ABNT NBR 16083)',
    frequency: 'MENSAL',
    category_slug: 'manutencao-elevador',
    icon: 'elevator',
    is_mandatory: true,
    condition: (_areas, condo) => condo.num_elevadores > 0,
  },
  // ─── Recomendadas (sempre) ───
  {
    name: 'Limpeza de Calhas',
    description: 'Prevenção contra entupimentos e infiltrações',
    frequency: 'SEMESTRAL',
    category_slug: 'limpeza-geral',
    icon: 'water-outline',
    is_mandatory: false,
  },
  {
    name: 'Pintura de Fachada',
    description: 'Pintura externa e impermeabilização da fachada',
    frequency: 'QUINQUENAL',
    category_slug: 'pintura',
    icon: 'format-paint',
    is_mandatory: false,
  },
  {
    name: 'Impermeabilização',
    description: 'Impermeabilização de lajes, terraços e áreas molhadas',
    frequency: 'QUINQUENAL',
    category_slug: 'servicos-gerais',
    icon: 'shield-home',
    is_mandatory: false,
  },
  // ─── Recomendadas condicionais ───
  {
    name: 'Limpeza de Piscina',
    description: 'Tratamento de água, limpeza de bordas e casa de máquinas',
    frequency: 'MENSAL',
    category_slug: 'limpeza-piscina',
    icon: 'pool',
    is_mandatory: false,
    condition: (areas) => areas.includes('PISCINA'),
  },
  {
    name: 'Manutenção de Jardim',
    description: 'Poda, irrigação e manutenção paisagística',
    frequency: 'MENSAL',
    category_slug: 'jardinagem',
    icon: 'leaf',
    is_mandatory: false,
    condition: (areas) => areas.includes('JARDIM'),
  },
];

/**
 * Gera a lista de itens de manutenção aplicáveis ao condomínio.
 */
export function getApplicableMaintenanceItems(
  areaTypes: string[],
  condoData: { num_elevadores: number; tem_portaria: boolean }
): Omit<MaintenanceTemplate, 'condition'>[] {
  return MAINTENANCE_TEMPLATES
    .filter((t) => !t.condition || t.condition(areaTypes, condoData))
    .map(({ condition: _, ...rest }) => rest);
}
