// --- COMPROBACIÓN DE CONFIGURACIÓN DE SUPABASE ---
const isSupabaseConfigured = typeof SUPABASE_URL !== 'undefined' && 
                             typeof SUPABASE_ANON_KEY !== 'undefined' && 
                             SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
                             SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
                             SUPABASE_URL.trim() !== '' &&
                             SUPABASE_ANON_KEY.trim() !== '';

// Inicializar cliente de Supabase si está configurado
let supabaseClient = null;
if (isSupabaseConfigured) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase inicializado correctamente.");
    } catch (err) {
        console.error("Error al inicializar el cliente de Supabase:", err);
    }
} else {
    console.warn("Supabase no está configurado. Usando el motor de fallback (localStorage).");
}

// --- ESTADO GLOBAL (FALLBACK LOCAL POR DEFECTO) ---
let cart = JSON.parse(localStorage.getItem('baristas_cart')) || [];
let localUsers = JSON.parse(localStorage.getItem('baristas_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('baristas_current_user')) || null;
let loadedProducts = [];

// --- PRODUCTOS DE FALLBACK LOCAL (Semillas coincidentes con SQL) ---
const MOCK_PRODUCTS = [
    { id: 1, nombre: 'Café Irish', descripcion: 'Café con whiskey irlandés y crema batida', precio: 4.60, precio_original: 5.30, descuento: 13, calificacion: 4.0, imagen_url: 'img/cafe-irish.jpg', categoria_id: 1, disponible: true },
    { id: 2, nombre: 'Café Inglés', descripcion: 'Mezcla especial de granos ingleses', precio: 5.70, precio_original: 7.30, descuento: 22, calificacion: 3.0, imagen_url: 'img/cafe-ingles.jpg', disponible: true },
    { id: 3, nombre: 'Café Australiano', descripcion: 'Flat white estilo australiano', precio: 3.20, precio_original: null, descuento: null, calificacion: 5.0, imagen_url: 'img/cafe-australiano.jpg', disponible: true },
    { id: 4, nombre: 'Café Helado', descripcion: 'Refrescante café con hielo y leche', precio: 5.60, precio_original: null, descuento: null, calificacion: 4.0, imagen_url: 'img/cafe-helado.jpg', disponible: true },
    { id: 6, nombre: 'Café Viena', descripcion: 'Café con crema batida y canela', precio: 3.85, precio_original: 5.50, descuento: 30, calificacion: 5.0, imagen_url: 'img/cafe-viena.jpg', disponible: true },
    { id: 7, nombre: 'Café Liqueurs', descripcion: 'Café con licor de avellana', precio: 5.60, precio_original: null, descuento: null, calificacion: 4.0, imagen_url: 'img/cafe-liqueurs.jpg', disponible: true }
];

// --- ELEMENTOS DEL DOM ---
const cartBtn = document.getElementById('cart-btn');
const cartTextBtn = document.getElementById('cart-text-btn');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartCountBadge = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');

const userBtn = document.getElementById('user-btn');
const userModal = document.getElementById('user-modal');
const userCloseBtn = document.getElementById('user-close-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userProfileMenu = document.getElementById('user-profile-menu');
const userModalTabs = document.getElementById('user-modal-tabs');
const switchToRegisterSpan = document.getElementById('switch-to-register');
const switchToLoginSpan = document.getElementById('switch-to-login');
const logoutBtn = document.getElementById('logout-btn');

const userAvatarInitials = document.getElementById('user-avatar-initials');
const userProfileName = document.getElementById('user-profile-name');
const userProfileEmail = document.getElementById('user-profile-email');

const overlay = document.getElementById('baristas-overlay');
const toastContainer = document.getElementById('toast-container');
const menuBarsBtn = document.getElementById('menu-bars-btn');
const navMenu = document.getElementById('nav-menu');

const productsGrid = document.getElementById('products-grid');
const specialsGrid = document.getElementById('specials-grid');

// ==========================================================================
// SISTEMA DE NOTIFICACIONES TOAST
// ==========================================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'info') iconClass = 'fa-circle-info';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

// Mapear semillas locales a URLs en alta definición
function getProductImageUrl(url) {
    if (!url) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-irish')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-ingles')) return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-australiano')) return 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-helado')) return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-viena')) return 'https://images.unsplash.com/photo-1607681034540-2c46cc71896d?q=80&w=600&auto=format&fit=crop';
    if (url.includes('cafe-liqueurs')) return 'https://images.unsplash.com/photo-1595434061149-86644040937c?q=80&w=600&auto=format&fit=crop';
    return url;
}

