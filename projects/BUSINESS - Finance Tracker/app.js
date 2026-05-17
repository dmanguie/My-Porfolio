/* const firebaseConfig = {
    apiKey: "AIzaSyAqXo-5TbF3VLvSWjBwjM0Jxbh6cE-IlV8",
    authDomain: "finance-tracker-a5d1d.firebaseapp.com",
    projectId: "finance-tracker-a5d1d",
    storageBucket: "finance-tracker-a5d1d.firebasestorage.app",
    messagingSenderId: "410500222285",
    appId: "1:410500222285:web:eb4fd1c4b52e589facbb04",
    measurementId: "G-VNTQBT8BVX"
}; */

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let userSettings = { bizName: "My Business Suite", theme: "#FF5A5F", categories: ["Sale", "Expense", "Salary"], staff: [] };

// --- AUTH ---
window.handleAuth = async () => {
    let email = document.getElementById('auth-email').value;
    let pw = document.getElementById('auth-pw').value;
    if(email === "admin" && pw === "admin") { email = "admin@trial.com"; pw = "password123"; }
    try {
        await auth.signInWithEmailAndPassword(email, pw);
    } catch (err) {
        document.getElementById('auth-error').innerText = err.message;
    }
};

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').style.display = 'none';
        loadUserData();
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
});

window.logout = () => auth.signOut().then(() => window.location.reload());

// --- CORE FUNCTIONS ---
function loadUserData() {
    // SYNC SETTINGS (Name & Color)
    db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
        if(doc.exists()) {
            userSettings = doc.data();
            applySettings();
        } else {
            db.collection('users').doc(currentUser.uid).set(userSettings);
        }
    });

    // SYNC TRANSACTIONS
    db.collection('finance').where('uid', '==', currentUser.uid).orderBy('timestamp', 'desc').onSnapshot(snap => {
        let html = "", sales = 0, expenses = 0, debt = 0;
        snap.forEach(doc => {
            const t = doc.data();
            const isSale = t.type === "Sale";
            if(isSale) { sales += t.amount; if(t.status === "Debt") debt += t.amount; }
            else { expenses += t.amount; }
            html += `<tr><td>${t.date}</td><td><span class="category-tag">${t.type}</span></td><td>${t.item}</td><td style="color:${isSale?'#2ecc71':'var(--coral)'}">₱${t.amount.toLocaleString()}</td><td>${t.status}</td></tr>`;
        });
        document.getElementById('finance-body').innerHTML = html;
        document.getElementById('sales-val').innerText = "₱" + sales.toLocaleString();
        document.getElementById('debt-val').innerText = "₱" + debt.toLocaleString();
        document.getElementById('savings-val').innerText = "₱" + (sales - expenses).toLocaleString();
    });
}

function applySettings() {
    // Update Header Text
    document.getElementById('display-biz-name').innerText = (userSettings.bizName || "MY BUSINESS SUITE").toUpperCase();
    
    // Update Theme Color
    if (userSettings.theme) {
        document.documentElement.style.setProperty('--coral', userSettings.theme);
        document.getElementById('set-theme-color').value = userSettings.theme;
    }

    // Update Form Inputs
    document.getElementById('set-biz-name').value = userSettings.bizName || "";
    document.getElementById('type-select').innerHTML = (userSettings.categories || []).map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('category-list').innerHTML = (userSettings.categories || []).map(c => `<span class="category-tag">${c}</span>`).join('');
    document.getElementById('staff-list').innerHTML = (userSettings.staff || []).map(s => `<span class="category-tag">${s.name} (₱${s.rate})</span>`).join('');
}

// --- BUTTON ACTIONS ---
window.showPage = (p) => {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(p + '-page').style.display = 'block';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-' + p).classList.add('active');
};

window.saveSettings = async () => {
    const bizName = document.getElementById('set-biz-name').value;
    const theme = document.getElementById('set-theme-color').value;
    await db.collection('users').doc(currentUser.uid).update({ bizName, theme });
    alert("Profile Saved!");
};

window.addCategory = async () => {
    const val = document.getElementById('new-cat-name').value;
    if(!val) return;
    const cats = [...(userSettings.categories || []), val];
    await db.collection('users').doc(currentUser.uid).update({ categories: cats });
    document.getElementById('new-cat-name').value = "";
};

window.addStaffMember = async () => {
    const name = document.getElementById('staff-name-input').value;
    const rate = document.getElementById('staff-rate-input').value;
    if(!name || !rate) return;
    const staff = [...(userSettings.staff || []), { name, rate }];
    await db.collection('users').doc(currentUser.uid).update({ staff });
};

document.getElementById('finance-form').onsubmit = async (e) => {
    e.preventDefault();
    await db.collection('finance').add({
        uid: currentUser.uid,
        item: document.getElementById('itemName').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type-select').value,
        status: document.getElementById('status').value,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    });
    e.target.reset();
};