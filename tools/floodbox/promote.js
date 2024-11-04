import { DA_ORIGIN } from './constants.js';
import RequestHandler from './request-handler.js';
import SearchReplace from './search-replace.js';
import { isEditableFile } from './utils.js';

const BATCH_SIZE = 100;

class Promote {
  constructor(accessToken, org, repo, expName, promoteType, files, callback) {
    this.accessToken = accessToken;
    this.org = org;
    this.repo = repo;
    this.expName = expName;
    this.promoteType = promoteType;
    this.filesToPromote = files;
    this.callback = callback;

    this.requestHandler = new RequestHandler(accessToken);
    const destRepo = repo.replace('-graybox', '');
    this.srcSitePath = `/${org}/${repo}`;
    this.destSitePath = `/${org}/${destRepo}`;
  }

  async promoteFiles() {
    // Process and promote the files
    console.log(`srcSitePath: ${this.srcSitePath} :: destSitePath: ${this.destSitePath}`);
    console.log(`\nStep#2 - Promoting files to ${this.destSitePath}...`);
    await this.promoteFilesInBatches(this.filesToPromote);
  }

  async processFile(file) {
    const response = await this.requestHandler.daFetch(`${DA_ORIGIN}/source${file.path}`);
    if (response.ok) {
      let content = isEditableFile(file.ext) ? await response.text() : await response.blob();
      if (file.ext === 'html') {
        const searchReplace = new SearchReplace({
          searchType: this.promoteType, org: this.org, repo: this.repo
        });
        content = searchReplace.searchAndReplace(content);
      }
      const destFilePath = file.path.replace(this.srcSitePath, this.destSitePath);
      console.log(`Promoting file: ${file.path} to ${destFilePath}`);
      const status = await this.requestHandler.uploadContent(destFilePath, content, file.ext);
      this.callback(status);
    } else {
      console.error(`Failed to fetch : ${response.status} :: ${file.path}`);
    }
  }

  async promoteFilesInBatches(filePaths) {
    for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
      const batch = filePaths.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((file) => this.processFile(file)));
    }
  }
}

function promoteFiles({ accessToken, org, repo, expName, promoteType, files, callback }) {
  const promoter = new Promote(accessToken, org, repo, expName, promoteType, files, callback);
  return promoter.promoteFiles();
}

export default promoteFiles;
