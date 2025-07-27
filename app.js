class PolypathApp {
  constructor() {
    this.nativeSelect = document.getElementById('native-language');
    this.targetSelect = document.getElementById('target-language');
    this.themeInput = document.getElementById('theme-input');
    this.button = document.getElementById('new-words-button');
    this.wordsContainer = document.getElementById('words-container');
    this.languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' }
    ];
    this.populateLanguageDropdowns();
    this.button.addEventListener('click', () => this.fetchWords());
  }

  populateLanguageDropdowns() {
    this.languages.forEach(lang => {
      const option1 = document.createElement('option');
      option1.value = lang.code;
      option1.textContent = lang.name;
      this.nativeSelect.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = lang.code;
      option2.textContent = lang.name;
      this.targetSelect.appendChild(option2);
    });
  }

  async fetchWords() {
    const l1 = this.nativeSelect.value;
    const tl = this.targetSelect.value;
    const theme = this.themeInput.value.trim();
    if (!l1 || !tl || !theme) {
      alert('Please select both languages and enter a theme.');
      return;
    }
    try {
      const response = await fetch('/.netlify/functions/getWords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ l1, tl, theme })
      });
      if (!response.ok) throw new Error('Failed to fetch words');
      const data = await response.json();
      this.displayWords(data.words || []);
    } catch (err) {
      console.error(err);
      alert('Error retrieving words. Please try again later.');
    }
  }

  displayWords(words) {
    this.wordsContainer.innerHTML = '';
    words.forEach(({ word, translation }) => {
      const button = document.createElement('button');
      button.className = 'word-button';
      button.textContent = word;
      button.addEventListener('click', function() {
        const current = this.textContent;
        this.textContent = current === word ? translation : word;
      });
      this.wordsContainer.appendChild(button);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PolypathApp();
});
