document.addEventListener('DOMContentLoaded', () => {
    
    // --- HAMBURGER MENU LOGIC ---
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if(hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(n => n.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        }));
    }

    // --- FORM LOGIC (Only runs if form exists) ---
    const formElement = document.getElementById('surveyForm');
    
    if (formElement) {
        let currentStep = 1;
        const totalSteps = 4;

        const dom = {
            progressBar: document.getElementById('progressBar'),
            stepCounter: document.getElementById('stepCounter'),
            nextBtn: document.getElementById('nextBtn'),
            submitBtn: document.getElementById('submitBtn'),
            form: formElement
        };

        // Initialize UI
        updateUI();

        // Bind Events
        if (dom.nextBtn) dom.nextBtn.addEventListener('click', handleNext);
        if (dom.submitBtn) dom.submitBtn.addEventListener('click', handleSubmit);

        function updateUI() {
            const percentage = (currentStep / totalSteps) * 100;
            dom.progressBar.style.width = `${percentage}%`;
            dom.stepCounter.innerText = `${currentStep} / ${totalSteps}`;

            for (let i = 1; i <= totalSteps; i++) {
                const step = document.getElementById(`step${i}`);
                if (step) {
                    if (i === currentStep) step.classList.add('active');
                    else step.classList.remove('active');
                }
            }

            if (currentStep === totalSteps) {
                dom.nextBtn.classList.add('hidden');
                dom.submitBtn.classList.remove('hidden');
            } else {
                dom.nextBtn.classList.remove('hidden');
                dom.submitBtn.classList.add('hidden');
            }
        }

        function validateCurrentStep() {
            const stepElement = document.getElementById(`step${currentStep}`);
            let isValid = true;
            
            const inputs = stepElement.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
            inputs.forEach(input => {
                if (input.value.trim() === "") {
                    input.style.borderColor = "#D92323"; 
                    isValid = false;
                } else {
                    input.style.borderColor = "#ddd"; 
                }
            });

            const radioGroups = new Set();
            stepElement.querySelectorAll('input[type="radio"]').forEach(r => radioGroups.add(r.name));
            
            radioGroups.forEach(name => {
                const checked = stepElement.querySelector(`input[name="${name}"]:checked`);
                const firstInput = stepElement.querySelector(`input[name="${name}"]`);
                const container = firstInput ? firstInput.closest('.options-grid') : null;

                if (!checked) {
                    isValid = false;
                    if(container) container.style.border = "1px solid #D92323";
                } else {
                    if(container) container.style.border = "none";
                }
            });

            if (!isValid) alert("Please fill in all required fields to proceed.");
            return isValid;
        }

        function handleNext() {
            if (validateCurrentStep()) {
                if (currentStep < totalSteps) {
                    currentStep++;
                    updateUI();
                    document.querySelector('.form-wrapper-styled').scrollIntoView({ behavior: 'smooth' });
                }
            }
        }

        function handleSubmit(event) {
            event.preventDefault(); 
            if (validateCurrentStep()) {
                const originalBtnText = dom.submitBtn.innerText;
                dom.submitBtn.innerText = "Sending...";
                dom.submitBtn.disabled = true;

                const serviceID = 'service_1fu182t';
                const templateID = 'template_iy76y1a';

                emailjs.sendForm(serviceID, templateID, '#surveyForm')
                    .then(() => {
                        alert('Application Sent Successfully! We will be in touch.');
                        dom.submitBtn.innerText = "SENT";
                    }, (err) => {
                        alert('Failed to send. Please check your internet.');
                        console.error('EmailJS Error:', err);
                        dom.submitBtn.innerText = originalBtnText;
                        dom.submitBtn.disabled = false;
                    });
            }
        }
    }
});