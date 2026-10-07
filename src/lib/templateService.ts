import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface DrillTemplate {
  id: string;
  class_id: string;
  template_name: string;
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  set_size: number;
  created_at: string;
}

interface TemplateConfig {
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  set_size: number;
}

interface DrillTemplateRow {
  id: string;
  class_id: string;
  name: string;
  config_json: Json;
  created_at: string;
}

const fromRow = (row: DrillTemplateRow): DrillTemplate => {
  const cfg = (row.config_json ?? {}) as Partial<TemplateConfig>;
  return {
    id: row.id,
    class_id: row.class_id,
    template_name: row.name,
    qtypes: cfg.qtypes ?? [],
    difficulties: cfg.difficulties ?? [],
    pts: cfg.pts ?? [],
    set_size: cfg.set_size ?? 0,
    created_at: row.created_at,
  };
};

export const templateService = {
  async getTemplates(classId: string): Promise<DrillTemplate[]> {
    const { data, error } = await supabase
      .from('drill_templates')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(fromRow);
  },

  async saveTemplate(template: Omit<DrillTemplate, 'id' | 'created_at'>): Promise<DrillTemplate> {
    const config: TemplateConfig = {
      qtypes: template.qtypes,
      difficulties: template.difficulties,
      pts: template.pts,
      set_size: template.set_size,
    };
    const { data, error } = await supabase
      .from('drill_templates')
      .insert({
        class_id: template.class_id,
        name: template.template_name,
        config_json: config as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    return fromRow(data);
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('drill_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
