import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, updatePassword, updateEmail } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, onSnapshot } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBp-ZLjO-9szI_jA09ha6lLfdDfEBpSLkM",
  authDomain: "dmfurniture-93a59.firebaseapp.com",
  projectId: "dmfurniture-93a59",
  storageBucket: "dmfurniture-93a59.firebasestorage.app",
  messagingSenderId: "844358558442",
  appId: "1:844358558442:web:604ea44d6a15482ab0ad93",
  measurementId: "G-G1JJBT9CR7"
};

const ADMIN_UID = "fYRI62VjHCOrouraptbWotsvTwY2";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allProducts = [];
let orderUnsubscribe = null; 
let userOrders = []; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        updateUIForLogin(user);
        loadCart(); 
        subscribeToCustomerOrders();
        loadUserProfile(user.uid);
    } else {
        currentUser = null;
        updateUIForLogout();
        if(orderUnsubscribe) orderUnsubscribe(); 
    }
});

async function loadUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.phone) {
                const phoneInput = document.getElementById('accountPhone');
                const coPhoneInput = document.getElementById('coPhone');
                if(phoneInput) phoneInput.value = data.phone;
                if(coPhoneInput) coPhoneInput.value = data.phone;
            }
        }
    } catch(e) { console.error(e); }
}

const btnSignup = document.getElementById('btnSignup');
if(btnSignup) {
    btnSignup.addEventListener('click', async () => {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPass').value;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCredential.user, { displayName: name });
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: name, email: email, cart: [], orders: []
            });
            alert("Account Created! Welcome " + name);
            closeAuthModal();
        } catch (error) { alert("Error: " + error.message); }
    });
}

const btnLogin = document.getElementById('btnLogin');
if(btnLogin) {
    btnLogin.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            alert("Login Successful!");
            closeAuthModal();
        } catch (error) { alert("Login Failed: " + error.message); }
    });
}

const btnReset = document.getElementById('btnReset');
if(btnReset) {
    btnReset.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        if(!email) return alert("Please enter email");
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Reset link sent!");
            toggleAuth('login');
        } catch(e) { alert(e.message); }
    });
}

window.app = window.app || {};
window.app.logout = async () => {
    await signOut(auth);
    location.reload();
};

function updateUIForLogin(user) {
    const navAuthBtn = document.getElementById('navAuthBtn');
    if(navAuthBtn) navAuthBtn.style.display = 'none';
    
    const menuIcons = document.querySelector('.desktop-menu');
    if (user.uid === ADMIN_UID && menuIcons && !document.getElementById('navAdminBtn')) {
        const adminBtn = document.createElement('div');
        adminBtn.className = 'menu-item';
        adminBtn.id = 'navAdminBtn';
        adminBtn.innerHTML = `<i class="fas fa-tools"></i> <span>Admin</span>`;
        adminBtn.onclick = () => window.location.href = 'admin.html';
        menuIcons.insertBefore(adminBtn, menuIcons.firstChild);
    }
    
    if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = user.displayName || "Customer";
    if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;
    if(document.getElementById('coName')) document.getElementById('coName').value = user.displayName || "";
    if(document.getElementById('accountNewEmail')) document.getElementById('accountNewEmail').value = user.email;
}

function updateUIForLogout() {
    const navAuthBtn = document.getElementById('navAuthBtn');
    if(navAuthBtn) navAuthBtn.style.display = 'block';
    const adminBtn = document.getElementById('navAdminBtn');
    if(adminBtn) adminBtn.remove();
}

async function fetchProducts() {
    const container = document.getElementById('productGrid');
    if(!container) return;
    container.innerHTML = "Loading products...";
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        allProducts = [];
        querySnapshot.forEach((doc) => { allProducts.push({ id: doc.id, ...doc.data() }); });
        renderProducts(allProducts);
    } catch (error) { console.error(error); container.innerHTML = "Error loading products."; }
}