// ==========================================================================
// CARGA DINÁMICA DE PRODUCTOS (SUPABASE / LOCAL)
// ==========================================================================
async function loadProducts() {
    if (isSupabaseConfigured && supabaseClient) {
        const { data, error } = await supabaseClient.from('products').select('*');
        if (!error && data && data.length > 0) {
            loadedProducts = data;
            console.log("Productos cargados de Supabase:", loadedProducts);
            renderProductsUI(loadedProducts);
            return;
        } else {
            console.error("Error al consultar productos de Supabase, usando locales:", error);
        }
    }
    
    // Fallback local
    loadedProducts = MOCK_PRODUCTS;
    renderProductsUI(loadedProducts);
    if (!isSupabaseConfigured) {
        showToast("Demostración: Usando almacenamiento local. Configura config.js para conectar Supabase.", "info");
    }
}

function renderProductsUI(productsList) {
    productsGrid.innerHTML = '';
    specialsGrid.innerHTML = '';
    
    productsList.forEach(product => {
        const imgUrl = getProductImageUrl(product.imagen_url);
        const price = parseFloat(product.precio);
        const hasOriginalPrice = product.precio_original && parseFloat(product.precio_original) > price;
        const discountTag = hasOriginalPrice ? `<span class="discount">-${Math.round((1 - (price / parseFloat(product.precio_original))) * 100)}%</span>` : '';
        const originalPriceHtml = hasOriginalPrice ? ` <span>$${parseFloat(product.precio_original).toFixed(2)}</span>` : '';
        
        // Estrellas
        const rating = parseFloat(product.calificacion || 4);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                starsHtml += '<i class="fa-solid fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star"></i>';
            }
        }

        const productHtml = `
            <div class="card-product" data-id="${product.id}" data-name="${product.nombre}" data-price="${price}" data-img="${imgUrl}">
                <div class="container-img">
                    <img src="${imgUrl}" alt="${product.nombre}" />
                    ${discountTag}
                    <div class="button-group">
                        <span><i class="fa-regular fa-eye"></i></span>
                        <span><i class="fa-regular fa-heart"></i></span>
                        <span><i class="fa-solid fa-code-compare"></i></span>
                    </div>
                </div>
                <div class="content-card-product">
                    <div class="stars">${starsHtml}</div>
                    <h3>${product.nombre}</h3>
                    <span class="add-cart"><i class="fa-solid fa-basket-shopping"></i></span>
                    <p class="price">$${price.toFixed(2)}${originalPriceHtml}</p>
                </div>
            </div>
        `;
        
        // Renderizar en "Destacados/Productos" (Mapeamos a los primeros 4 productos)
        if ([1, 2, 3, 4].includes(Number(product.id))) {
            productsGrid.insertAdjacentHTML('beforeend', productHtml);
        }
        
        // Renderizar en "Especiales" (Mapeamos a 1, 2, 6, 7)
        if ([1, 2, 6, 7].includes(Number(product.id))) {
            specialsGrid.insertAdjacentHTML('beforeend', productHtml);
        }
    });

    // Volver a enlazar los eventos de añadir al carrito
    document.querySelectorAll('.add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.card-product');
            const id = card.getAttribute('data-id');
            const name = card.getAttribute('data-name');
            const price = parseFloat(card.getAttribute('data-price'));
            const img = card.getAttribute('data-img');
            addToCart(id, name, price, img);
        });
    });
}

// ==========================================================================
// GESTIÓN DEL CARRITO DE COMPRAS (DOCKING / SYNC)
// ==========================================================================
async function syncCartFromDb() {
    if (!supabaseClient || !currentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('carrito')
            .select('*, products(*)')
            .eq('usuario_id', currentUser.id);
            
        if (error) throw error;
        
        if (data) {
            cart = data.map(row => ({
                id: row.producto_id.toString(),
                db_row_id: row.id,
                name: row.products.nombre,
                price: parseFloat(row.products.precio),
                img: getProductImageUrl(row.products.imagen_url),
                quantity: row.cantidad
            }));
            updateCartBadge();
        }
    } catch (err) {
        console.error("Error al sincronizar carrito desde Supabase:", err);
    }
}

