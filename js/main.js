// Registrar Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("pwa-sw.js");
}

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