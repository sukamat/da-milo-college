// Import SDK
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html } from 'https://da.live/deps/lit/dist/index.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

// const nexter = await getStyle(`https://da.live/nx/styles/nexter.css`);
const buttons = await getStyle(`https://da.live/nx/styles/buttons.css`);
const style = await getStyle(import.meta.url);

export default class SampleApp extends LitElement {
  static properties = {
    // project: { type: String },
    repo: { type: String },
    token: { type: String },
    _count: { state: true },
    // actions: { type: Object },
    // parent: { type: Object },
  };

  constructor() {
    super();
    this._count = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [buttons, style];
  }

  get _title() {
    return this.shadowRoot.querySelector('h1');
  }

  handleClick(params) {
    this._count+=1;
    console.log(this._title);    
  }

  render() {
    return html`
      <h1>App - ${this.repo} ${this._count === 0 ? '': this._count}</h1> 
      <button @click=${this.handleClick} class="accent">Click</button>
    `;
  }
}

customElements.define('sample-app', SampleApp);

(async function init() {
  const { context, token, actions } = await DA_SDK;  
  const cmp = document.createElement('sample-app');
  cmp.repo = context.repo;
  cmp.token = token;
  document.body.appendChild(cmp);
}());
