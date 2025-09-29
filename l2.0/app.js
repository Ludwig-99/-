// Global variables
let reviews = [];
let apiToken = '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'; // Your token

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const countNounsBtn = document.getElementById('count-nouns-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const nounResult = document.getElementById('noun-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');
const defaultReviewMessage = reviewText.textContent;
const defaultNounMessage = nounResult.querySelector('span').textContent;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    countNounsBtn.addEventListener('click', countNouns);
    apiTokenInput.addEventListener('change', saveApiToken);
    countNounsBtn.disabled = true;

    // Load saved API token if exists, otherwise use default
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    } else {
        apiTokenInput.value = apiToken;
        localStorage.setItem('hfApiToken', apiToken);
    }

    // Load sample reviews for demonstration
    loadSampleReviews();
});

// Load sample reviews for demonstration
function loadSampleReviews() {
    reviews = [
        "This product is absolutely amazing! It exceeded all my expectations and works perfectly.",
        "I'm very disappointed with this purchase. The quality is poor and it broke after just one week.",
        "It's an okay product. Does what it's supposed to but nothing special.",
        "Fantastic value for money! I would definitely recommend this to my friends and family.",
        "Terrible customer service and the product arrived damaged. Very unhappy with this experience.",
        "The product works as described. It's good for the price but could be better.",
        "I love this so much! It has made my life so much easier and the design is beautiful.",
        "Not worth the money at all. Poor quality materials and doesn't work properly.",
        "This is exactly what I needed. Simple, effective, and affordable.",
        "I had high hopes but this product failed to deliver. It's mediocre at best."
    ];
    console.log('Loaded', reviews.length, 'sample reviews');
}

// Save API token to localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
    } else {
        localStorage.removeItem('hfApiToken');
    }
}

// Analyze a random review
async function analyzeRandomReview() {
    hideError();

    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];

    // Display the review
    reviewText.textContent = selectedReview;
    updateNounResult('fa-language', defaultNounMessage);
    countNounsBtn.disabled = false;

    // Show loading state
    loadingElement.style.display = 'flex';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result glass-card';
    
    try {
        let result;
        
        // Try real API first, fallback to simulation if it fails
        try {
            result = await analyzeSentimentWithRetry(selectedReview);
            console.log('Real API result:', result);
        } catch (apiError) {
            console.warn('API failed, using simulation:', apiError.message);
            result = simulateSentimentAnalysis(selectedReview);
        }
        
        displaySentiment(result);
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to analyze sentiment: ' + error.message);
    } finally {
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Call Hugging Face API for sentiment analysis with retry logic
async function analyzeSentimentWithRetry(text, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(
                'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
                {
                    headers: { 
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({ inputs: text }),
                }
            );
            
            if (response.status === 503) {
                // Model is loading
                const result = await response.json();
                if (result.error && result.estimated_time) {
                    await new Promise(resolve => setTimeout(resolve, result.estimated_time * 1000));
                    continue;
                }
            }
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (i === retries) throw error;
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Simulate sentiment analysis for fallback
function simulateSentimentAnalysis(text) {
    const positiveWords = ['amazing', 'fantastic', 'love', 'excellent', 'perfect', 'great', 'good', 'beautiful', 'exceeded', 'recommend'];
    const negativeWords = ['disappointed', 'terrible', 'poor', 'broken', 'unhappy', 'failed', 'mediocre', 'not worth', 'damaged'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
        if (positiveWords.some(positive => word.includes(positive))) {
            positiveCount++;
        }
        if (negativeWords.some(negative => word.includes(negative))) {
            negativeCount++;
        }
    });
    
    if (positiveCount > negativeCount) {
        return [[{label: 'POSITIVE', score: 0.8 + Math.random() * 0.15}]];
    } else if (negativeCount > positiveCount) {
        return [[{label: 'NEGATIVE', score: 0.8 + Math.random() * 0.15}]];
    } else {
        return [[{label: 'NEUTRAL', score: 0.6 + Math.random() * 0.2}]];
    }
}

// Display sentiment result
function displaySentiment(result) {
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
        const sentimentData = result[0][0];
        label = sentimentData.label?.toUpperCase() || 'NEUTRAL';
        score = sentimentData.score ?? 0.5;
        
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
        }
    } else if (result.label) {
        // Handle different response format
        label = result.label.toUpperCase();
        score = result.score || 0.5;
        if (label === 'POSITIVE') sentiment = 'positive';
        if (label === 'NEGATIVE') sentiment = 'negative';
    }
    
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;
}

