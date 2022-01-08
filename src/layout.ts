import { css, LitElement, html, customElement, property, TemplateResult, PropertyValues, state } from 'lit-element';

import jQuery from "jquery";
import { CardConfigGroup, CardConfig, ViewConfig } from "./types";
import { computeCardSize, HomeAssistant, LovelaceCard } from 'custom-card-helpers';
import deepClone from 'deep-clone-simple';
import 'custom-card-helpers';

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
  cardarr: CardConfigGroup[] = [];

  constructor(){
    super();

    this.addEventListener("ll-rebuild", () => {
      console.log("layout-rebuild")
    });

  }

  testfunc(a){
    console.log("testfunc called");
    console.log(a);
  }

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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // if (!this._initialized) {
    //   this._initialize();
    // }

    if (changedProps.has('_config')) {
      return true;
    }

    if (this._config) {
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

      if (oldHass) {
        for (var state in oldHass.states) {
          if (Boolean(this.hass && oldHass.states[state] !== this.hass.states[state])) {
            console.log(state)
            return true;
          }
        }
        return false;
      }
    }

    return true;
  }

  
  addCard(config: any){
    var c = this._helpers.createCardElement(config)
    c.hass = this.hass

    c.addEventListener("ll-rebuild", (ev) => {
      ev.stopPropagation();
      this.testfunc("got ll")
    });

    this.cardarr.push({
      card: c,
      config: config,
      index: this.cardarr.length,
      generated: true,
    })

  }

  async updated(changedProperties: Map<string, any>) {
    if (!this._helpers) {
      this._helpers = await (window as any).loadCardHelpers();
    }

    console.log("updated:")
    console.log(changedProperties)

    // if (
    //   !this._cards ||
    //   (!changedProperties.has("hass") && !changedProperties.has("editMode"))
    // ) {
    //   return;
    // }

    for (const element of this.cardarr) {
      if (this.hass) {
        element.card.hass = this.hass;
      }
      if (this._editMode !== undefined) {
        element.card.editMode = this._editMode;
      }
    }

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
      
      console.dir(this.cards)
    }

    if (changedProperties.has("cards") || changedProperties.has("_editMode")) {
      const root = this.shadowRoot.querySelector("#root");
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }

      this.cardarr = []
      for(var card of this.cards){
        var index = this.cardarr.length;

        this.cardarr.push({
          card: card,
          config: this._config.cards[index],
          index: index,
          generated: false
        })
      }

      if (this._config.layout?.script) {
        eval(this._config.layout?.script);
      }






      for (const card of this.cardarr) {
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
  
        const divcontent = document.createElement("div");
        divcontent.setAttribute("id", divid+'-content');
        divcontent.setAttribute("class", `layout-card-content`);
        
        if (card.generated) {
          divcontent.classList.add(`generated-card`);
          div.classList.add(`generated-card`);
        }
        
        if (this.lovelace?.editMode ) {
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
          this.waitForShadow(wrapper)

          card.card.editMode = true;
          wrapper.appendChild(card.card);
          divcontent.appendChild(wrapper);
          
        }

        div.appendChild(divcontent)
        root.appendChild(div);
      }
    }
  }

  waitForShadow(wrapper){
    var self=this;
    if(wrapper.shadowRoot){
        console.log("got shadow")
        console.log(wrapper.shadowRoot)

        if (this._config?.layout?.edit_top_style) {
          const style = document.createElement("style");
          style.innerHTML = this._config?.layout?.edit_top_style;
          wrapper.shadowRoot.appendChild(style);
        }        

        var actioncard = wrapper.shadowRoot.querySelector('ha-card');
        console.log(actioncard)

        if (this._config?.layout?.edit_style) {
          const style = document.createElement("style");
          style.innerHTML = this._config?.layout?.edit_style;
          actioncard.appendChild(style);
        }
    }


    else{
        setTimeout(function() {
          self.waitForShadow(wrapper);
      }, 250);
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
}

customElements.define("grid-layout", GridLayout);
