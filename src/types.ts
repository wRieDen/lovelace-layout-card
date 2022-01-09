import { LovelaceCard } from 'custom-card-helpers';

export interface CardConfig {
  type: string;
  view_layout?: {
    style?: string;
    script?: string;
    column?: number;
  };
}

export interface CardConfigGroup {
  card: LovelaceCard;
  config: CardConfig;
  index: number;
  generated: boolean;
}

export interface ViewConfig {
  title?: string;
  type?: string;
  cards?: Array<CardConfig>;
  view_layout?: {};
  layout?: {
    script?: string;
    script_hass?: string;
    style?: string;
    edit_style?: string;
    edit_top_style?: string;
    mediaquery?: Array<Record<string, any>>;
  };
}
