class PolypathApp {
    constructor() {
        console.log('PolypathApp initializing...');
        this.initializeElements();
        this.bindEvents();
        this.currentWords = [];
        console.log('PolypathApp initialized successfully');
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
        
        // Log if any elements are missing
        const elements = {
            nativeLangSelect: this.nativeLangSelect,
            targetLangSelect: this.targetLangSelect,
            themeInput: this.themeInput,
            getWordsBtn: this.getWordsBtn,
            wordsContainer: this.wordsContainer,
            wordButtonsContainer: this.wordButtonsContainer,
            errorMessage: this.errorMessage,
            btnText: this.btnText,
            btnLoader: this.btnLoader,
            swapBtn: this.swapBtn
        };
        
        Object.entries(elements).forEach(([name, element]) => {
            if (!element) {
                console.error(`Missing element: ${name}`);
            }
        });
    }

    bindEvents() {
        console.log('Binding events...');
        
        // Enable/disable button based on form completion
        [this.nativeLangSelect, this.targetLangSelect, this.themeInput].forEach(element => {
            element.addEventListener('input', () => {
                console.log('Form input changed');
                this.validateForm();
            });
            element.addEventListener('change', () => {
                console.log('Form change event');
                this.validateForm();
            });
        });

        // Handle form submission
        this.getWordsBtn.addEventListener('click', (e) => {
            console.log('Generate Words button clicked!');
            console.log('Button disabled state:', this.getWordsBtn.disabled);
            e.preventDefault();
            this.fetchWords();
        });
        
        // Handle regenerate button
        if (this.regenerateBtn) {
            this.regenerateBtn.addEventListener('click', () => {
                console.log('Regenerate button clicked');
                this.fetchWords();
            });
        }
        
        // Handle language swap
        this.swapBtn.addEventListener('click', () => {
            console.log('Swap languages clicked');
            this.swapLanguages();
        });
        
        // Handle Enter key in theme input
        this.themeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.getWordsBtn.disabled) {
                console.log('Enter key pressed in theme input');
                this.fetchWords();
            }
        });
        
        console.log('Events bound successfully');
    }

    swapLanguages() {
        console.log('Swapping languages...');
        const nativeValue = this.nativeLangSelect.value;
        const targetValue = this.targetLangSelect.value;
        
        console.log('Before swap - Native:', nativeValue, 'Target:', targetValue);
        
        this.nativeLangSelect.value = targetValue;
        this.targetLangSelect.value = nativeValue;
        
        console.log('After swap - Native:', this.nativeLangSelect.value, 'Target:', this.targetLangSelect.value);
        
        this.validateForm();
    }

    validateForm() {
        const nativeValue = this.nativeLangSelect.value;
        const targetValue = this.targetLangSelect.value;
        
        console.log('Validating form - Native:', nativeValue, 'Target:', targetValue);
        
        const isValid = nativeValue && 
                       targetValue && 
                       nativeValue !== targetValue;
        
        console.log('Form is valid:', isValid);
        
        this.getWordsBtn.disabled = !isValid;
        
        // Show error if same languages selected
        if (nativeValue && targetValue && nativeValue === targetValue) {
            console.log('Same languages selected, showing error');
            this.showError('Please select different languages for source and target.');
        } else {
            this.hideError();
        }
    }

    async fetchWords() {
        console.log('=== FETCH WORDS STARTED ===');
        
        if (this.getWordsBtn.disabled) {
            console.log('Button is disabled, aborting fetch');
            return;
        }

        const nativeLang = this.nativeLangSelect.value;
        const targetLang = this.targetLangSelect.value;
        const theme = this.themeInput.value.trim();

        console.log('Request parameters:');
        console.log('- Native Language:', nativeLang);
        console.log('- Target Language:', targetLang);
        console.log('- Theme:', theme || '(empty - will use random words)');

        this.setLoadingState(true);
        this.hideError();

        const requestBody = {
            l1: nativeLang,
            tl: targetLang,
            theme: theme || 'basic vocabulary', // Provide fallback for empty theme
            count: 6 // Request exactly 6 words
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        try {
            console.log('Making fetch request to /.netlify/functions/getWords');
            
            const response = await fetch('/.netlify/functions/getWords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error text:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.error) {
                console.error('API returned error:', data.error);
                throw new Error(data.error);
            }

            if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
                console.error('Invalid or empty words array:', data.words);
                throw new Error('No words received from the server');
            }

            // Ensure we have exactly 6 words
            this.currentWords = data.words.slice(0, 6);
            if (this.currentWords.length < 6) {
                console.warn(`Only received ${this.currentWords.length} words instead of 6`);
            }
            
            console.log('Successfully received', this.currentWords.length, 'words');
            this.displayWords();

        } catch (error) {
            console.error('=== FETCH ERROR ===');
            console.error('Error object:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            this.showError(`Failed to get words: ${error.message}`);
        } finally {
            console.log('=== FETCH WORDS COMPLETED ===');
            this.setLoadingState(false);
        }
    }

    setLoadingState(loading) {
        console.log('Setting loading state:', loading);
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
        console.log('Displaying words:', this.currentWords);
        
        // Clear previous words
        this.wordButtonsContainer.innerHTML = '';
        
        // Create word buttons
        this.currentWords.forEach((wordPair, index) => {
            console.log(`Creating button ${index}:`, wordPair);
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
        
        console.log('Words displayed successfully');
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
            }
        });

        return button;
    }

    showError(message) {
        console.log('Showing error:', message);
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.wordsContainer.style.display = 'none';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        new PolypathApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});
