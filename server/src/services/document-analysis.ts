import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisResult {
  areas_comuns: {
    nome: string;
    metragem: number;
    tipo: string;
    andar?: string;
    observacoes?: string;
  }[];
  metragem_total: number;
  tem_portaria: boolean;
  num_andares_por_torre?: number;
  num_elevadores?: number;
  regras_lixo?: string;
  horario_mudanca?: string;
  horario_obra?: string;
  observacoes_gerais?: string;
}

const ANALYSIS_PROMPT = `Você é um assistente especializado em análise de documentos condominiais (convenção e regimento interno).

Analise o documento e extraia as seguintes informações de forma estruturada:

1. **Áreas comuns**: Lista de todas as áreas comuns mencionadas, com:
   - nome: Nome da área (ex: "Salão de Festas", "Piscina Adulto")
   - metragem: Metragem em m² (se mencionada, senão estime com base no contexto)
   - tipo: Uma das opções: SALAO_FESTAS, PISCINA, ACADEMIA, CHURRASQUEIRA, PLAYGROUND, QUADRA, JARDIM, HALL, GARAGEM, LAVANDERIA, SAUNA, BRINQUEDOTECA, COWORKING, PET_PLACE, OUTRO
   - andar: Localização (Térreo, Cobertura, Subsolo, etc.)
   - observacoes: Regras específicas daquela área

2. **Metragem total**: Soma de todas as áreas comuns em m²

3. **Portaria**: Se o condomínio tem portaria (true/false)

4. **Andares por torre**: Número de andares por torre

5. **Elevadores**: Número total de elevadores

6. **Regras de lixo**: Horários e regras para descarte de lixo

7. **Horário de mudança**: Regras e horários permitidos para mudanças

8. **Horário de obra**: Regras e horários permitidos para obras

9. **Observações gerais**: Qualquer outra informação relevante para prestadores de serviço

Responda APENAS com um JSON válido no formato:
{
  "areas_comuns": [...],
  "metragem_total": number,
  "tem_portaria": boolean,
  "num_andares_por_torre": number | null,
  "num_elevadores": number,
  "regras_lixo": "string" | null,
  "horario_mudanca": "string" | null,
  "horario_obra": "string" | null,
  "observacoes_gerais": "string" | null
}

Se alguma informação não estiver no documento, use null. Para metragens não mencionadas, faça uma estimativa razoável baseada no contexto do condomínio.`;

export async function analyzeCondoDocument(filePath: string): Promise<AnalysisResult> {
  const fileBuffer = await fs.readFile(filePath);
  const base64 = fileBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();

  // Determinar se é PDF ou imagem e montar o content block adequado
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

  let fileBlock: Anthropic.Messages.ContentBlockParam;
  if (isImage) {
    let imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
    if (ext === '.png') imageMediaType = 'image/png';
    else if (ext === '.webp') imageMediaType = 'image/webp';

    fileBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMediaType,
        data: base64,
      },
    };
  } else {
    fileBlock = {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    } as any;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          fileBlock,
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });

  // Extrair JSON da resposta
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Resposta da IA não contém texto');
  }

  // Limpar resposta (pode vir com ```json ... ```)
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const result: AnalysisResult = JSON.parse(jsonStr);
  return result;
}
