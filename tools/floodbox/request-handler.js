import { DA_ORIGIN, SUPPORTED_FILES } from './constants.js';
import { isEditableFile } from './utils.js';

class RequestHandler {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async daFetch(url, opts = {}) {
    opts.headers ||= {};
    if (this.accessToken) {
      opts.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const resp = await fetch(url, opts);
    if (resp.status === 401) {
      console.log('Unauthorized access. Please check your access token.');
      return resp.status;
    }
    return resp;
  }

  getFileType(type) {
    return SUPPORTED_FILES[type] || 'application/octet-stream';
  }

  getFileBlob(content, fileExt) {
    return isEditableFile(fileExt)
      ? new Blob([content], { type: this.getFileType(fileExt) })
      : content;
  }

  async createVersion(destinationFilePath) {
    const opts = {
      method: 'POST',
      body: JSON.stringify({ label: 'Auto created version by FloodBox App' }),
    };
    return await this.daFetch(
      `${DA_ORIGIN}/versionsource${destinationFilePath}`,
      opts
    );
  }

  async uploadFile(filePath, content, fileExt) {
    const fileBlob = this.getFileBlob(content, fileExt);
    const body = new FormData();
    body.set('data', fileBlob);
    const opts = { body, method: 'POST' };
    const path = `${DA_ORIGIN}/source${filePath}`;
    const resp = await this.daFetch(path, opts);
    console.log(`${resp.status} :: Uploaded content to ${filePath}`);
  }

  /**
   * Uploads the file to the destination path
   * @param {*} filePath Destination file path
   * @param {*} content File blob or text content
   * @param {*} fileExt File extension
   */
  async uploadContent(filePath, content, fileExt) {
    if (isEditableFile(fileExt)) {
      const resp = await this.createVersion(filePath);
      if (resp.ok) {
        await this.uploadFile(filePath, content, fileExt);
      }
    } else {
      await this.uploadFile(filePath, content, fileExt);
    }
  }
}

export default RequestHandler;
