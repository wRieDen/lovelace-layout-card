import { css, html, LitElement, property } from "lit-element";
import jQuery from "jquery";
import { CardConfigGroup, CardConfig, LovelaceCard, ViewConfig } from "./types";
import deepClone from 'deep-clone-simple';

class GridLayout extends LitElement {
  //export class BaseLayout extends LitElement {
  @property() cards: Array<LovelaceCard> = [];
  @property() index: number;
  @property() narrow: boolean;
  @property() hass;
  @property() lovelace: any;
  @property() _editMode = false;
  _editorLoaded = false;
  _config: ViewConfig;

  async setConfig(config: ViewConfig) {
    this._config = { ...config };
    if (this._config.view_layout && this._config.layout === undefined) {
      // Maybe avoid a bit of confusion...
      this._config.layout = this._config.view_layout;
    }
    this._setGridStyles();
  }

  async firstUpdated() {
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
      const root = this.shadowRoot.querySelector("#root");
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }
      const cards: CardConfigGroup[] = this.cards.map((card, index) => {
        const config = this._config.cards[index];
        return {
          card,
          config,
          index
        };
      });

      if (this._config.layout?.script) {
        eval(this._config.layout?.script);
      }

      for (const card of cards) {
        const div = document.createElement("div");
        const divid = `layout-card${card.index}`;
        
        div.setAttribute("id", divid);
        div.setAttribute("class", `layout-card`);
  
        for (const [key, value] of Object.entries(card.config?.view_layout ?? {})) {
          if (key.startsWith("grid") || key === "place-self") {
            div.style.setProperty(key, value as string);
          }
        }
        
        if (card.config?.view_layout?.style) {
          const style = document.createElement("style");
          style.innerHTML = card.config?.view_layout?.style.replace(/\$THIS/ig, '#' + divid);
          div.appendChild(style);
        }
  
        if (card.config?.view_layout?.script) {
          const script = document.createElement("script");
          script.innerHTML = card.config?.view_layout?.script.replace(/\$THIS/ig, divid);
          div.appendChild(script);
        }
  
        const divsub = document.createElement("div");
        divsub.setAttribute("id", divid+'-sub');
        divsub.setAttribute("class", `layout-card-sub`);
  
        const divcontent = document.createElement("div");
        divcontent.setAttribute("id", divid+'-content');
        divcontent.setAttribute("class", `layout-card-content`);
        
  
        if (!this.lovelace?.editMode) {
          divcontent.appendChild(card.card);
        } else {
          const wrapper = document.createElement("hui-card-options") as any;
          wrapper.hass = this.hass;
          wrapper.lovelace = this.lovelace;
          wrapper.path = [this.index, card.index];
          card.card.editMode = true;
          wrapper.appendChild(card.card);
          divcontent.appendChild(wrapper);
        }

        divsub.appendChild(divcontent)
        div.appendChild(divsub)
        root.appendChild(div);
        //console.dir(div);
        //console.log(div);
      }
    }
  }



  _setGridStyles() {
    const root = this.shadowRoot.querySelector("#root") as HTMLElement;
    console.log(root);
    if (root) {
      //root.setAttribute("id", "layout-root");
      root.setAttribute("class", "layout-root");
      if (this._config.layout?.style) {
        const style = document.createElement("style");
        style.innerHTML = this._config.layout.style;
        root.parentNode.insertBefore(style, root);
      }
      
    }
  }


  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
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
