// Global variables
let reviews = [];
let apiToken = '';

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Sample reviews data to use when TSV file is not available
const sampleReviews = [
    "This product is absolutely amazing! It exceeded all my expectations and works perfectly.",
    "I'm very disappointed with this purchase. The quality is poor and it broke after just one use.",
    "The item is okay for the price, but nothing special. It does what it's supposed to do.",
    "Outstanding quality and fantastic customer service. I would definitely recommend this to others!",
    "Terrible experience. The product arrived damaged and the company refused to provide a refund.",
    "It's a decent product that gets the job done. Not the best, but certainly not the worst either.",
    "I love this product! It has completely changed how I approach my daily tasks. Highly recommended!",
    "Poor quality materials and bad craftsmanship. I regret spending money on this item.",
    "The product works as described. It's a good value for the money I paid.",
    "Exceptional quality and attention to detail. This is exactly what I was looking for!"
];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load the TSV file
    loadReviews();
    
    // Set up event listeners
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('change', saveApiToken);
    
    // Load saved API token if exists
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// Load and parse the TSV file using Papa Parse
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
                    if (results.data && results.data.length > 0) {
                        reviews = results.data
                            .map(row => row.text)
                            .filter(text => text && text.trim() !== '');
                        console.log('Loaded', reviews.length, 'reviews from TSV file');
                    } else {
                        throw new Error('TSV file is empty or invalid');
                    }
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    useSampleReviews();
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            useSampleReviews();
        });
}

// Use sample reviews when TSV file is not available
function useSampleReviews() {
    reviews = sampleReviews;
    console.log('Using sample reviews:', reviews.length, 'reviews available');
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
function analyzeRandomReview() {
    hideError();
    
    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    
    // Display the review
    reviewText.textContent = selectedReview;
    
    // Show loading state
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    // Call Hugging Face API
    analyzeSentiment(selectedReview)
        .then(result => displaySentiment(result))
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to analyze sentiment: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
}

// Call Hugging Face API for sentiment analysis
async function analyzeSentiment(text) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const response = await fetch(
        'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english',
        {
            headers: headers,
            method: 'POST',
            body: JSON.stringify({ inputs: text })
        }
    );
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
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