function renderProducts(products) {
    const container = document.getElementById('productGrid');
    if(products.length === 0) { container.innerHTML = "<p>No products found.</p>"; return; }
    
    container.innerHTML = products.map(p => {
        let displayPrice = `₱${Number(p.price).toLocaleString()}`;
        if(p.sizes && p.sizes.length > 0 && typeof p.sizes[0] === 'object') {
            const prices = p.sizes.map(s => s.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            if(min !== max) {
                displayPrice = `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
            } else {
                displayPrice = `₱${min.toLocaleString()}`;
            }
        }

        // UPDATED: Handle Multiple Images in Grid (Show first one)
        const displayImg = Array.isArray(p.img) ? p.img[0] : p.img;

        return `
        <div class="card" onclick="window.location.href='product.html?id=${p.id}'">
            <img src="${displayImg}" onerror="this.src='https://via.placeholder.com/300'">
            <div class="card-body">
                <div class="card-cat">${p.category}</div>
                <div class="card-title">${p.name}</div>
                <div class="card-price">${displayPrice}</div>
                <span style="font-size:0.8rem; color:var(--primary-coral);">View Details →</span>
            </div>
        </div>`;
    }).join('');
}

window.app.handleSearch = () => {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('searchCategory').value;
    const filtered = allProducts.filter(p => {
        const matchText = p.name.toLowerCase().includes(query);
        const matchCat = category === 'all' || p.category === category;
        return matchText && matchCat;
    });
    window.app.showSection('home');
    renderProducts(filtered);
};

window.app.addToCart = async (productId) => {
    if (!currentUser) {
        document.getElementById('authModal').classList.remove('modal-hidden');
        return;
    }
    try {
        const product = allProducts.find(p => p.id === productId);
        if(!product) return;

        // UPDATED: Ensure we only save the main image string to the cart
        const imgToSave = Array.isArray(product.img) ? product.img[0] : product.img;

        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            img: imgToSave, // Save single string
            color: "Standard",
            size: "Standard",
            qty: 1
        };

        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, { cart: arrayUnion(cartItem) }, { merge: true });
        alert("Item added to cart!");
        loadCart();
    } catch (error) { console.error(error); alert("Error: " + error.message); }
};

async function loadCart() {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const cartItems = docSnap.data().cart || [];
        const totalQty = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0);
        
        const desktopBadge = document.getElementById('cartCount');
        if(desktopBadge) desktopBadge.innerText = totalQty;

        const mobileBadge = document.getElementById('mobileCartCount');
        if(mobileBadge) {
            mobileBadge.innerText = totalQty;
            mobileBadge.style.display = totalQty > 0 ? 'block' : 'none';
        }

        renderCartHTML(cartItems);
    }
}

function renderCartHTML(cartItems) {
    const container = document.getElementById('cartContent');
    const checkoutContainer = document.getElementById('checkoutItems');
    if (!container) return;
    
    if (cartItems.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        if(checkoutContainer) checkoutContainer.innerHTML = "<p>No items.</p>";
        if(document.getElementById('checkoutTotal')) document.getElementById('checkoutTotal').innerText = "₱0";
        return;
    }
    
    let total = 0;
    let html = `<table><tr><th>Item</th><th>Details</th><th>Price</th><th>Qty</th><th>Action</th></tr>`;
    let checkoutHtml = '';
    
    cartItems.forEach((item, index) => {
        const qty = item.qty || 1;
        const itemTotal = Number(item.price) * qty;
        total += itemTotal;
        const details = `${item.color || 'Std'} | ${item.size || 'Std'}`;
        
        html += `
            <tr>
                <td>${item.name}</td>
                <td><small>${details}</small></td>
                <td>₱${Number(item.price).toLocaleString()}</td>
                <td>
                    <div class="qty-group">
                        <button class="qty-btn" onclick="window.app.updateCartQty(${index}, -1)">-</button>
                        <span class="qty-val">${qty}</span>
                        <button class="qty-btn" onclick="window.app.updateCartQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td><button class="btn" style="color:red; padding:5px; font-size:0.8rem;" onclick="window.app.removeFromCart(${index})">Remove</button></td>
            </tr>`;
            
        checkoutHtml += `
            <div class="summary-row">
                <span>${item.name} <small>(${details}) x${qty}</small></span>
                <span>₱${itemTotal.toLocaleString()}</span>
            </div>`;
    });

    html += `</table>
             <div class="total-box">Total: ₱${total.toLocaleString()}</div>
             <button class="btn btn-primary" style="width:100%; margin-top:20px;" onclick="window.app.showSection('checkout')">Proceed to Checkout</button>`;
    
    container.innerHTML = html;
    if(checkoutContainer) checkoutContainer.innerHTML = checkoutHtml;
    if(document.getElementById('checkoutTotal')) document.getElementById('checkoutTotal').innerText = "₱" + total.toLocaleString();
}

window.app.updateCartQty = async (index, change) => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        let cart = docSnap.data().cart || [];
        if(cart[index]) {
            cart[index].qty = (cart[index].qty || 1) + change;
            if(cart[index].qty < 1) cart[index].qty = 1;
            await updateDoc(userRef, { cart: cart });
            loadCart();
        }
    }
};

window.app.removeFromCart = async (index) => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        let cart = docSnap.data().cart || [];
        cart.splice(index, 1); 
        await updateDoc(userRef, { cart: cart });
        loadCart();
    }
};

function generateOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); 
    return `${year}${month}${day}${random}`; 
}

window.app.finalizeOrder = async () => {
    if (!currentUser) return;
    const name = document.getElementById('coName').value;
    const phone = document.getElementById('coPhone').value;
    const address = document.getElementById('coAddress').value;
    const totalEl = document.getElementById('checkoutTotal');
    
    if(!totalEl) return;
    const total = Number(totalEl.innerText.replace('₱', '').replace(/,/g, ''));

    if(!name || !phone || !address) { alert("Please complete delivery details."); return; }

    let orderItems = [];
    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        orderItems = userSnap.data().cart || [];
    } catch(e) { console.error(e); }

    const newOrderId = generateOrderId(); 

    try {
        await setDoc(doc(db, "orders", newOrderId), {
            userId: currentUser.uid,
            userName: name,
            items: orderItems,
            total: total,
            status: "Pending",
            date: new Date().toISOString(),
            details: { phone, address },
            messages: [],
            customerUnread: false,
            adminUnread: true
        });
        
        await updateDoc(doc(db, "users", currentUser.uid), { cart: [] });
        await updateDoc(doc(db, "users", currentUser.uid), { phone: phone });
        
        alert(`Order Placed Successfully! Order ID: ${newOrderId}`);
        loadCart();
        window.app.showSection('myorders');
    } catch (e) { alert("Error: " + e.message); }
};

function subscribeToCustomerOrders() {
    if(!currentUser) return;
    const ordersContainer = document.getElementById('myOrdersContainer');
    const notifContainer = document.getElementById('notificationsContainer');
    
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
    
    orderUnsubscribe = onSnapshot(q, (snapshot) => {
        let totalUnread = 0;
        let notifHtml = '';
        
        userOrders = []; 

        if (snapshot.empty) {
            if(ordersContainer) ordersContainer.innerHTML = "<p>You haven't placed any orders yet.</p>";
            if(notifContainer) notifContainer.innerHTML = "<p>No updates yet.</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const order = { id: docSnap.id, ...docSnap.data() };
            userOrders.push(order); 

            if (order.customerUnread) totalUnread++;
            const shortId = order.id;
            
            let statusColor = '#f4b95b'; 
            if(order.status === 'Order Confirmed') statusColor = '#2196F3';
            if(order.status === 'Out for Delivery') statusColor = '#9C27B0';
            if(order.status === 'Completed') statusColor = '#4CAF50';
            if(order.status === 'Cancelled') statusColor = '#f44336';

            const hasAdminMsg = order.messages && order.messages.length > 0 && order.messages[order.messages.length-1].sender === 'admin';
            if (order.customerUnread && hasAdminMsg) {
                notifHtml += `
                    <div class="notif-card message" onclick="window.app.openCustomerChat('${order.id}')">
                        <i class="fas fa-comment-dots notif-icon" style="color:#2196F3;"></i>
                        <div class="notif-text"><strong>New Message</strong><small>Regarding Order #${shortId}. Click to reply.</small></div>
                    </div>`;
            }

            if (order.status !== 'Pending' && order.status !== 'Processing') {
                let icon = 'fa-info-circle';
                if(order.status === 'Shipped' || order.status === 'Out for Delivery') icon = 'fa-truck';
                if(order.status === 'Completed' || order.status === 'Delivered') icon = 'fa-check-circle';
                if(order.status === 'Cancelled') icon = 'fa-times-circle';

                notifHtml += `
                    <div class="notif-card status" style="border-left-color: ${statusColor};">
                        <i class="fas ${icon} notif-icon" style="color:${statusColor};"></i>
                        <div class="notif-text">
                            <strong>Order Update: ${order.status}</strong>
                            <small>Your order #${shortId} is now ${order.status}.</small>
                        </div>
                    </div>`;
            }
        });
        
        const headerNotifBadge = document.getElementById('headerNotifBadge');
        const headerMsgBadge = document.getElementById('headerMsgBadge');
        const mobileNotifBadge = document.getElementById('mobileNotifBadge');
        const mobileMsgBadge = document.getElementById('mobileMsgBadge');
        
        if (totalUnread > 0) {
            if(headerMsgBadge) { headerMsgBadge.style.display = 'block'; headerMsgBadge.innerText = totalUnread; }
            if(mobileMsgBadge) { mobileMsgBadge.style.display = 'block'; mobileMsgBadge.innerText = totalUnread; }
        } else {
            if(headerMsgBadge) headerMsgBadge.style.display = 'none';
            if(mobileMsgBadge) mobileMsgBadge.style.display = 'none';
        }

        const notifContainer = document.getElementById('notificationsContainer');
        if(notifContainer) notifContainer.innerHTML = notifHtml || "<p>No new updates.</p>";

        window.app.filterMyOrders(); 
        window.app.renderUserMessages(); 
    });
}

window.app.renderUserMessages = () => {
    const container = document.getElementById('userMessagesList');
    if(!container) return;

    const activeChats = userOrders.filter(o => o.messages && o.messages.length > 0);
    
    activeChats.sort((a,b) => {
        const lastA = new Date(a.messages[a.messages.length-1].time);
        const lastB = new Date(b.messages[b.messages.length-1].time);
        return lastB - lastA;
    });

    if (activeChats.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#999; margin-top:30px;'>No active conversations.</p>";
        return;
    }

    let html = "";
    activeChats.forEach(o => {
        const lastMsg = o.messages[o.messages.length-1];
        const isMe = lastMsg.sender === 'customer';
        const senderName = isMe ? "You" : "Admin";
        const date = new Date(lastMsg.time).toLocaleDateString();
        const unreadClass = (o.customerUnread) ? 'style="background-color:#f0f8ff; border-left:5px solid var(--primary-coral);"' : '';

        html += `
            <div class="msg-item" ${unreadClass} onclick="window.app.openCustomerChat('${o.id}')" 
                 style="background:white; padding:15px; border-radius:8px; border:1px solid #eee; margin-bottom:10px; cursor:pointer; display:flex; gap:15px; align-items:center;">
                <div style="width:50px; height:50px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#888; font-size:1.2rem;">
                    <i class="fas fa-user-shield"></i>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="font-weight:bold; color:#333;">Order #${o.id}</span>
                        <span style="font-size:0.8rem; color:#999;">${date}</span>
                    </div>
                    <div style="font-size:0.9rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        <strong>${senderName}:</strong> ${lastMsg.text}
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
};

window.app.filterMyOrders = () => {
    const ordersContainer = document.getElementById('myOrdersContainer');
    const searchInput = document.getElementById('orderSearchInput');
    const filterSelect = document.getElementById('orderFilterSelect');

    if(!ordersContainer || !searchInput || !filterSelect) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = filterSelect.value; 

    const filteredOrders = userOrders.filter(order => {
        const orderId = order.id ? order.id.toString().toLowerCase() : "";
        const idMatch = orderId.includes(searchTerm);
        
        const items = Array.isArray(order.items) ? order.items : [];
        const itemMatch = items.some(item => item.name && item.name.toLowerCase().includes(searchTerm));
        
        const matchesSearch = idMatch || itemMatch;

        let matchesFilter = true;
        if (filterStatus === 'active') {
            matchesFilter = ['Pending', 'Processing', 'Order Confirmed', 'Out for Delivery'].includes(order.status);
        } else if (filterStatus === 'completed') {
            matchesFilter = order.status === 'Completed';
        } else if (filterStatus === 'cancelled') {
            matchesFilter = order.status === 'Cancelled';
        }

        return matchesSearch && matchesFilter;
    });

    if(filteredOrders.length === 0) {
        ordersContainer.innerHTML = "<p>No orders found matching your criteria.</p>";
    } else {
        let html = '';
        filteredOrders.forEach(order => {
            const date = new Date(order.date).toLocaleDateString();
            const orderIdDisplay = order.id;
            
            let statusColor = '#f4b95b'; 
            if(order.status === 'Order Confirmed') statusColor = '#2196F3';
            if(order.status === 'Out for Delivery') statusColor = '#9C27B0';
            if(order.status === 'Completed') statusColor = '#4CAF50';
            if(order.status === 'Cancelled') statusColor = '#f44336';

            let itemsHtml = '';
            if(order.items && Array.isArray(order.items)) {
                itemsHtml = order.items.map(item => `
                    <div style="font-size:0.85rem; color:#555; border-bottom:1px dashed #eee; padding:5px 0;">
                        ${item.name} (${item.color || 'Std'}/${item.size || 'Std'}) 
                        <span style="float:right; font-weight:bold;">x${item.qty || 1}</span>
                    </div>
                `).join('');
            } else {
                itemsHtml = '<div style="font-size:0.85rem; color:#999;">No items details.</div>';
            }

            let actionButtons = '';
            if (order.status === 'Pending') {
                actionButtons = `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn" style="background:#eee; color:#333; padding:5px 10px; font-size:0.8rem;" 
                            onclick="window.app.openOrderEdit('${order.id}')">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                        <button class="btn" style="background:#ffebee; color:#f44336; padding:5px 10px; font-size:0.8rem;" 
                            onclick="window.app.cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>`;
            }

            html += `
                <div class="order-item" style="border:1px solid #eee; padding:20px; margin-bottom:15px; border-radius:8px; border-left: 5px solid ${statusColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <span style="font-weight:bold; color:#333;">Order #${orderIdDisplay}</span>
                            <div style="font-size: 0.9rem; color: #777;">${date}</div>
                        </div>
                        <span style="background:${statusColor}; color:white; padding:5px 15px; border-radius:20px; font-size:0.8rem; font-weight:bold;">${order.status}</span>
                    </div>
                    <div style="background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:10px;">
                        <strong>Items:</strong> ${itemsHtml}
                        <div style="margin-top:5px; font-size:0.9rem; color:#666;">
                            <strong>Delivery to:</strong> ${order.details.address}
                        </div>
                    </div>
                    <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--primary-coral);">₱${Number(order.total).toLocaleString()}</span>
                        <button class="btn btn-outline" onclick="window.app.openCustomerChat('${order.id}')" style="font-size:0.8rem; padding:8px 15px;">
                            <i class="fas fa-comments"></i> Chat
                        </button>
                    </div>
                    ${actionButtons}
                </div>`;
        });
        ordersContainer.innerHTML = html;
    }
};

window.app.cancelOrder = async (orderId) => {
    if(!confirm("Are you sure you want to cancel this order?")) return;
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status: "Cancelled",
            adminUnread: true 
        });
        alert("Order has been cancelled.");
    } catch(e) { alert("Error: " + e.message); }
};

window.app.openOrderEdit = (orderId) => {
    const order = userOrders.find(o => o.id === orderId);
    if(!order) return;

    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editOrderAddress').value = order.details.address;
    document.getElementById('editOrderTotal').innerText = `₱${Number(order.total).toLocaleString()}`;

    const container = document.getElementById('editOrderItemsContainer');
    container.innerHTML = "";

    const items = Array.isArray(order.items) ? order.items : [];

    items.forEach((item, index) => {
        const originalProduct = allProducts.find(p => p.id === item.id);
        const qty = item.qty || 1;
        
        let colorOptions = `<option value="${item.color}">${item.color}</option>`;
        let sizeOptions = `<option value="${item.size}" data-price="${item.price}">${item.size}</option>`;

        if(originalProduct) {
            if(originalProduct.colors) {
                colorOptions = originalProduct.colors.map(c => 
                    `<option value="${c}" ${c === item.color ? 'selected' : ''}>${c}</option>`
                ).join('');
            }
            if(originalProduct.sizes) {
                sizeOptions = originalProduct.sizes.map(s => {
                    const sName = typeof s === 'object' ? s.name : s;
                    const sPrice = typeof s === 'object' ? s.price : originalProduct.price;
                    return `<option value="${sName}" data-price="${sPrice}" ${sName === item.size ? 'selected' : ''}>${sName}</option>`;
                }).join('');
            }
        }

        const div = document.createElement('div');
        div.style.marginBottom = "15px";
        div.style.paddingBottom = "15px";
        div.style.borderBottom = "1px dashed #eee";
        div.innerHTML = `
            <div style="font-weight:bold; margin-bottom:5px;">${item.name}</div>
            <div style="display:flex; gap:10px; align-items: center; flex-wrap: wrap;">
                <select class="form-control edit-color" style="font-size:0.8rem; width:100px;">${colorOptions}</select>
                <select class="form-control edit-size" style="font-size:0.8rem; width:100px;" onchange="window.app.recalcEditTotal()">${sizeOptions}</select>
                <div style="display:flex; align-items:center; gap:5px;">
                    <label style="font-size:0.8rem;">Qty:</label>
                    <input type="number" class="edit-qty-input edit-qty" value="${qty}" min="1" onchange="window.app.recalcEditTotal()">
                </div>
            </div>
            <div style="text-align:right; font-size:0.8rem; color:#888; margin-top:5px;">
                Item Price: <span class="item-price-display">₱${Number(item.price).toLocaleString()}</span>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('editOrderModal').classList.remove('modal-hidden');
};

window.app.recalcEditTotal = () => {
    const sizeSelects = document.querySelectorAll('.edit-size');
    const qtyInputs = document.querySelectorAll('.edit-qty');
    let newTotal = 0;
    
    sizeSelects.forEach((select, index) => {
        const price = Number(select.options[select.selectedIndex].dataset.price);
        const qty = Number(qtyInputs[index].value);
        newTotal += (price * qty);
        
        const display = select.parentElement.parentElement.querySelector('.item-price-display');
        if(display) display.innerText = `₱${price.toLocaleString()}`;
    });

    document.getElementById('editOrderTotal').innerText = `₱${newTotal.toLocaleString()}`;
};

window.app.saveOrderChanges = async () => {
    const orderId = document.getElementById('editOrderId').value;
    const newAddress = document.getElementById('editOrderAddress').value;
    
    if(!newAddress) return alert("Address cannot be empty");

    const order = userOrders.find(o => o.id === orderId);
    let newItems = [];
    let newTotal = 0;

    const colorSelects = document.querySelectorAll('.edit-color');
    const sizeSelects = document.querySelectorAll('.edit-size');
    const qtyInputs = document.querySelectorAll('.edit-qty');

    const items = Array.isArray(order.items) ? order.items : [];

    items.forEach((oldItem, index) => {
        const newColor = colorSelects[index].value;
        const newSize = sizeSelects[index].value;
        const newPrice = Number(sizeSelects[index].options[sizeSelects[index].selectedIndex].dataset.price);
        const newQty = Number(qtyInputs[index].value);
        
        newItems.push({
            ...oldItem,
            color: newColor,
            size: newSize,
            price: newPrice,
            qty: newQty
        });
        newTotal += (newPrice * newQty);
    });

    try {
        await setDoc(doc(db, "orders", orderId), {
            details: { ...order.details, address: newAddress }, 
            items: newItems,
            total: newTotal,
            adminUnread: true 
        }, { merge: true });

        document.getElementById('editOrderModal').classList.add('modal-hidden');
        alert("Order updated successfully!");
    } catch(e) { alert("Error: " + e.message); }
};

let custChatUnsubscribe = null;

window.app.openCustomerChat = (orderId) => {
    const modal = document.getElementById('customerChatModal');
    document.getElementById('currentCustOrderId').value = orderId;
    modal.classList.remove('modal-hidden');
    modal.style.display = 'flex'; 

    updateDoc(doc(db, "orders", orderId), { customerUnread: false });

    custChatUnsubscribe = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
        const order = docSnap.data();
        const chatBox = document.getElementById('custChatBox');
        chatBox.innerHTML = "";
        
        if(order.messages && order.messages.length > 0) {
            order.messages.forEach(msg => {
                const bubble = document.createElement('div');
                bubble.className = `chat-bubble ${msg.sender === 'customer' ? 'admin' : 'customer'}`; 
                bubble.innerHTML = `${msg.text} <span class="chat-time">${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
                chatBox.appendChild(bubble);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            chatBox.innerHTML = "<p style='text-align:center; color:#999; margin-top:50px;'>Start conversation...</p>";
        }
    });
};

window.app.closeCustomerChat = () => {
    document.getElementById('customerChatModal').style.display = 'none';
    if(custChatUnsubscribe) custChatUnsubscribe();
};

window.app.sendCustomerMessage = async () => {
    const orderId = document.getElementById('currentCustOrderId').value;
    const input = document.getElementById('custMsgInput');
    const text = input.value.trim();
    if(!text) return;

    try {
        await updateDoc(doc(db, "orders", orderId), {
            messages: arrayUnion({ sender: 'customer', text: text, time: new Date().toISOString() }),
            adminUnread: true 
        });
        input.value = "";
    } catch(e) { alert("Error sending: " + e.message); }
};

window.app.cleanNotifications = () => {
    if(!userOrders || userOrders.length === 0) return;
    userOrders.forEach(order => {
        const hasAdminMsg = order.messages && order.messages.length > 0 && order.messages[order.messages.length-1].sender === 'admin';
        if (order.customerUnread && !hasAdminMsg) {
            updateDoc(doc(db, "orders", order.id), { customerUnread: false });
        }
    });
};

window.app.showSection = (id) => {
    const protectedSections = ['cart', 'myorders', 'notifications', 'account', 'messages'];
    
    if (protectedSections.includes(id) && !currentUser) {
        document.getElementById('authModal').classList.remove('modal-hidden');
        return; 
    }

    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('active');
        if(id === 'notifications') {
            window.app.cleanNotifications();
        }
    }
};

window.app.updateUserPassword = async () => {
    const newPass = document.getElementById('accountNewPass').value;
    if(!currentUser || !newPass) return;
    try { await updatePassword(currentUser, newPass); alert("Password updated successfully!"); document.getElementById('accountNewPass').value = ""; }
    catch(e) { alert("Error: " + e.message + "\n(Please logout and login again)"); }
};

window.app.updateUserEmail = async () => {
    const newEmail = document.getElementById('accountNewEmail').value;
    if(!currentUser || !newEmail) return;
    try { await updateEmail(currentUser, newEmail); alert("Email updated!"); }
    catch(e) { alert("Error: " + e.message + "\n(For security, please logout and login again to change email)"); }
};

window.app.saveUserPhone = async () => {
    const phone = document.getElementById('accountPhone').value;
    if(!currentUser || !phone) return;
    try { 
        await updateDoc(doc(db, "users", currentUser.uid), { phone: phone });
        alert("Phone number saved!");
    } catch(e) { 
        await setDoc(doc(db, "users", currentUser.uid), { phone: phone }, { merge: true });
        alert("Phone number saved!");
    }
};

window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
};

