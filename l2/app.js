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

document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    selectReviewBtn.addEventListener('click', selectRandomReview);
    analyzeSentimentBtn.addEventListener('click', analyzeSentiment);
    countNounsBtn.addEventListener('click', countNouns);
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

function useSampleReviews() {
    reviews = sampleReviews;
    console.log('Using sample reviews:', reviews.length, 'reviews available');
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
    
    hideError();
    loadingElement.style.display = 'block';
    disableButtons(true);
    
    setTimeout(() => {
        const sentiment = analyzeSentimentLocal(currentReview);
        processSentiment(sentiment);
        loadingElement.style.display = 'none';
        disableButtons(false);
    }, 1000);
}

function countNouns() {
    if (!currentReview) {
        showError('Please select a review first');
        return;
    }
    
    hideError();
    loadingElement.style.display = 'block';
    disableButtons(true);
    
    setTimeout(() => {
        const nounCount = countNounsLocal(currentReview);
        processNouns(nounCount);
        loadingElement.style.display = 'none';
        disableButtons(false);
    }, 1000);
}

function analyzeSentimentLocal(text) {
    const positiveWords = ['amazing', 'excellent', 'outstanding', 'fantastic', 'wonderful', 'love', 'great', 'good', 'perfect', 'recommend', 'best', 'exceptional', 'delicious', 'refreshing'];
    const negativeWords = ['disappointed', 'poor', 'terrible', 'bad', 'broken', 'damaged', 'regret', 'harsh', 'gross', 'refused'];
    
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
}

function countNounsLocal(text) {
    const words = text.toLowerCase().split(/\s+/);
    const nounPattern = /^(?:[a-z]+ing|[a-z]+ed|[a-z]+s|product|quality|service|price|item|experience|customer|money|value|bottle|film|friend|daughter|child|formula|sample|water|pineapple|taste|smell|hint|coconut)$/;
    
    let nounCount = 0;
    words.forEach(word => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length > 2 && nounPattern.test(cleanWord)) {
            nounCount++;
        }
    });
    
    if (nounCount > 15) return 'high';
    if (nounCount >= 6) return 'medium';
    return 'low';
}

function processSentiment(sentiment) {
    if (sentiment === 'positive') {
        sentimentIcon.textContent = '👍';
        sentimentText.textContent = 'Positive';
    } else if (sentiment === 'negative') {
        sentimentIcon.textContent = '👎';
        sentimentText.textContent = 'Negative';
    } else {
        sentimentIcon.textContent = '❓';
        sentimentText.textContent = 'Neutral';
    }
}

function processNouns(level) {
    if (level === 'high') {
        nounIcon.textContent = '🟢';
        nounText.textContent = 'High';
    } else if (level === 'medium') {
        nounIcon.textContent = '🟡';
        nounText.textContent = 'Medium';
    } else {
        nounIcon.textContent = '🔴';
        nounText.textContent = 'Low';
    }
}

function resetResults() {
    sentimentIcon.textContent = '❓';
    sentimentText.textContent = 'Not analyzed';
    nounIcon.textContent = '❓';
    nounText.textContent = 'Not analyzed';
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
