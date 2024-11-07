import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html } from 'https://da.live/deps/lit/dist/index.js';
import getStyle from 'https://da.live/nx/utils/styles.js';

const buttons = await getStyle(`https://da.live/nx/styles/buttons.css`);
const style = await getStyle(import.meta.url);

export default class MiloFileBrowser extends LitElement {
  static properties = {
    repo: { type: String },
    token: { type: String },
    currentPath: { type: String },
    items: { type: Array }
  };

  constructor() {
    super();
    this.currentPath = '/sukamat/da-milo-college';
    this.items = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [buttons, style];
    this.fetchItems(this.currentPath);  // Initial fetch
  }

  async daFetch(url, opts = {}) {
    opts.headers ||= {};    
    opts.headers.Authorization = `Bearer ${this.token}`;

    const resp = await fetch(url, opts);
    if (resp.status === 401) {
      console.log('Unauthorized access. Please check your access token.');
      return resp.status;
    }
    return resp;
  }

  // API call to fetch items based on the path
  async fetchItems(path) {    
    try {
      const response = await this.daFetch(`https://admin.da.live/list${path}`);
      this.items = await response.json();
      this.currentPath = path;
      this.requestUpdate();
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }

  // Opens the popup and fetches the list for the given path
  openPopup() {
    this.shadowRoot.querySelector('.popup').classList.add('active');
    this.fetchItems(this.currentPath);
  }

  // Closes the popup
  closePopup() {
    this.shadowRoot.querySelector('.popup').classList.remove('active');
  }

  // Handles breadcrumb navigation by setting path to selected folder
  handleBreadcrumbClick(event) {
    const clickedBreadcrumb = event.target.innerText;
    const pathSegments = this.currentPath.split('/').filter(segment => segment);
    const clickedIndex = pathSegments.indexOf(clickedBreadcrumb);
    const newPath = `/${pathSegments.slice(0, clickedIndex + 1).join('/')}`;
    this.fetchItems(newPath);    
  }

  // Updates the selection in the textarea
  selectItems() {
    const selectedItems = Array.from(this.shadowRoot.querySelectorAll('#itemsList input[type="checkbox"]:checked'))
      .map(input => input.value);
    this.shadowRoot.querySelector('#selectedItems').value = selectedItems.join('\n');
    this.closePopup();
  }

  // Render breadcrumbs
  renderBreadcrumbs() {
    const pathSegments = this.currentPath.split('/').filter(segment => segment);
    let accumulatedPath = '';
    return pathSegments.map((segment, index) => {
      accumulatedPath += `/${segment}`;
      return html`
        <span @click=${this.handleBreadcrumbClick}>${segment}</span>
        ${index < pathSegments.length - 1 ? html` / ` : ''}
      `;
    });
  }

  // Render items (folders and files) in the popup
  renderItems() {
    if (this.items.length === 0) {
      return html`<div class="empty-message">Empty folder</div>`;
    }
    return this.items.map(item => {
      const isFolder = !item.ext;
      return html`
        <div class="file-item">
          <input type="checkbox" value="${item.path}">
          ${isFolder 
            ? html`📁 <span class="folder-label" @click=${() => this.fetchItems(item.path)}>${item.name}</span> (Folder)` 
            : html`📄 ${item.name}`
          }
        </div>
      `;
    });
  }

  render() {
    return html`
      <h1>File and Folder Browser</h1>
      <textarea id="selectedItems" rows="6" cols="50" placeholder="Selected items will appear here..."></textarea><br><br>
      <button class="accent" @click=${this.openPopup}>Browse</button>
      <div class="popup">
          <h2>Select Files/Folders</h2>
          <div id="breadcrumbs" class="breadcrumbs">${this.renderBreadcrumbs()}</div>
          <div id="itemsList">${this.renderItems()}</div>
          <div class="actions">
              <button class="accent" @click=${this.selectItems}>Select</button>
              <button class="primary" @click=${this.closePopup}>Cancel</button>
          </div>
      </div>
    `;
  }
}

customElements.define('milo-filebrowser', MiloFileBrowser);

(async function init() {
  const { context, token } = await DA_SDK;
  const cmp = document.createElement('milo-filebrowser');
  cmp.repo = context.repo;
  cmp.token = token;
  document.body.appendChild(cmp);
})();
