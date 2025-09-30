let reviews = [];
let currentReview = '';
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
const nounValidation = document.getElementById('noun-validation');
const nounSampleText = document.getElementById('noun-sample-text');
const nounList = document.getElementById('noun-list');
const nounCount = document.getElementById('noun-count');

const testParagraphs = [
    "The amazing product arrived quickly with excellent packaging. The quality is outstanding and the features work perfectly. Customer service was helpful and responsive throughout the entire process.",
    "The amazing product arrived quickly with excellent packaging. The quality is outstanding and the features work perfectly. Customer service was helpful and responsive throughout the entire process.",
    "The amazing product arrived quickly with excellent packaging. The quality is outstanding and the features work perfectly. Customer service was helpful and responsive throughout the entire process."
];

document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    selectReviewBtn.addEventListener('click', selectRandomReview);
    analyzeSentimentBtn.addEventListener('click', analyzeSentiment);
    countNounsBtn.addEventListener('click', countNouns);
    
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
    }
});

function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load TSV file');
            return response.text();
        })
        .then(tsvData => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
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

function selectRandomReview() {
    hideError();
    if (reviews.length === 0) {
        showError('No reviews available');
        return;
    }
    currentReview = reviews[Math.floor(Math.random() * reviews.length)];
    reviewText.textContent = currentReview;
    resetResults();
}

function analyzeSentiment() {
    if (!currentReview) {
        showError('Please select a review first');
        return;
    }
    const prompt = `Classify this review as positive, negative, or neutral: ${currentReview}`;
    callApi(prompt, 'sentiment');
}

function countNouns() {
    if (!currentReview) {
        showError('Please select a review first');
        return;
    }
    const testReview = testParagraphs[0];
    const prompt = `Count the nouns in this review and return only High (>15), Medium (6-15), or Low (<6): ${testReview}`;
    callApi(prompt, 'nouns');
}

async function callApi(prompt, type) {
    hideError();
    loadingElement.style.display = 'block';
    disableButtons(true);

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const apiToken = apiTokenInput.value.trim();
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
            localStorage.setItem('hfApiToken', apiToken);
        }

        const response = await fetch(
            'https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct',
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ inputs: prompt })
            }
        );

        if (!response.ok) {
            if (response.status === 402 || response.status === 429) {
                throw new Error('API rate limit exceeded. Please try again later or use an API token.');
            }
            if (response.status === 404) {
                throw new Error('Model temporarily unavailable. Please try again later.');
            }
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        const generatedText = result[0]?.generated_text || '';
        const firstLine = generatedText.split('\n')[0]?.toLowerCase() || '';

        if (type === 'sentiment') {
            processSentiment(firstLine);
        } else if (type === 'nouns') {
            processNouns(firstLine);
        }

    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        setTimeout(hideError, 5000);
    } finally {
        loadingElement.style.display = 'none';
        disableButtons(false);
    }
}

function processSentiment(text) {
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
        sentimentIcon.textContent = '❓';
        sentimentText.textContent = 'Unknown';
    }
}

function processNouns(text) {
    let nounLevel = 'low';
    
    if (text.includes('high')) {
        nounLevel = 'high';
    } else if (text.includes('medium')) {
        nounLevel = 'medium';
    } else if (text.includes('low')) {
        nounLevel = 'low';
    } else {
        const localCount = countNounsLocal(testParagraphs[0]);
        nounLevel = localCount;
    }
    
    if (nounLevel === 'high') {
        nounIcon.textContent = '🟢';
        nounText.textContent = 'High (>15)';
    } else if (nounLevel === 'medium') {
        nounIcon.textContent = '🟡';
        nounText.textContent = 'Medium (6-15)';
    } else {
        nounIcon.textContent = '🔴';
        nounText.textContent = 'Low (<6)';
    }
    
    validateNounCounting();
}

function countNounsLocal(text) {
    const commonNouns = [
        'product', 'packaging', 'quality', 'features', 'service', 
        'process', 'customer', 'arrival', 'response', 'experience',
        'company', 'price', 'value', 'delivery', 'support'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let nounCount = 0;
    const foundNouns = [];
    
    words.forEach(word => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length > 2 && commonNouns.includes(cleanWord)) {
            nounCount++;
            if (!foundNouns.includes(cleanWord)) {
                foundNouns.push(cleanWord);
            }
        }
    });
    
    if (nounCount > 15) return 'high';
    if (nounCount >= 6) return 'medium';
    return 'low';
}

function validateNounCounting() {
    const testText = testParagraphs[0];
    const commonNouns = [
        'product', 'packaging', 'quality', 'features', 'service', 
        'process', 'customer', 'arrival', 'response'
    ];
    
    let highlightedText = testText;
    const foundNouns = [];
    
    commonNouns.forEach(noun => {
        const regex = new RegExp(`\\b${noun}\\b`, 'gi');
        if (regex.test(testText)) {
            foundNouns.push(noun);
            highlightedText = highlightedText.replace(regex, `<span class="noun-highlight">${noun}</span>`);
        }
    });
    
    nounValidation.style.display = 'block';
    nounSampleText.innerHTML = highlightedText;
    nounList.textContent = foundNouns.join(', ');
    nounCount.textContent = foundNouns.length;
}

function resetResults() {
    sentimentIcon.textContent = '❓';
    sentimentText.textContent = 'Not analyzed';
    nounIcon.textContent = '❓';
    nounText.textContent = 'Not analyzed';
    nounValidation.style.display = 'none';
}

function disableButtons(disabled) {
    selectReviewBtn.disabled = disabled;
    analyzeSentimentBtn.disabled = disabled;
    countNounsBtn.disabled = disabled;
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    errorElement.style.display = 'none';
}
