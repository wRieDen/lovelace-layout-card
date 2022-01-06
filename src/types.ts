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
  layout?: {};
  view_layout?: {};
}

// export interface ColumnViewConfig extends ViewConfig {
//   layout?: {
//     width?: number;
//     column_widths: string;
//     max_width?: number;
//     max_cols?: number;
//     min_height?: number;
//     rtl?: boolean;
//   };
// }

export interface GridViewConfig extends ViewConfig {
  layout?: {
    style?: string;
    mediaquery?: Array<Record<string, any>>;
  };
}

// export interface LayoutCardConfig {
//   cards?: Array<CardConfig>;
//   entities?: Array<CardConfig>;
//   layout_type?: string;
//   layout?: any;
//   layout_options?: any; // legacy
// }
