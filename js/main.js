// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

// Registrar Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("pwa-sw.js").catch(err => 
    console.error("Error al registrar Service Worker:", err)
  );
}

// Variables globales
let deferredPrompt = null;
let installBannerShown = false;
let db = null;

const DB_NAME = "CherryDB";
const STORE_NAME = "cerezas";

// ==========================================
// INDEXEDDB - Base de datos
// ==========================================

const req = indexedDB.open(DB_NAME, 1);
req.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};
req.onsuccess = e => {
  db = e.target.result;
  listar();
};

// ==========================================
// NOTIFICACIONES - Sistema mejorado
// ==========================================

async function solicitarPermisoNotificaciones() {
  if (!("Notification" in window)) {
    alert("Tu navegador no soporta notificaciones");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    alert("Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración del navegador.");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

async function enviarNotificacion() {
  // Frases creativas sobre cerezas
  const frasesCerezas = [
    "🍒 Las cerezas rojas brillan en el árbol primaveral. Dulce fruto que ilumina con su sabor especial.",
    "🍒 Cereza dulce, fruto rojo que alegra el paladar. En cada bocado, un abrazo de sabor sin igual.",
    "🍒 Roja como la pasión, dulce como el amor. La cereza es la razón de un sabroso sabor.",
    "🍒 Cerezas frescas, carnosas y jugosas. ¡El tesoro rojo de la naturaleza!",
    "🍒 Cada cereza es una pequeña joya roja llena de dulzura y energía vital."
  ];
  
  const fraseAleatoria = frasesCerezas[Math.floor(Math.random() * frasesCerezas.length)];
  
  // Mostrar mensaje emergente
  alert(fraseAleatoria);

  // Solicitar permisos y enviar notificación
  const tienePermiso = await solicitarPermisoNotificaciones();
  
  if (!tienePermiso) {
    return;
  }

  const opciones = {
    body: "🍒 ¡Tu inventario de cerezas está actualizado!",
    icon: "img/fav-192.png",
    badge: "img/fav-192.png",
    tag: "cherry-notification",
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  // Enviar notificación desde el contexto principal
  if (Notification.permission === "granted") {
    new Notification("CherryManager", opciones);
  }

  // También enviar desde el Service Worker si está disponible
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification("CherryManager", opciones);
    });
  }
}

// ==========================================
// PWA INSTALLATION - Sistema de instalación
// ==========================================

function mostrarBannerInstalacion() {
  if (installBannerShown || document.getElementById("install-banner")) {
    return;
  }

  const banner = document.createElement("div");
  banner.id = "install-banner";
  banner.className = "alert alert-info alert-dismissible fade show position-fixed bottom-0 start-50 translate-middle-x m-3 shadow";
  banner.style.cssText = "max-width: 90%; z-index: 10000;";

  banner.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <i class="bi bi-phone fs-4"></i>
      <div class="flex-grow-1">
        <strong>Instala CherryManager</strong>
        <div class="small">Acceso rápido desde tu pantalla principal</div>
      </div>
      <button id="btn-install" class="btn btn-light btn-sm me-2">
        Instalar
      </button>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  document.body.appendChild(banner);
  installBannerShown = true;

  document.getElementById("btn-install").onclick = instalarPWA;
}

async function instalarPWA() {
  if (!deferredPrompt) {
    alert("La instalación no está disponible en este momento.");
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`Usuario ${outcome === "accepted" ? "aceptó" : "rechazó"} instalar la PWA`);
  
  deferredPrompt = null;
  ocultarBannersInstalacion();
}

function ocultarBannersInstalacion() {
  const banner = document.getElementById("install-banner");
  if (banner) banner.remove();
  
  const btnInstalar = document.getElementById("instalar-app");
  if (btnInstalar) btnInstalar.classList.add("d-none");
}

// ==========================================
// CRUD - Operaciones de inventario
// ==========================================

function listar() {
  const lista = document.getElementById("lista");
  if (!lista) return;

  lista.innerHTML = "";
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      
      li.innerHTML = `
        <div class="flex-grow-1">
          <strong>${escapeHtml(cursor.value.nombre)}</strong>
          <span class="badge bg-primary rounded-pill ms-2">${cursor.value.cantidad} unidades</span>
        </div>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="editar(${cursor.key}, '${escapeHtml(cursor.value.nombre)}', ${cursor.value.cantidad})">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-outline-danger" onclick="eliminar(${cursor.key})">
            <i class="bi bi-trash"></i> Eliminar
          </button>
        </div>
      `;
      
      lista.appendChild(li);
      cursor.continue();
    }
  };
}

function editar(id, nombreActual, cantidadActual) {
  const nombre = prompt("Nuevo nombre:", nombreActual);
  if (!nombre) return;
  
  const cantidad = parseInt(prompt("Nueva cantidad:", cantidadActual));
  if (!cantidad || cantidad < 1) return;
  
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put({ id, nombre, cantidad });
  tx.oncomplete = listar;
}

function eliminar(id) {
  if (!confirm("¿Eliminar esta cereza del inventario?")) return;
  
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  tx.oncomplete = listar;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ==========================================
// EVENT LISTENERS - Inicialización
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const btnInstalar = document.getElementById("instalar-app");
  const btnNotificar = document.getElementById("notificar");
  const btnAgregar = document.getElementById("agregar");

  // Evento de instalación PWA
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (btnInstalar && !window.matchMedia("(display-mode: standalone)").matches) {
      btnInstalar.classList.remove("d-none");
    }
    
    if (!installBannerShown && !window.matchMedia("(display-mode: standalone)").matches) {
      mostrarBannerInstalacion();
    }
  });

  // Detectar si ya está instalada
  if (window.matchMedia("(display-mode: standalone)").matches && btnInstalar) {
    btnInstalar.classList.add("d-none");
  }

  // Botón de instalación
  if (btnInstalar) {
    btnInstalar.onclick = instalarPWA;
  }

  // Botón de notificación
  if (btnNotificar) {
    btnNotificar.onclick = enviarNotificacion;
  }

  // Botón agregar
  if (btnAgregar) {
    btnAgregar.onclick = () => {
      const nombreInput = document.getElementById("nombre");
      const cantidadInput = document.getElementById("cantidad");
      
      const nombre = nombreInput.value.trim();
      const cantidad = parseInt(cantidadInput.value);
      
      if (!nombre || !cantidad || cantidad < 1) {
        alert("Por favor, completa todos los campos correctamente.");
        return;
      }
      
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add({ nombre, cantidad });
      tx.oncomplete = () => {
        listar();
        nombreInput.value = "";
        cantidadInput.value = "";
        nombreInput.focus();
      };
    };
  }
});

// Detectar cuando la PWA es instalada
window.addEventListener("appinstalled", () => {
  console.log("PWA instalada exitosamente");
  deferredPrompt = null;
  ocultarBannersInstalacion();
});
