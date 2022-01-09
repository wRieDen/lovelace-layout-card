import { css, LitElement, html, customElement, property, TemplateResult, PropertyValues, state } from "lit-element";

import jQuery from "jquery";
import { CardConfigGroup, CardConfig, ViewConfig } from "./types";
import { computeCardSize, HomeAssistant, LovelaceCard } from "custom-card-helpers";
import deepClone from "deep-clone-simple";
import "custom-card-helpers";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class GridLayout extends LitElement {
  //export class BaseLayout extends LitElement {
  @property() cards: Array<LovelaceCard> = [];
  @property() index: number;
  @property() narrow: boolean;
  @property() hass;
  @property() lovelace: any;
  @property() _editMode = false;
  @state() private _helpers?: any;

  _editorLoaded = false;
  _config: ViewConfig;
  _initialized = false;
  _initializing = false;
  cardarr: CardConfigGroup[] = [];
  ext: any;
  forceupdate = false;

  constructor() {
    super();

    this.addEventListener("ll-rebuild", () => {
      console.log("layout-rebuild");
    });
  }

  async setConfig(config: ViewConfig) {
    this._config = { ...config };
    if (this._config.view_layout && this._config.layout === undefined) {
      // Maybe avoid a bit of confusion...
      this._config.layout = this._config.view_layout;
    }
    //this._initialize();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if(!this._initialized) {
      this._initialize();
      return false;
    }

    if (changedProps.has("_config")) {
      return true;
    }

    if (this._config) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (oldHass) {
        for (var state in oldHass.states) {
          if (Boolean(this.hass && oldHass.states[state] !== this.hass.states[state])) {
            return true;
          }
        }
        return false;
      }
    }

    return true;
  }

  async updated(changedProperties: Map<string, any>) {
    if(!this._initialized) {
      this._initialize();
      return
    }

    if ((changedProperties.has("lovelace") && this.lovelace?.editMode != changedProperties.get("lovelace")?.editMode) || this.forceupdate) {
      this.updateEditMode();
    }

    if (changedProperties.has("cards") || changedProperties.has("_editMode") || this.forceupdate) {
      this.rebuildGrid();
    }

    if (changedProperties.has("hass") || this.forceupdate) {
      //this.cardarr.forEach((c) => (c.card.editMode = this.lovelace?.editMode));
      this.cardarr.forEach((c) => (c.card.hass = this.hass));


      if (this._config.layout?.script_hass) {
        eval(this._config.layout?.script_hass);
      }
    }

    this.forceupdate = false;
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

  async _initialize() {
    if((!this._initialized) && (!this._initializing)){
      this._initializing = true;
      this._helpers = await (window as any).loadCardHelpers();

      var file = "/local/layout/imports.js";
      this.ext = new (await import(file)).default(this);

      await this._setGridStyles();

      this._initialized = true;
      this.forceupdate = true;
      this.requestUpdate();
    }
  }

  createCard(config: any) {
    var c = this._helpers.createCardElement(config);
    c.hass = this.hass;
    c.editMode = this._editMode;

    c.addEventListener("ll-rebuild", (ev) => {
      ev.stopPropagation();
    });

    var card = {
      card: c,
      config: config,
      index: this.cardarr.length,
      generated: true
    };

    return card;
  }

  addCard(config: any) {
    var card = this.createCard(config);
    this.cardarr.push(card);
    this.addCardNode(card)
    return card;
  }

  replaceCard(config: any, index: number) {
    this.cardarr = this.cardarr.filter((card) => card.index != index);
    var card = this.createCard(config);
    card.index = index;
    this.cardarr.push(card);
    this.replaceCardNode(card);
    return card;
  }

  removeCard(index) {
    this.cardarr = this.cardarr.filter((card) => card.index != index);
    this.removeCardNode(index);
  }


  createCardDiv(card: CardConfigGroup){
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
      style.innerHTML = card.config?.view_layout?.style.replace(/\$THIS/gi, "#" + divid);
      div.appendChild(style);
    }

    if (card.config?.view_layout?.script) {
      const script = document.createElement("script");
      script.innerHTML = card.config?.view_layout?.script.replace(/\$THIS/gi, divid);
      div.appendChild(script);
    }

    const divcontent = document.createElement("div");
    divcontent.setAttribute("id", divid + "-content");
    divcontent.setAttribute("class", `layout-card-content`);

    if (card.generated) {
      divcontent.classList.add(`generated-card`);
      div.classList.add(`generated-card`);
    }

    if (this.lovelace?.editMode) {
      divcontent.classList.add(`edit-mode-card`);
      div.classList.add(`edit-mode-card`);
    }

    if (!this.lovelace?.editMode || card.generated) {
      divcontent.appendChild(card.card);
    } else {
      const wrapper = document.createElement("hui-card-options") as any;
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index, card.index];
      this.waitForShadow(wrapper);

      card.card.editMode = true;
      wrapper.appendChild(card.card);
      divcontent.appendChild(wrapper);
    }

    div.appendChild(divcontent);
    return div;
  }

  addCardNode(card: CardConfigGroup) {
    const root = this.shadowRoot.querySelector("#root");
    root.appendChild(this.createCardDiv(card));
  }

  replaceCardNode(card: CardConfigGroup){
    const root = this.shadowRoot.querySelector("#root");
    const layout_card = root.querySelector(`#layout-card${card.index}`);
    //layout_card.remove();
    layout_card.replaceWith(this.createCardDiv(card));

    //this.removeCardNode(card.index);

  }

  removeCardNode(index: number){
    const root = this.shadowRoot.querySelector("#root");
    const layout_card = root.querySelector(`#layout-card${index}`);
    layout_card.remove();
  }

  waitForShadow(wrapper) {
    var self = this;
    if (wrapper.shadowRoot) {

      if (this._config?.layout?.edit_top_style) {
        const style = document.createElement("style");
        style.innerHTML = this._config?.layout?.edit_top_style;
        wrapper.shadowRoot.appendChild(style);
      }

      var actioncard = wrapper.shadowRoot.querySelector("ha-card");

      if (this._config?.layout?.edit_style) {
        const style = document.createElement("style");
        style.innerHTML = this._config?.layout?.edit_style;
        actioncard.appendChild(style);
      }
    } else {
      setTimeout(function () {
        self.waitForShadow(wrapper);
      }, 250);
    }
  }


  rebuildGrid(){
    const root = this.shadowRoot.querySelector("#root");
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    this.cardarr = [];
    for (var card of this.cards) {
      var index = this.cardarr.length;

      this.cardarr.push({
        card: card,
        config: this._config.cards[index],
        index: index,
        generated: false
      });
    }

    for (const card of this.cardarr) {
      this.addCardNode(card);
    }

    if (this._config.layout?.script) {
      eval(this._config.layout?.script);
    }
  }


  updateEditMode(){
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

  async _setGridStyles() {
    var root = null
    while (!root) {
      root = this.shadowRoot.querySelector("#root") as HTMLElement;
      await sleep(100);
    }
    //root.setAttribute("id", "layout-root");
    root.setAttribute("class", "layout-root");
    if (this._config.layout?.style) {
      const style = document.createElement("style");
      style.innerHTML = this._config.layout.style;
      root.parentNode.insertBefore(style, root);
    }
  }

  _addCard() {
    this.dispatchEvent(new CustomEvent("ll-create-card"));
  }


}

customElements.define("grid-layout", GridLayout);
