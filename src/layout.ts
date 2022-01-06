import { css, html, LitElement, property } from "lit-element";
import { CardConfigGroup, CardConfig, LovelaceCard, ViewConfig } from "./types";

class GridLayout extends LitElement {
  //export class BaseLayout extends LitElement {
  @property() cards: Array<LovelaceCard> = [];
  @property() index: number;
  @property() narrow: boolean;
  @property() hass;
  @property() lovelace: any;
  @property() _editMode: boolean = false;
  _editorLoaded = false;

  _config: ViewConfig;
  _mediaQueries: Array<MediaQueryList | null> = [];

  getCardElement(card: CardConfigGroup) {
    if (!this.lovelace?.editMode) return card.card;
    const wrapper = document.createElement("hui-card-options") as any;
    wrapper.hass = this.hass;
    wrapper.lovelace = this.lovelace;
    wrapper.path = [this.index, card.index];
    card.card.editMode = true;
    wrapper.appendChild(card.card);
    if (card.show === false) wrapper.style.border = "1px solid red";
    return wrapper;
  }

  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
  }

  async setConfig(config: ViewConfig) {
    this._config = { ...config };
    if (this._config.view_layout && this._config.layout === undefined) {
      // Maybe avoid a bit of confusion...
      this._config.layout = this._config.view_layout;
    }

    for (const card of this._config.cards) {
      if (typeof card.view_layout?.show !== "string" && card.view_layout?.show?.mediaquery) {
        const mq = window.matchMedia(`${card.view_layout.show.mediaquery}`);
        this._mediaQueries.push(mq);
        mq.addEventListener("change", () => this._placeCards());
      } else {
        this._mediaQueries.push(null);
      }
    }

    this._setGridStyles();
  }

  async updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("lovelace") && this.lovelace?.editMode != changedProperties.get("lovelace")?.editMode) {
      if (this.lovelace?.editMode && !this._editorLoaded) {
        this._editorLoaded = true;
        {
          // Load in editor elements
          const loader = document.createElement("hui-masonry-view");
          (loader as any).lovelace = { editMode: true };
          (loader as any).willUpdate(new Map());
        }
      }
      this.cards.forEach((c) => (c.editMode = this.lovelace?.editMode));
      this._editMode = this.lovelace?.editMode ?? false;
    }
    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      this._placeCards();
    }
  }

  async firstUpdated() {
    this._setGridStyles();
  }

  _setGridStyles() {
    const root = this.shadowRoot.querySelector("#root") as HTMLElement;
    console.log(root);
    if (root) {
      root.setAttribute("class", "layout-root");
      if (this._config.layout) {
        const style = document.createElement("style");
        style.innerHTML = this._config.layout.style;
        root.parentNode.insertBefore(style, root);
      }
    }
  }

  _shouldShow(card: LovelaceCard, config: CardConfig, index: number) {
    if (config.view_layout?.show === "always") return true;
    if (config.view_layout?.show === "never") return false;
    if (config.view_layout?.show?.sidebar === "shown" && (this.hass?.dockedSidebar === "auto" || this.narrow)) return false;
    if (config.view_layout?.show?.sidebar === "hidden" && this.hass?.dockedSidebar === "docked" && !this.narrow) return false;

    const mq = this._mediaQueries[index];
    if (!mq) return true;
    if (mq.matches) return true;
    return false;
  }

  _placeCards() {
    const root = this.shadowRoot.querySelector("#root");
    while (root.firstChild) root.removeChild(root.firstChild);
    let cards: CardConfigGroup[] = this.cards.map((card, index) => {
      const config = this._config.cards[index];
      return {
        card,
        config,
        index,
        show: this._shouldShow(card, config, index)
      };
    });

    for (const card of cards.filter((c) => this.lovelace?.editMode || c.show)) {
      const el = this.getCardElement(card);
      for (const [key, value] of Object.entries(card.config?.view_layout ?? {})) {
        if (key.startsWith("grid") || key === "place-self") el.style.setProperty(key, value as string);
      }
      root.appendChild(el);
    }
  }

  render() {
    if (!this.lovelace?.editMode === true) {
      var fab = html``;
    } else {
      var fab = html`
        <ha-fab .label=${"Add card"} extended @click=${this._addCard}>
          <ha-icon slot="icon" .icon=${"mdi:plus"}></ha-icon>
        </ha-fab>
      `;
    }

    return html` <div id="root"></div>
      ${fab}`;
  }

  static get styles() {
    return [
      css`
        ha-fab {
          position: sticky;
          float: right;
          right: calc(16px + env(safe-area-inset-right));
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 1;
        }

        :host {
          padding-top: 4px;
          height: 100%;
          box-sizing: border-box;
        }
        #root {
          display: grid;
          margin-left: 4px;
          margin-right: 4px;
          justify-content: stretch;
        }
        #root > * {
          margin: var(--masonry-view-card-margin, 4px 4px 8px);
        }
      `
    ];
  }
}

customElements.define("grid-layout", GridLayout);
