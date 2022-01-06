export interface LovelaceCard extends HTMLElement {
  hass: any;
  editMode?: boolean;
  setConfig(config: any): void;
  getCardSize?(): Promise<number> | number;
}

export interface CardConfig {
  type: string;
  view_layout?: {
    show?:
      | "always"
      | "never"
      | {
          mediaquery?: string;
          sidebar?: string;
        };
    column?: number;
  };
}

export interface CardConfigGroup {
  card: LovelaceCard;
  config: CardConfig;
  index: number;
  show?: boolean;
}

export interface ViewConfig {
  title?: string;
  type?: string;
  cards?: Array<CardConfig>;
  view_layout?: {};
  layout?: {
    style?: string;
    mediaquery?: Array<Record<string, any>>;
  };
}
