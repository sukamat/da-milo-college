class SearchReplace {
  constructor({ searchType, org, repo }) {
    this.searchType = searchType; // 'floodgate' or 'graybox'
    this.org = org;
    this.repo = repo;
    const repoSuffix = searchType === 'floodgate' ? 'pink' : 'graybox';
    this.destRepo = repo.replace(`-${repoSuffix}`, '');
  }

  searchAndReplace(content) {
    if (this.searchType === 'floodgate') {
      content = this.adjustUrlDomains(content);
    } else if (this.searchType === 'graybox') {
      content = this.adjustUrlDomains(content);
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      this.removeGrayboxStyles(doc); // Remove styles starting with 'gb-'
      this.removeGrayboxBlock(doc); // Remove graybox block
      content = doc.body.outerHTML;
    } else {
      console.error(`Unknown search type: ${this.searchType}`);
    }
    return content;
  }

  adjustUrlDomains(content) {
    const searchValue = `--${this.repo}--${this.org}`;
    const replaceValue = `--${this.destRepo}--${this.org}`;
    return content.replaceAll(searchValue, replaceValue);
  }

  removeGrayboxStyles(doc) {
    const elements = doc.querySelectorAll('[class*="gb-"]');
    elements.forEach((element) => {
      const classes = element.className.split(' ');
      const filteredClasses = classes.filter(
        (className) => !className.startsWith('gb-')
      );
      element.className = filteredClasses.join(' ');
    });
  }

  removeGrayboxBlock(doc) {
    const elements = doc.querySelectorAll('div.graybox');
    elements.forEach((element) => element.remove());
  }
}

export default SearchReplace;
