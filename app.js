class PolypathApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentWords = [];
    }

    initializeElements() {
        this.nativeLangSelect = document.getElementById('native-lang');
        this.targetLangSelect = document.getElementById('target-lang');
        this.themeInput = document.getElementById('theme-input');
        this.getWordsBtn = document.getElementById('get-words-btn');
        this.wordsContainer = document.getElementById('words-container');
        this.wordButtonsContainer = document.getElementById('word-buttons');
        this.errorMessage = document.getElementById('error-message');
        this.btnText = this.getWordsBtn.querySelector('.btn-text');
        this.btnLoader = this.getWordsBtn.querySelector('.btn-loader');
        this.swapBtn = document.getElementById('swap-languages');
        this.regenerateBtn = document.getElementById('regenerate-btn');
    }

    bindEvents() {
        // Enable/disable button based on form completion
        [this.nativeLangSelect, this.targetLangSelect, this.themeInput].forEach(element => {
            element.addEventListener('input', () => this.validateForm());
            element.addEventListener('change', () => this.validateForm());
        });

        // Handle form submission
        this.getWordsBtn.addEventListener('click', () => this.fetchWords());
        
        // Handle regenerate button
        if (this.regenerateBtn) {
            this.regenerateBtn.addEventListener('click', () => this.fetchWords());
        }
        
        // Handle language swap
        this.swapBtn.addEventListener('click', () => this.swapLanguages());
        
        // Handle Enter key in theme input
        this.themeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.getWordsBtn.disabled) {
                this.fetchWords();
            }
        });
    }

    swapLanguages() {
        const nativeValue = this.nativeLangSelect.value;
        const targetValue = this.targetLangSelect.value;
        
        this.nativeLangSelect.value = targetValue;
        this.targetLangSelect.value = nativeValue;
        
        this.validateForm();
    }

    validateForm() {
        const isValid = this.nativeLangSelect.value && 
                       this.targetLangSelect.value && 
                       this.nativeLangSelect.value !== this.targetLangSelect.value;
        
        this.getWordsBtn.disabled = !isValid;
        
        // Show error if same languages selected
        if (this.nativeLangSelect.value && this.targetLangSelect.value && 
            this.nativeLangSelect.value === this.targetLangSelect.value) {
            this.showError('Please select different languages for source and target.');
        } else {
            this.hideError();
        }
    }

    async fetchWords() {
        if (this.getWordsBtn.disabled) return;

        const nativeLang = this.nativeLangSelect.value;
        const targetLang = this.targetLangSelect.value;
        const theme = this.themeInput.value.trim() || ''; // Allow empty theme

        this.setLoadingState(true);
        this.hideError();

        try {
            const response = await fetch('/.netlify/functions/getWords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    l1: nativeLang,
                    tl: targetLang,
                    theme: theme
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
                throw new Error('No words received from the server');
            }

            this.currentWords = data.words;
            this.displayWords();

        } catch (error) {
            console.error('Error fetching words:', error);
            this.showError(`Failed to get words: ${error.message}`);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.btnText.style.display = 'none';
            this.btnLoader.style.display = 'flex';
            this.getWordsBtn.disabled = true;
        } else {
            this.btnText.style.display = 'flex';
            this.btnLoader.style.display = 'none';
            this.validateForm(); // Re-enable button if form is valid
        }
    }

    displayWords() {
        // Clear previous words
        this.wordButtonsContainer.innerHTML = '';
        
        // Create word buttons
        this.currentWords.forEach((wordPair, index) => {
            const button = this.createWordButton(wordPair, index);
            this.wordButtonsContainer.appendChild(button);
        });

        // Show the words container with animation
        this.wordsContainer.style.display = 'block';
        
        // Scroll to words container smoothly
        setTimeout(() => {
            this.wordsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }

    createWordButton(wordPair, index) {
        const button = document.createElement('button');
        button.className = 'word-btn';
        button.textContent = wordPair.target || 'Unknown word';
        button.setAttribute('aria-label', `${wordPair.target} - click to see translation`);
        
        let isFlipped = false;
        let flipTimeout;

        const flip = () => {
            if (flipTimeout) {
                clearTimeout(flipTimeout);
            }

            if (!isFlipped) {
                button.textContent = wordPair.native || 'Translation unavailable';
                button.classList.add('flipped');
                isFlipped = true;
                
                // Auto-flip back after 3 seconds
                flipTimeout = setTimeout(() => {
                    if (isFlipped) {
                        button.textContent = wordPair.target || 'Unknown word';
                        button.classList.remove('flipped');
                        isFlipped = false;
                    }
                }, 3000);
            } else {
                button.textContent = wordPair.target || 'Unknown word';
                button.classList.remove('flipped');
                isFlipped = false;
            }
        };

        const flipBack = () => {
            if (isFlipped && flipTimeout) {
                clearTimeout(flipTimeout);
                setTimeout(() => {
                    if (isFlipped) {
                        button.textContent = wordPair.target || 'Unknown word';
                        button.classList.remove('flipped');
                        isFlipped = false;
                    }
                }, 300);
            }
        };

        // Touch and click events
        button.addEventListener('click', flip);
        
        // Hover events for desktop (fixed the hover issue)
        button.addEventListener('mouseenter', () => {
            if (!('ontouchstart' in window)) { // Only on non-touch devices
                flip();
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!('ontouchstart' in window)) { // Only on non-touch devices
                flipBack();