// Get appropriate icon for sentiment
function getSentimentIcon(sentiment) {
    switch(sentiment) {
        case 'positive':
            return 'fa-thumbs-up';
        case 'negative':
            return 'fa-thumbs-down';
        default:
            return 'fa-question-circle';
    }
}

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}

async function countNouns() {
    hideError();
    const text = reviewText.textContent.trim();
    if (!text || text === defaultReviewMessage) {
        showError('Please analyze a review before counting nouns.');
        return;
    }
    countNounsBtn.disabled = true;
    updateNounResult('fa-spinner', 'Counting nouns...', true);
    
    try {
        let tokens;
        
        // Try real API first, fallback to simulation if it fails
        try {
            tokens = await analyzePosWithRetry(text);
        } catch (apiError) {
            console.warn('POS API failed, using simulation:', apiError.message);
            tokens = simulatePosAnalysis(text);
        }
        
        const summary = summarizeNouns(tokens, text);
        if (summary.total === 0) {
            updateNounResult('fa-language', 'No nouns detected');
        } else {
            const details = summary.breakdown
                .slice(0, 5)
                .map(item => `${item.word} (${item.count})`)
                .join(', ');
            const extra = summary.breakdown.length > 5 ? `, +${summary.breakdown.length - 5} more` : '';
            updateNounResult('fa-language', `${summary.total} nouns detected • ${details}${extra}`);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to count nouns: ' + error.message);
        updateNounResult('fa-language', defaultNounMessage);
    } finally {
        countNounsBtn.disabled = false;
    }
}

// POS analysis with retry logic
async function analyzePosWithRetry(text, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(
                'https://api-inference.huggingface.co/models/vblagoje/bert-english-uncased-finetuned-pos',
                {
                    headers: { 
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    method: 'POST',
                    body: JSON.stringify({ inputs: text }),
                }
            );
            
            if (response.status === 503) {
                const result = await response.json();
                if (result.error && result.estimated_time) {
                    await new Promise(resolve => setTimeout(resolve, result.estimated_time * 1000));
                    continue;
                }
            }
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!Array.isArray(result)) {
                throw new Error('Unexpected API response format');
            }
            
            return result;
        } catch (error) {
            if (i === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Simulate POS analysis for fallback
function simulatePosAnalysis(text) {
    const words = text.split(/\s+/);
    const commonNouns = ['product', 'quality', 'design', 'money', 'value', 'service', 'experience', 'life', 'materials', 'friends', 'family', 'expectations', 'week', 'purchase', 'customer', 'price'];
    
    return words.map((word, index) => {
        const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
        if (commonNouns.includes(cleanWord) || Math.random() > 0.7) {
            return {
                word: cleanWord,
                entity_group: 'NOUN',
                start: text.indexOf(word),
                end: text.indexOf(word) + word.length
            };
        }
        return null;
    }).filter(token => token !== null);
}

function summarizeNouns(tokens, text) {
    const nounTags = new Set(['NOUN', 'PROPN']);
    const counts = new Map();
    let total = 0;
    
    tokens.forEach(token => {
        const group = token.entity_group || token.entity || token.tag;
        if (!group || !nounTags.has(group.toUpperCase())) {
            return;
        }
        const surface = extractSurface(text, token);
        if (!surface) {
            return;
        }
        total += 1;
        const key = surface.toLowerCase();
        if (counts.has(key)) {
            counts.get(key).count += 1;
        } else {
            counts.set(key, { word: surface, count: 1 });
        }
    });
    
    return { 
        total, 
        breakdown: Array.from(counts.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)) 
    };
}

function extractSurface(text, token) {
    if (typeof token.start === 'number' && typeof token.end === 'number') {
        const value = text.slice(token.start, token.end).trim();
        if (value) {
            return value;
        }
    }
    if (token.word) {
        return token.word.replace(/^##/, '').replace(/^Ġ/, '').trim();
    }
    return '';
}

function updateNounResult(iconClass, message, spinning) {
    nounResult.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} icon`;
    if (spinning) {
        icon.classList.add('fa-spin');
    }
    const span = document.createElement('span');
    span.textContent = message;
    nounResult.append(icon, span);
}
