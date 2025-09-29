// Global variables to store reviews and current selection
let reviews = [];
let currentReview = '';

// DOM element references for better performance and readability
const apiTokenInput = document.getElementById('api-token');
const selectReviewBtn = document.getElementById('select-review');
const analyzeSentimentBtn = document.getElementById('analyze-sentiment');
const countNounsBtn = document.getElementById('count-nouns');
const reviewText = document.getElementById('review-text');
const sentimentIcon = document.getElementById('sentiment-icon');
const sentimentText = document.getElementById('sentiment-text');
const nounIcon = document.getElementById('noun-icon');
const nounText = document.getElementById('noun-text');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    // Set up event listeners for all buttons
    selectReviewBtn.addEventListener('click', selectRandomReview);
    analyzeSentimentBtn.addEventListener('click', analyzeSentiment);
    countNounsBtn.addEventListener('click', countNouns);
});

// Load and parse TSV file using Papa Parse
function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load TSV file');
            return response.text();
        })
        .then(tsvData => {
            // Use Papa Parse to parse TSV data with header and tab delimiter
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
                    // Extract only the 'text' column and filter out empty values
                    reviews = results.data
                        .map(row => row.text)
                        .filter(text => text && text.trim() !== '');
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    showError('Failed to parse TSV file');
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            showError('Failed to load TSV file');
        });
}

// Select a random review from the loaded data
function selectRandomReview() {
    hideError();
    if (reviews.length === 0) {
        showError('No reviews available');
        return;
    }
    currentReview = reviews[Math.floor(Math.random() * reviews.length)];
    reviewText.textContent = currentReview;
    resetResults(); // Clear previous analysis results
}

// Analyze sentiment using Hugging Face API
function analyzeSentiment() {
    if (!currentReview) {
        showError('Please select a review first');
        return;
    }
    // Construct prompt for sentiment analysis
    const prompt = `Classify this review as positive, negative, or neutral: ${currentReview}`;
    callApi(prompt, 'sentiment');
}

// Count nouns using Hugging Face API
function countNouns() {
    if (!currentReview) {
        showError('Please select a review first');
        return;
    }
    // Construct prompt for noun counting with specific output format
    const prompt = `Count the nouns in this review and return only High (>15), Medium (6-15), or Low (<6): ${currentReview}`;
    callApi(prompt, 'nouns');
}

// Shared API call function for both sentiment and noun analysis
async function callApi(prompt, type) {
    hideError();
    loadingElement.style.display = 'block';
    disableButtons(true); // Prevent multiple simultaneous API calls

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Include API token if provided for authenticated requests
        const apiToken = apiTokenInput.value.trim();
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }

        // Call Hugging Face Inference API with Falcon model
        const response = await fetch(
            'https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct',
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ inputs: prompt })
            }
        );

        // Handle API errors including rate limits
        if (!response.ok) {
            if (response.status === 402 || response.status === 429) {
                throw new Error('API rate limit exceeded. Please try again later or use an API token.');
            }
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const generatedText = result[0]?.generated_text || '';
        // Extract first line and convert to lowercase for consistent parsing
        const firstLine = generatedText.split('\n')[0]?.toLowerCase() || '';

        // Route to appropriate processing function based on analysis type
        if (type === 'sentiment') {
            processSentiment(firstLine);
        } else if (type === 'nouns') {
            processNouns(firstLine);
        }

    } catch (error) {
        showError(error.message);
    } finally {
        // Always hide loading and re-enable buttons
        loadingElement.style.display = 'none';
        disableButtons(false);
    }
}

// Process sentiment API response and update UI
function processSentiment(text) {
    // Simple keyword matching for sentiment classification
    if (text.includes('positive')) {
        sentimentIcon.textContent = '👍';
        sentimentText.textContent = 'Positive';
    } else if (text.includes('negative')) {
        sentimentIcon.textContent = '👎';
        sentimentText.textContent = 'Negative';
    } else if (text.includes('neutral')) {
        sentimentIcon.textContent = '❓';
        sentimentText.textContent = 'Neutral';
    } else {
        // Fallback for unexpected responses
        sentimentIcon.textContent = '❓';
        sentimentText.textContent = 'Unknown';
    }
}

// Process noun count API response and update UI
function processNouns(text) {
    // Parse noun count level from API response
    if (text.includes('high')) {
        nounIcon.textContent = '🟢';
        nounText.textContent = 'High';
    } else if (text.includes('medium')) {
        nounIcon.textContent = '🟡';
        nounText.textContent = 'Medium';
    } else if (text.includes('low')) {
        nounIcon.textContent = '🔴';
        nounText.textContent = 'Low';
    } else {
        // Fallback for unexpected responses
        nounIcon.textContent = '❓';
        nounText.textContent = 'Unknown';
    }
}

// Reset analysis results when new review is selected
function resetResults() {
    sentimentIcon.textContent = '❓';
    sentimentText.textContent = 'Not analyzed';
    nounIcon.textContent = '❓';
    nounText.textContent = 'Not analyzed';
}

// Disable/enable all buttons during API calls
function disableButtons(disabled) {
    selectReviewBtn.disabled = disabled;
    analyzeSentimentBtn.disabled = disabled;
    countNounsBtn.disabled = disabled;
}

// Show error message to user
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}