async function mergeLocalCartToDb() {
    if (!supabaseClient || !currentUser || cart.length === 0) return;
    
    try {
        for (const localItem of cart) {
            // Comprobar si ya existe en la base de datos
            const { data: dbItems } = await supabaseClient
                .from('carrito')
                .select('*')
                .eq('usuario_id', currentUser.id)
                .eq('producto_id', Number(localItem.id));
                
            if (dbItems && dbItems.length > 0) {
                // Actualizar cantidad
                const newQty = dbItems[0].cantidad + localItem.quantity;
                await supabaseClient
                    .from('carrito')
                    .update({ cantidad: newQty })
                    .eq('id', dbItems[0].id);
            } else {
                // Insertar nuevo
                await supabaseClient
                    .from('carrito')
                    .insert({
                        usuario_id: currentUser.id,
                        producto_id: Number(localItem.id),
                        cantidad: localItem.quantity
                    });
            }
        }
        
        // Limpiar carrito local tras fusión
        localStorage.removeItem('baristas_cart');
        await syncCartFromDb();
    } catch (err) {
        console.error("Error al fusionar carritos:", err);
    }
}

async function addToCart(id, name, price, img) {
    if (supabaseClient && currentUser) {
        try {
            // Verificar si el producto ya está en el carrito de Supabase
            const { data: existing } = await supabaseClient
                .from('carrito')
                .select('*')
                .eq('usuario_id', currentUser.id)
                .eq('producto_id', Number(id));
                
            if (existing && existing.length > 0) {
                const newQty = existing[0].cantidad + 1;
                await supabaseClient
                    .from('carrito')
                    .update({ cantidad: newQty })
                    .eq('id', existing[0].id);
            } else {
                await supabaseClient
                    .from('carrito')
                    .insert({
                        usuario_id: currentUser.id,
                        producto_id: Number(id),
                        cantidad: 1
                    });
            }
            
            await syncCartFromDb();
            showToast(`¡"${name}" agregado al carrito en la nube!`, 'success');
            return;
        } catch (err) {
            console.error("Error de base de datos al añadir al carrito, fallback local:", err);
        }
    }
    
    // Lógica local
    const existingIndex = cart.findIndex(item => item.id === id);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ id, name, price, img, quantity: 1 });
    }
    
    localStorage.setItem('baristas_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`¡"${name}" agregado al carrito local!`, 'success');
}

async function changeQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    const newQty = item.quantity + change;
    
    if (supabaseClient && currentUser && item.db_row_id) {
        try {
            if (newQty <= 0) {
                await supabaseClient.from('carrito').delete().eq('id', item.db_row_id);
                showToast(`"${item.name}" eliminado del carrito`, 'info');
            } else {
                await supabaseClient.from('carrito').update({ cantidad: newQty }).eq('id', item.db_row_id);
            }
            await syncCartFromDb();
            renderCart();
            return;
        } catch (err) {
            console.error("Error de base de datos al alterar cantidad:", err);
        }
    }
    
    // Lógica local fallback
    const index = cart.findIndex(i => i.id === id);
    if (newQty <= 0) {
        cart.splice(index, 1);
        showToast(`"${item.name}" eliminado del carrito`, 'info');
    } else {
        cart[index].quantity = newQty;
    }
    
    localStorage.setItem('baristas_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
}

async function removeFromCart(id) {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    if (supabaseClient && currentUser && item.db_row_id) {
        try {
            await supabaseClient.from('carrito').delete().eq('id', item.db_row_id);
            await syncCartFromDb();
            renderCart();
            showToast(`"${item.name}" eliminado`, 'info');
            return;
        } catch (err) {
            console.error("Error al eliminar del carrito en Supabase:", err);
        }
    }
    
    // Lógica local fallback
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('baristas_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
    showToast(`"${item.name}" eliminado`, 'info');
}

function renderCart() {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty-message">
                <i class="fa-solid fa-basket-shopping"></i>
                <p>Tu carrito está vacío.<br>¡Añade un café delicioso!</p>
            </div>
        `;
        cartTotalPrice.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    cart.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        total += itemSubtotal;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.img}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <span class="cart-item-title">${item.name}</span>
                <span class="cart-item-price">$${item.price.toFixed(2)}</span>
                <div class="cart-item-quantity">
                    <button class="qty-btn minus-qty" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn plus-qty" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <button class="remove-item-btn" data-id="${item.id}">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        `;
        cartItemsContainer.appendChild(itemEl);
    });
    
    cartTotalPrice.textContent = `$${total.toFixed(2)}`;
    
    document.querySelectorAll('.minus-qty').forEach(btn => {
        btn.addEventListener('click', () => changeQuantity(btn.getAttribute('data-id'), -1));
    });
    document.querySelectorAll('.plus-qty').forEach(btn => {
        btn.addEventListener('click', () => changeQuantity(btn.getAttribute('data-id'), 1));
    });
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-id')));
    });
}