window.sidebarFilter = (category) => {
    const searchSelect = document.getElementById('searchCategory');
    if(searchSelect) searchSelect.value = category;
    document.getElementById('searchInput').value = "";
    window.app.handleSearch();
    window.toggleSidebar();
};

async function loadCustomerReviews() {
    const container = document.getElementById('customerReviewsContainer');
    if(!container) return; 

    try {
        const q = query(collection(db, "reviews")); 
        const snapshot = await getDocs(q);
        
        if(snapshot.empty) {
            container.innerHTML = "<p style='text-align:center; width:100%; color:#999;'>No reviews yet. Be the first!</p>";
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const r = docSnap.data();
            
            const imgHtml = r.img ? 
                `<div class="review-img-box">
                    <img src="${r.img}" onclick="window.viewImage('${r.img}')" alt="Customer Photo">
                 </div>` 
                : '';

            html += `
                <div class="review-card">
                    <div class="review-content">
                        <div class="review-stars">★★★★★</div>
                        <div class="review-text">"${r.text}"</div>
                        <div class="review-name">- ${r.name}</div>
                    </div>
                    ${imgHtml}
                </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error("Error loading reviews:", e); }
}

window.viewImage = (url) => {
    const modal = document.getElementById('imagePreviewModal');
    const img = document.getElementById('previewImage');
    if(modal && img) {
        img.src = url;
        modal.classList.remove('modal-hidden');
    }
};

setTimeout(() => {
    const tooltip = document.getElementById('messengerTooltip');
    if(tooltip) tooltip.classList.add('hide');
}, 5000); 

window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if(hash && ['cart', 'myorders', 'home', 'checkout', 'messages'].includes(hash)) {
        setTimeout(() => {
            window.app.showSection(hash);
        }, 500);
    }
});

fetchProducts();
loadCustomerReviews();