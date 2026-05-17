import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBp-ZLjO-9szI_jA09ha6lLfdDfEBpSLkM",
  authDomain: "dmfurniture-93a59.firebaseapp.com",
  projectId: "dmfurniture-93a59",
  storageBucket: "dmfurniture-93a59.firebasestorage.app",
  messagingSenderId: "844358558442",
  appId: "1:844358558442:web:604ea44d6a15482ab0ad93",
  measurementId: "G-G1JJBT9CR7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allProducts = [];
let allOrders = [];
let currentOrderId = null;

// --- TAB SWITCHING ---
window.switchTab = (tab) => {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    
    if(tab === 'products') {
        document.getElementById('productsPanel').classList.add('active');
        document.querySelectorAll('.sidebar-btn')[3].classList.add('active');
    } else if (tab === 'reviews') {
        document.getElementById('reviewsPanel').classList.add('active');
        document.querySelectorAll('.sidebar-btn')[4].classList.add('active');
    } else if (tab === 'notifications') {
        document.getElementById('notificationsPanel').classList.add('active');
        document.querySelectorAll('.sidebar-btn')[2].classList.add('active');
    } else if (tab === 'messages') {
        document.getElementById('messagesPanel').classList.add('active');
        document.querySelectorAll('.sidebar-btn')[1].classList.add('active');
    } else {
        document.getElementById('ordersPanel').classList.add('active');
        document.querySelectorAll('.sidebar-btn')[0].classList.add('active');
    }
};

// --- PRODUCT LOGIC ---
const fetchProducts = async () => {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
    
    const q = await getDocs(collection(db, "products"));
    allProducts = [];
    
    q.forEach((doc) => {
        allProducts.push({ id: doc.id, ...doc.data() });
    });
    
    window.filterAdminProducts();
};