function updateCartBadge() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountBadge.textContent = `(${totalItems})`;
}

// Finalizar Compra (Checkout)
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
        showToast('El carrito está vacío', 'error');
        return;
    }
    
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    if (supabaseClient && currentUser) {
        try {
            // 1. Insertar el Pedido
            const { data: orderData, error: orderError } = await supabaseClient
                .from('pedidos')
                .insert({
                    usuario_id: currentUser.id,
                    total: total,
                    metodo_pago: 'efectivo',
                    estado: 'pendiente'
                })
                .select();
                
            if (orderError) throw orderError;
            
            const orderId = orderData[0].id;
            
            // 2. Insertar Detalles del Pedido
            const orderDetails = cart.map(item => ({
                pedido_id: orderId,
                producto_id: Number(item.id),
                cantidad: item.quantity,
                precio_unitario: item.price
            }));
            
            const { error: detailsError } = await supabaseClient
                .from('detalles_pedido')
                .insert(orderDetails);
                
            if (detailsError) throw detailsError;
            
            // 3. Vaciar Carrito en Supabase
            await supabaseClient
                .from('carrito')
                .delete()
                .eq('usuario_id', currentUser.id);
                
            cart = [];
            updateCartBadge();
            closeCart();
            showToast('¡Pedido registrado con éxito en Supabase!', 'success');
            return;
        } catch (err) {
            console.error("Error al procesar la compra en base de datos:", err);
            showToast("No se pudo registrar la compra en la nube. Revisa la consola.", "error");
            return;
        }
    }
    
    // Fallback Local
    cart = [];
    localStorage.removeItem('baristas_cart');
    updateCartBadge();
    closeCart();
    showToast('¡Compra local procesada con éxito!', 'success');
});

// ==========================================================================
// REGISTRO E INICIO DE SESIÓN (AUTENTICACIÓN)
// ==========================================================================
function updateHeaderUserUI() {
    const existingUserInfo = document.getElementById('header-user-info');
    if (existingUserInfo) existingUserInfo.remove();
    
    const userBtnIcon = document.getElementById('user-btn');
    
    if (currentUser) {
        const userInfo = document.createElement('div');
        userInfo.className = 'container-user-info';
        userInfo.id = 'header-user-info';
        userInfo.innerHTML = `
            <span class="user-name-tag">Hola, ${currentUser.name.split(' ')[0]}</span>
            <span class="logout-link" id="header-logout">Cerrar Sesión</span>
        `;
        
        userBtnIcon.after(userInfo);
        userBtnIcon.style.color = '#4cd137';
        
        document.getElementById('header-logout').addEventListener('click', (e) => {
            e.stopPropagation();
            logoutUser();
        });
    } else {
        userBtnIcon.style.color = 'var(--primary-color)';
    }
}

async function registerUser(name, email, password) {
    if (supabaseClient) {
        try {
            // Registrar en Supabase Auth
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nombre_completo: name
                    }
                }
            });
            
            if (error) throw error;

            // Cuando la confirmación de email está activa, Supabase devuelve
            // data.user con identities vacío hasta que el usuario confirme.
            // En ese caso solo avisamos y no intentamos insertar el perfil todavía.
            const needsConfirmation = data.user && data.user.identities && data.user.identities.length === 0;

            if (needsConfirmation) {
                showToast(`¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.`, 'success');
                closeUserModal();
                return true;
            }
            
            if (data.user) {
                
                showToast(`¡Cuenta creada! Revisa tu email para confirmación.`, 'success');
                closeUserModal();
            }
            return true;
        } catch (err) {
            console.error("Error al registrar en Supabase Auth:", err);
            showToast(err.message || "Error al crear cuenta.", "error");
            return false;
        }
    }
    
    // Fallback Local
    const exists = localUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
        showToast('El correo ya está registrado localmente', 'error');
        return false;
    }
    
    const newUser = { name, email, password };
    localUsers.push(newUser);
    localStorage.setItem('baristas_users', JSON.stringify(localUsers));
    
    currentUser = newUser;
    localStorage.setItem('baristas_current_user', JSON.stringify(currentUser));
    
    updateHeaderUserUI();
    closeUserModal();
    showToast(`¡Registro local exitoso! Bienvenido/a, ${name}.`, 'success');
    return true;
}

