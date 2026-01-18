// Registrar Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("pwa-sw.js");
}

// Variables para el banner de instalación
let deferredPrompt;
let installBannerShown = false;

// Funcionalidad de Notificaciones
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
  // Mostrar mensaje emergente con poema sobre cerezas
  const poemas = [
    "🍒 Las cerezas rojas brillan,\nen el árbol primaveral.\nDulce fruto que ilumina,\ncon su sabor especial.",
    "🍒 Cereza dulce, fruto rojo,\nque alegra el paladar.\nEn cada bocado, un abrazo,\nde sabor sin igual.",
    "🍒 Roja como la pasión,\ndulce como el amor.\nLa cereza es la razón,\nde un sabroso sabor."
  ];
  
  const poemaAleatorio = poemas[Math.floor(Math.random() * poemas.length)];
  alert(poemaAleatorio);

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
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("CherryManager", opciones);
  }

  // También enviar desde el Service Worker si está disponible (para PWA instalada)
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification("CherryManager", opciones);
    });
  }
}

let db;
const DB_NAME = "CherryDB";
const STORE_NAME = "cerezas";

const req = indexedDB.open(DB_NAME, 1);
req.onupgradeneeded = e => {
  const db = e.target.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
  }
};
req.onsuccess = e => {
  db = e.target.result;
  listar();
};

// Event listeners cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Banner de instalación PWA
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevenir que el banner se muestre automáticamente
    e.preventDefault();
    // Guardar el evento para usarlo más tarde
    deferredPrompt = e;
    
    // Mostrar banner personalizado si no se ha mostrado antes
    if (!installBannerShown && !window.matchMedia("(display-mode: standalone)").matches) {
      mostrarBannerInstalacion();
    }
  });

  // Detectar si la PWA ya está instalada
  if (window.matchMedia("(display-mode: standalone)").matches) {
    console.log("PWA ya está instalada");
  }

  // Botón de notificación
  const btnNotificar = document.getElementById("notificar");
  if (btnNotificar) {
    btnNotificar.onclick = enviarNotificacion;
  }

  // Botón agregar
  const btnAgregar = document.getElementById("agregar");
  if (btnAgregar) {
    btnAgregar.onclick = () => {
      const nombre = document.getElementById("nombre").value.trim();
      const cantidad = parseInt(document.getElementById("cantidad").value);
      if (!nombre || !cantidad) return alert("Completa todos los campos");
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add({ nombre, cantidad });
      tx.oncomplete = () => {
        listar();
        document.getElementById("nombre").value = "";
        document.getElementById("cantidad").value = "";
      };
    };
  }
});

// Listar
function listar() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${cursor.value.nombre} - ${cursor.value.cantidad} unidades</span>
        <div>
          <button onclick="editar(${cursor.key}, '${cursor.value.nombre}', ${cursor.value.cantidad})">Editar</button>
          <button onclick="eliminar(${cursor.key})">Eliminar</button>
        </div>
      `;
      lista.appendChild(li);
      cursor.continue();
    }
  };
}

// Editar
function editar(id, nombreActual, cantidadActual) {
  const nombre = prompt("Nuevo nombre:", nombreActual);
  const cantidad = parseInt(prompt("Nueva cantidad:", cantidadActual));
  if (!nombre || !cantidad) return;
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put({ id, nombre, cantidad });
  tx.oncomplete = listar;
}

// Eliminar
function eliminar(id) {
  if (!confirm("¿Eliminar esta cereza?")) return;
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  tx.oncomplete = listar;
}

// Función para mostrar banner de instalación
function mostrarBannerInstalacion() {
  // Buscar si ya existe un banner
  let banner = document.getElementById("install-banner");
  if (banner) {
    return; // Ya existe, no mostrar de nuevo
  }

  // Crear banner
  banner = document.createElement("div");
  banner.id = "install-banner";
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #c2185b 0%, #8e1650 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 15px;
    font-family: Arial, sans-serif;
    max-width: 90%;
    animation: slideUp 0.3s ease-out;
  `;

  // Agregar estilos CSS para animación
  if (!document.getElementById("install-banner-styles")) {
    const style = document.createElement("style");
    style.id = "install-banner-styles";
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  banner.innerHTML = `
    <span style="font-size: 24px;">📱</span>
    <div>
      <strong>Instala CherryManager</strong>
      <div style="font-size: 12px; margin-top: 3px;">Acceso rápido desde tu pantalla principal</div>
    </div>
    <button id="btn-install" style="
      background: white;
      color: #c2185b;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    ">Instalar</button>
    <button id="btn-dismiss" style="
      background: transparent;
      color: white;
      border: 1px solid white;
      padding: 8px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    ">✕</button>
  `;

  document.body.appendChild(banner);
  installBannerShown = true;

  // Event listeners para los botones
  document.getElementById("btn-install").onclick = instalarPWA;
  document.getElementById("btn-dismiss").onclick = () => {
    banner.remove();
  };
}

// Función para instalar la PWA
async function instalarPWA() {
  if (!deferredPrompt) {
    alert("La instalación no está disponible en este momento.");
    return;
  }

  // Mostrar el prompt de instalación
  deferredPrompt.prompt();
  
  // Esperar a que el usuario responda
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === "accepted") {
    console.log("Usuario aceptó instalar la PWA");
  } else {
    console.log("Usuario rechazó instalar la PWA");
  }
  
  // Limpiar el prompt
  deferredPrompt = null;
  
  // Ocultar el banner
  const banner = document.getElementById("install-banner");
  if (banner) {
    banner.remove();
  }
}

// Detectar cuando la PWA es instalada
window.addEventListener("appinstalled", () => {
  console.log("PWA instalada exitosamente");
  deferredPrompt = null;
  const banner = document.getElementById("install-banner");
  if (banner) {
    banner.remove();
  }
});