import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from 'https://da.live/deps/lit/dist/index.js';
import getStyle from 'https://da.live/nx/utils/styles.js';
import { crawl } from 'https://da.live/nx/public/utils/tree.js';
import promoteFiles from '../promote.js';
import previewOrPublishPaths from '../bulk-action.js';
import { SUCCESS_CODES } from '../constants.js';

const buttons = await getStyle(`https://da.live/nx/styles/buttons.css`);
const style = await getStyle(import.meta.url);

export default class MiloFloodgate extends LitElement {
  static properties = {
    repo: { type: String },
    token: { type: String },
  };

  constructor() {
    super();
    this._canPromote = true;
    this._gbExpPath = '';
    this._startCrawl = false;
    this._startPromote = false;
    this._startPreviewPublish = false;
    this._filesCount = 0;
    this._promotedFilesCount = 0;
    this._promoteErrorCount = 0;
    this._previewedFilesCount = 0;
    this._publishedFilesCount = 0;
    this._crawledFiles = [];
    this._crawlDuration = 0;
    this._promoteDuration = 0;
    this._previewPublishDuration = 0;
    this._accessToken = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [buttons, style];
  }

  firstUpdated() {
    const input = this.shadowRoot.querySelector('input[name="path"]');
    if (input) {
      this._gbExpPath = input.value;
    }
  }

  getOrgRepoExp() {
    const input = this.shadowRoot.querySelector('input[name="path"]');
    const path = input.value.trim();
    const parts = path.split('/');
    return {
      org: parts[1],
      repo: parts[2],
      exp: parts[3],
    };
  }

  async startCrawl(experiencePath) {
    const { results, getDuration } = crawl({
      path: experiencePath,
      callback: () => {
        this._filesCount++;
        this.requestUpdate();
      },
      throttle: 10
    });
    this._crawledFiles = await results;
    this._filesCount = this._crawledFiles.length;
    this._crawlDuration = getDuration();
    this._startPromote = true;
    this.requestUpdate();
  }

  async startPromote() {
    const { org, repo, exp } = this.getOrgRepoExp();
    if (org && repo && exp && repo.endsWith('-graybox')) {
      const startTime = Date.now();
      await promoteFiles({
        accessToken: this.token,
        org,
        repo,
        expName: exp,
        promoteType: 'graybox',
        files: this._crawledFiles,
        callback: (status) => {
          SUCCESS_CODES.includes(status.statusCode) ? this._promotedFilesCount++ : this._promoteErrorCount++;            
          this.requestUpdate();
        }
      });
      this._promoteDuration = (Date.now() - startTime) / 1000;
      this._startPreviewPublish = true;
      this.requestUpdate();
    }
  }

  async startPreviewPublish(publish) {
    const { org, repo } = this.getOrgRepoExp();
    const startTime = Date.now();
    const paths = this._crawledFiles.map(file => file.path   );
    const repoToPrevPub = repo.replace('-graybox', '');
    const resp = await previewOrPublishPaths({
      org,
      repo: repoToPrevPub,
      paths,
      action: publish ? 'publish' : 'preview',
      callback: () => {
        this._previewedFilesCount++;
        this.requestUpdate();
      }
    });
    this._previewPublishDuration = (Date.now() - startTime) / 1000;
    console.log(resp);
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (!this._canPromote) {
      return;
    }
    // #1 - Start crawling
    this._startCrawl = true;
    await this.startCrawl(this._gbExpPath);

    // #2 - Start promoting
    this._startPromote = true;
    await this.startPromote();

    // #3 - Preview/publish promoted files
    this._startPreviewPublish = true;
    const publish = this.shadowRoot.querySelector('input[name="publish"]');
    console.log(`Checking publish: ${publish.checked}`);
    await this.startPreviewPublish(publish?.checked);
  }

  handleCancel(event) {
    event.preventDefault();
    const input = this.shadowRoot.querySelector('input[name="path"]');
    input.value = '';
    this._canPromote = false;
    this._gbExpPath = '';
    this.requestUpdate();
  }

  validateInput(event) {
    const input = event.target;
    const regex = /^\/[^\/]+\/[^\/]+-graybox\/[^\/]+$/;
    this._gbExpPath = input.value.trim();
    this._canPromote = regex.test(this._gbExpPath);
    this.requestUpdate();
  }

  renderPreviewPublishInfo() {
    return html`
      <div class="preview-publish-info info-box">
        <h2>Step 3: Preview/Publish Graybox Experience</h2>
        <p>Previewing and Publishing promoted files"... </p>
        <p>Files previewed: ${this._previewedFilesCount}</p>
        <p>Files published: ${this._publishedFilesCount}</p>
        <p class="${this._previewPublishDuration === 0 ? 'hide' : ''}">Duration: ~${this._previewPublishDuration} seconds</p>
      </div>
    `;
  }

  renderPromoteInfo() {
    return html`
      <div class="promote-info info-box">
        <h2>Step 2: Promote Graybox Experience</h2>
        <p>Promoting "${this._gbExpPath}"... </p>
        <p>Files to promote: ${this._filesCount}</p>
        <p>Files promoted: ${this._promotedFilesCount}</p>
        <p>Promote errors: ${this._promoteErrorCount}</p>
        <p class="${this._promoteDuration === 0 ? 'hide' : ''}">Duration: ~${this._promoteDuration} seconds</p>
      </div>
      ${this._startPreviewPublish ? this.renderPreviewPublishInfo() : nothing}
    `;
  }

  renderCrawlInfo() {
    return html`
      <div class="crawl-info info-box">
        <h2>Step 1: Crawl Graybox Experience</h2>
        <p>Crawling "${this._gbExpPath}" to promote... </p>
        <p>Files crawled: ${this._filesCount}</p>
        <p>Duration: ~${this._crawlDuration} seconds</p>
      </div>
      ${this._startPromote ? this.renderPromoteInfo() : nothing}
      `;
  }

  render() {
    return html`
      <h1>Graybox</h1>
      <form @submit=${this.handleSubmit}>
        <div class="input-row">          
          <input class="path" name="path" value="/sukamat/da-milo-college-graybox/bulk-2" @input=${this.validateInput} />
          <button class="accent" .disabled=${!this._canPromote}>Promote</button>
          <button class="primary" @click=${this.handleCancel}>Cancel</button> 
        </div>       
        <div class="checkbox-container">
          <input type="checkbox" id="publish" name="publish">
          <label for="publish">Publish files after promote?</label>
        </div>
      </form>
      ${this._startCrawl ? this.renderCrawlInfo() : nothing}
    `;
  }
}

customElements.define('milo-floodgate', MiloFloodgate);

(async function init() {
  const { context, token, actions } = await DA_SDK;
  const cmp = document.createElement('milo-floodgate');
  cmp.repo = context.repo;
  cmp.token = token;
  document.body.appendChild(cmp);
}());