async function loginUser(email, password) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            if (data.user) {
                currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata.nombre_completo || 'Usuario'
                };
                localStorage.setItem('baristas_current_user', JSON.stringify(currentUser));
                
                await mergeLocalCartToDb();
                updateHeaderUserUI();
                closeUserModal();
                showToast(`¡Sesión iniciada con Supabase! Hola, ${currentUser.name}.`, 'success');
            }
            return true;
        } catch (err) {
            console.error("Error de login en Supabase:", err);
            showToast("Credenciales incorrectas o correo no confirmado.", "error");
            return false;
        }
    }
    
    // Fallback Local
    const user = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
        showToast('Correo electrónico o contraseña incorrectos', 'error');
        return false;
    }
    
    currentUser = user;
    localStorage.setItem('baristas_current_user', JSON.stringify(currentUser));
    
    updateHeaderUserUI();
    closeUserModal();
    showToast(`¡Sesión local iniciada! Hola, ${user.name}.`, 'success');
    return true;
}

async function logoutUser() {
    if (supabaseClient && currentUser) {
        try {
            await supabaseClient.auth.signOut();
        } catch (err) {
            console.error("Error al salir de Supabase Auth:", err);
        }
    }
    
    currentUser = null;
    localStorage.removeItem('baristas_current_user');
    cart = [];
    localStorage.removeItem('baristas_cart');
    
    updateHeaderUserUI();
    updateCartBadge();
    closeUserModal();
    showToast('Sesión cerrada correctamente.', 'info');
}

// ==========================================================================
// CONTROL DE VISIBILIDAD DE COMPONENTES DE INTERFAZ
// ==========================================================================
function openCart() {
    cartDrawer.classList.add('active');
    overlay.classList.add('active');
    renderCart();
}

function closeCart() {
    cartDrawer.classList.remove('active');
    overlay.classList.remove('active');
}

function openUserModal() {
    if (currentUser) {
        userModalTabs.style.display = 'none';
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        userProfileMenu.classList.add('active');
        
        userProfileName.textContent = currentUser.name;
        userProfileEmail.textContent = currentUser.email;
        userAvatarInitials.textContent = currentUser.name.charAt(0).toUpperCase();
    } else {
        userModalTabs.style.display = 'flex';
        userProfileMenu.classList.remove('active');
        switchTab('login-form');
    }
    
    userModal.classList.add('active');
    overlay.classList.add('active');
}

function closeUserModal() {
    userModal.classList.remove('active');
    overlay.classList.remove('active');
}

function closeAll() {
    closeCart();
    closeUserModal();
}

function switchTab(tabId) {
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (tabId === 'login-form') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

// Bindeos simples de apertura y cierre
cartBtn.addEventListener('click', openCart);
cartTextBtn.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
userBtn.addEventListener('click', openUserModal);
userCloseBtn.addEventListener('click', closeUserModal);
overlay.addEventListener('click', closeAll);

tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.getAttribute('data-tab')));
});

switchToRegisterSpan.addEventListener('click', () => switchTab('register-form'));
switchToLoginSpan.addEventListener('click', () => switchTab('login-form'));

// Eventos submit de formularios
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;
    
    if (password !== confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (await registerUser(name, email, password)) {
        registerForm.reset();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (await loginUser(email, password)) {
        loginForm.reset();
    }
});

logoutBtn.addEventListener('click', logoutUser);

// Menú móvil
menuBarsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('active');
});

document.addEventListener('click', () => {
    if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
});

// ==========================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================
(async function initApp() {
    await loadProducts();
    
    if (supabaseClient) {
        // Escuchar cambios en la sesión de Supabase Auth
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata.nombre_completo || 'Usuario'
                };
                localStorage.setItem('baristas_current_user', JSON.stringify(currentUser));
                await mergeLocalCartToDb();
                await syncCartFromDb();
            } else {
                currentUser = null;
                localStorage.removeItem('baristas_current_user');
                cart = JSON.parse(localStorage.getItem('baristas_cart')) || [];
            }
            updateHeaderUserUI();
            updateCartBadge();
            if (cartDrawer.classList.contains('active')) {
                renderCart();
            }
        });
    } else {
        updateCartBadge();
        updateHeaderUserUI();
    }
})();
