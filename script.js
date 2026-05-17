/* =========================================
   1. MOBILE MENU TOGGLE
   ========================================= */
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

/* =========================================
   2. HERO BANNER CAROUSEL
   ========================================= */
const slides = document.querySelectorAll('.carousel-slide');
let currentSlide = 0;

function nextSlide() {
    if (slides.length === 0) return;
    
    // Hide current slide
    slides[currentSlide].classList.remove('active');
    
    // Calculate next slide
    currentSlide = (currentSlide + 1) % slides.length;
    
    // Show next slide
    slides[currentSlide].classList.add('active');
}

if (slides.length > 0) {
    setInterval(nextSlide, 2000);
}

/* =========================================
   3. EMAIL SENDING LOGIC (EmailJS)
   ========================================= */
(function() {
    // YOUR PUBLIC KEY
    emailjs.init("vHqH83-pfvfXuaA0O"); 
})();

const contactForm = document.getElementById('inline-contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Stop page reload

        const submitBtn = this.querySelector('button');
        const originalText = submitBtn.innerText;
        
        // Show loading state
        submitBtn.innerText = 'SENDING...';
        submitBtn.style.opacity = '0.7';

        // Send email with your Service ID and Template ID
        emailjs.sendForm('service_1fu182t', 'template_cr8by4o', this)
            .then(() => {
                // Success
                submitBtn.innerText = 'MESSAGE SENT!';
                submitBtn.style.background = '#28a745'; // Green
                submitBtn.style.color = '#fff';
                submitBtn.style.opacity = '1';
                
                this.reset(); // Clear form inputs
                
                // Reset button after 3 seconds
                setTimeout(() => { 
                    submitBtn.innerText = originalText; 
                    submitBtn.style.background = ''; 
                    submitBtn.style.color = '';
                    submitBtn.style.opacity = '1';
                }, 3000);

            }, (err) => {
                // Error
                submitBtn.innerText = 'FAILED. TRY AGAIN.';
                submitBtn.style.background = 'red';
                console.log('FAILED...', err);
            });
    });
}