window.filterAdminProducts = () => {
    const query = document.getElementById('adminSearch').value.toLowerCase();
    const cat = document.getElementById('adminCatFilter').value;
    const tbody = document.getElementById('adminTableBody');
    
    tbody.innerHTML = "";

    const filtered = allProducts.filter(p => {
        const matchName = p.name.toLowerCase().includes(query);
        const matchCat = cat === 'all' || p.category === cat;
        return matchName && matchCat;
    });

    if(filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No products found.</td></tr>";
        return;
    }

    filtered.forEach(p => {
        // Handle Multiple Images: Use the first one for the thumbnail
        const displayImg = Array.isArray(p.img) ? p.img[0] : p.img;

        tbody.innerHTML += `
            <tr>
                <td><img src="${displayImg}" class="admin-thumb" onerror="this.src='https://via.placeholder.com/40'"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>₱${Number(p.price).toLocaleString()}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="window.editProduct('${p.id}')"><i class="fas fa-pen"></i></button>
                        <button class="btn-delete" onclick="window.deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
};

window.saveProduct = async () => {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('pName').value;
    const price = Number(document.getElementById('pPrice').value);
    const category = document.getElementById('pCat').value;
    const desc = document.getElementById('pDesc').value;
    
    // UPDATED: Handle Multiple Images (Split by comma)
    const imgRaw = document.getElementById('pImg').value;
    // Split string by comma, trim whitespace, and filter out empty strings
    const img = imgRaw.split(',').map(url => url.trim()).filter(url => url.length > 0);

    const colorStr = document.getElementById('pColors').value;
    const colors = colorStr ? colorStr.split(',').map(c => c.trim()) : [];

    const sizeStr = document.getElementById('pSizes').value;
    let sizes = [];
    if(sizeStr) {
        sizes = sizeStr.split(',').map(s => {
            const parts = s.split(':');
            if(parts.length === 2) {
                return { name: parts[0].trim(), price: Number(parts[1].trim()) };
            }
            return parts[0].trim(); 
        });
    }

    if (!name || !price) return alert("Name and Price required");

    // Save 'img' as an array
    const data = { name, price, category, img, desc, colors, sizes };

    try {
        if (id) {
            await updateDoc(doc(db, "products", id), data);
            alert("Product Updated!");
        } else {
            await addDoc(collection(db, "products"), data);
            alert("Product Added!");
        }
        resetForm();
        fetchProducts();
    } catch (e) { alert(e.message); }
};

window.deleteProduct = async (id) => {
    if (confirm("Delete this product?")) {
        await deleteDoc(doc(db, "products", id));
        fetchProducts();
    }
};

window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('editId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pCat').value = p.category;
    document.getElementById('pDesc').value = p.desc || "";
    
    // UPDATED: Handle converting Array back to String for editing
    if (Array.isArray(p.img)) {
        document.getElementById('pImg').value = p.img.join(', ');
    } else {
        document.getElementById('pImg').value = p.img;
    }
    
    if(p.colors) document.getElementById('pColors').value = p.colors.join(', ');
    
    if(p.sizes) {
        const sizeText = p.sizes.map(s => {
            return (typeof s === 'object') ? `${s.name}:${s.price}` : s;
        }).join(', ');
        document.getElementById('pSizes').value = sizeText;
    }

    document.getElementById('cancelEdit').style.display = 'inline-block';
    window.scrollTo(0,0);
};

window.resetForm = () => {
    document.getElementById('editId').value = "";
    document.getElementById('pName').value = "";
    document.getElementById('pPrice').value = "";
    document.getElementById('pImg').value = "";
    document.getElementById('pDesc').value = "";
    document.getElementById('pColors').value = "";
    document.getElementById('pSizes').value = "";
    document.getElementById('cancelEdit').style.display = 'none';
};

// --- REVIEWS LOGIC ---
const fetchReviews = () => {
    const container = document.getElementById('adminReviewsList');
    const q = query(collection(db, "reviews"));
    
    onSnapshot(q, (snapshot) => {
        if(snapshot.empty) { container.innerHTML = "<p>No reviews yet.</p>"; return; }
        
        let reviews = [];
        snapshot.forEach(docSnap => reviews.push({ id: docSnap.id, ...docSnap.data() }));
        reviews.sort((a,b) => new Date(b.date) - new Date(a.date));

        let html = "";
        reviews.forEach(r => {
            html += `
                <div class="review-item-admin">
                    <img src="${r.img || 'https://via.placeholder.com/80'}" onerror="this.src='https://via.placeholder.com/80'">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${r.name}</div>
                        <div style="font-size:0.9rem; color:#666;">${r.text}</div>
                        <div style="font-size:0.8rem; color:#999; margin-top:5px;">${new Date(r.date).toLocaleDateString()}</div>
                    </div>
                    <button class="btn-delete" onclick="window.deleteReview('${r.id}')"><i class="fas fa-trash"></i></button>
                </div>`;
        });
        container.innerHTML = html;
    });
};

window.addReview = async () => {
    const name = document.getElementById('rName').value;
    const img = document.getElementById('rImg').value;
    const text = document.getElementById('rText').value;

    if(!name || !text) return alert("Name and Review text are required.");

    try {
        await addDoc(collection(db, "reviews"), {
            name, img, text, date: new Date().toISOString()
        });
        alert("Review Added!");
        document.getElementById('rName').value = "";
        document.getElementById('rImg').value = "";
        document.getElementById('rText').value = "";
    } catch(e) { alert(e.message); }
};

window.deleteReview = async (id) => {
    if(confirm("Remove this review?")) {
        await deleteDoc(doc(db, "reviews", id));
    }
};

// --- ORDERS, CHAT & NOTIFICATIONS LOGIC ---
const fetchOrders = () => {
    const q = query(collection(db, "orders")); 
    
    onSnapshot(q, (snapshot) => {
        allOrders = [];
        let unreadCount = 0;
        let notifHtml = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            allOrders.push({
                id: doc.id,
                userName: data.userName || "Unknown",
                date: data.date || new Date().toISOString(),
                total: data.total || 0,
                status: data.status || "Pending",
                details: data.details || { phone: "N/A", address: "N/A" },
                items: data.items || [],
                adminUnread: data.adminUnread || false,
                messages: data.messages || []
            });

            // Populate Notifications
            if(data.adminUnread || data.status === 'Pending') {
                unreadCount++;
                const badgeType = data.adminUnread ? "New Message" : "New Order";
                const badgeColor = data.adminUnread ? "var(--info)" : "var(--primary-gold)";
                
                notifHtml += `
                    <div class="notif-item-admin ${data.adminUnread ? 'unread' : ''}" onclick="window.openAdminOrder('${doc.id}')">
                        <div style="background:${badgeColor}; color:white; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <i class="fas ${data.adminUnread ? 'fa-comment' : 'fa-shopping-bag'}"></i>
                        </div>
                        <div>
                            <strong>${badgeType}</strong> - Order #${doc.id}
                            <div style="font-size:0.85rem; color:#666;">${data.userName}</div>
                        </div>
                    </div>`;
            }
        });

        // Update Notification Badge
        const badge = document.getElementById('sidebarNotifBadge');
        if(unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.innerText = unreadCount;
        } else {
            badge.style.display = 'none';
        }

        // Update Notification List
        document.getElementById('adminNotifList').innerHTML = notifHtml || "<p style='color:#999'>No new notifications.</p>";

        // Sort and Update Order List
        allOrders.sort((a,b) => new Date(b.date) - new Date(a.date));
        window.filterOrders();
        window.renderMessages(); // Update Message List

        // If a modal is open, refresh it (for realtime chat)
        if(currentOrderId) {
            const updatedOrder = allOrders.find(o => o.id === currentOrderId);
            if(updatedOrder) renderChat(updatedOrder);
        }
    });
};

// --- NEW: MESSAGE CENTER RENDER LOGIC ---
window.renderMessages = () => {
    const query = document.getElementById('msgSearch').value.toLowerCase();
    const container = document.getElementById('messageListContainer');
    container.innerHTML = "";

    // Filter active chats
    const chats = allOrders.filter(o => o.messages && o.messages.length > 0);
    
    // Sort by latest message time
    chats.sort((a,b) => {
        const lastA = new Date(a.messages[a.messages.length-1].time);
        const lastB = new Date(b.messages[b.messages.length-1].time);
        return lastB - lastA;
    });

    const filteredChats = chats.filter(o => o.userName.toLowerCase().includes(query));

    if(filteredChats.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#999;'>No conversations found.</p>";
        return;
    }

    filteredChats.forEach(o => {
        const lastMsg = o.messages[o.messages.length-1];
        const isMe = lastMsg.sender === 'admin';
        const prefix = isMe ? "You: " : "";
        const date = new Date(lastMsg.time).toLocaleDateString();
        const unreadClass = o.adminUnread ? 'unread' : '';

        container.innerHTML += `
            <div class="msg-item-admin ${unreadClass}" onclick="window.openAdminOrder('${o.id}')">
                <div style="width:50px; height:50px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#888; font-size:1.2rem; flex-shrink:0;">
                    <i class="fas fa-user"></i>
                </div>
                <div class="msg-content">
                    <div class="msg-header">
                        <span class="msg-name">${o.userName}</span>
                        <span class="msg-date">${date}</span>
                    </div>
                    <div class="msg-preview">${prefix}${lastMsg.text}</div>
                </div>
            </div>`;
    });
};

window.filterOrders = () => {
    const query = document.getElementById('orderSearch').value.toLowerCase();
    const status = document.getElementById('orderStatusFilter').value;
    const tbody = document.getElementById('ordersTableBody');
    
    tbody.innerHTML = "";

    const filtered = allOrders.filter(o => {
        const id = o.id.toString().toLowerCase();
        const name = o.userName.toLowerCase();
        const matchText = id.includes(query) || name.includes(query);
        const matchStatus = status === 'all' || o.status === status;
        return matchText && matchStatus;
    });

    if(filtered.length === 0) { tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>No orders found.</td></tr>"; return; }

    filtered.forEach(o => {
        let dateDisplay = "N/A";
        try { dateDisplay = new Date(o.date).toLocaleDateString(); } catch(e){}

        let statusClass = `status-${o.status === 'Out for Delivery' ? 'Shipped' : o.status}`;
        let unreadDot = o.adminUnread ? '<span style="color:red; margin-left:5px;">●</span>' : '';

        tbody.innerHTML += `
            <tr>
                <td>#${o.id} ${unreadDot}</td>
                <td>${o.userName}</td>
                <td>${dateDisplay}</td>
                <td>₱${Number(o.total).toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${o.status}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="window.openAdminOrder('${o.id}')">Manage</button>
                        <button class="btn-delete" onclick="window.deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
};

window.openAdminOrder = async (id) => {
    const order = allOrders.find(o => o.id === id);
    if(!order) return;
    currentOrderId = order.id;

    // Mark as read
    if(order.adminUnread) {
        await updateDoc(doc(db, "orders", id), { adminUnread: false });
    }

    document.getElementById('viewOrderId').innerText = order.id;
    document.getElementById('viewOrderName').innerText = order.userName;
    document.getElementById('viewOrderPhone').innerText = order.details.phone;
    document.getElementById('viewOrderAddress').innerText = order.details.address;
    document.getElementById('viewOrderTotal').innerText = `₱${Number(order.total).toLocaleString()}`;
    document.getElementById('updateStatusSelect').value = order.status === 'Out for Delivery' ? 'Shipped' : order.status;

    const itemsContainer = document.getElementById('viewOrderItems');
    itemsContainer.innerHTML = "";
    if(order.items && Array.isArray(order.items)){
        order.items.forEach(item => {
            itemsContainer.innerHTML += `
                <div style="border-bottom:1px dashed #eee; padding:5px 0; font-size:0.9rem;">
                    ${item.name} <small>(${item.color || 'Std'}/${item.size || 'Std'})</small> 
                    <span style="float:right;">x${item.qty || 1}</span>
                </div>`;
        });
    }

    renderChat(order);
    document.getElementById('adminOrderModal').classList.remove('modal-hidden');
};

function renderChat(order) {
    const chatBox = document.getElementById('adminChatBox');
    if(!chatBox) return; 
    
    chatBox.innerHTML = "";
    
    if(order.messages && order.messages.length > 0) {
        order.messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${msg.sender === 'admin' ? 'admin' : 'customer'}`; 
            bubble.innerHTML = `${msg.text} <span class="chat-time">${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
            chatBox.appendChild(bubble);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        chatBox.innerHTML = "<p style='text-align:center; color:#999; margin-top:50px;'>No messages yet.</p>";
    }
}

window.sendAdminMessage = async () => {
    const input = document.getElementById('adminMsgInput');
    const text = input.value.trim();
    if(!text || !currentOrderId) return;

    try {
        await updateDoc(doc(db, "orders", currentOrderId), {
            messages: arrayUnion({ sender: 'admin', text: text, time: new Date().toISOString() }),
            customerUnread: true 
        });
        input.value = "";
    } catch(e) { alert("Error sending: " + e.message); }
};

window.updateOrderStatus = async () => {
    if(!currentOrderId) return;
    const newStatus = document.getElementById('updateStatusSelect').value;
    let displayStatus = newStatus;
    if(newStatus === 'Shipped') displayStatus = 'Out for Delivery'; 

    try {
        await updateDoc(doc(db, "orders", currentOrderId), {
            status: displayStatus,
            customerUnread: true 
        });
        alert("Order status updated!");
        document.getElementById('adminOrderModal').classList.add('modal-hidden');
        currentOrderId = null;
    } catch(e) { alert("Error: " + e.message); }
};

window.deleteOrder = async (id) => {
    if(confirm("Are you sure you want to PERMANENTLY delete this order? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "orders", id));
        } catch(e) { alert("Error deleting order: " + e.message); }
    }
};

// Initial Load
fetchProducts();
fetchReviews();
fetchOrders();