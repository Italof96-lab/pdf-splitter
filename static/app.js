document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
});

// ?? URL del Backend
const BASE_URL = "https://pdf-splitter-v9wm.onrender.com";

// ?? Verifica si el usuario est芍 autenticado
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    const loginSection = document.getElementById("loginSection");
    const appSection = document.getElementById("appSection");
    const welcomeMessage = document.getElementById("welcomeMessage");

    if (!loginSection || !appSection || !welcomeMessage) {
        console.error("No se encontraron los elementos necesarios.");
        return;
    }

    if (token) {
        loginSection.classList.add("hidden");
        appSection.classList.remove("hidden");
        welcomeMessage.innerText = `Hola, ${username}!`;  // Muestra el nombre del usuario
    } else {
        loginSection.classList.remove("hidden");
        appSection.classList.add("hidden");
        welcomeMessage.innerText = "";  // Oculta el mensaje si no hay sesion
    }
}


// ?? Funci車n para iniciar sesi車n y obtener el token JWT
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        showToast("Por favor, ingresa usuario y contrase?a.", "red");
        return;
    }

    let formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
        let response = await fetch(`${BASE_URL}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
        });

        let result = await response.json();

        if (response.ok) {
            localStorage.setItem("token", result.access_token);
            localStorage.setItem("username", username);

            showToast("Inicio de sesi車n exitoso.", "green");
            setTimeout(() => checkLoginStatus(), 500);
        } else {
            showToast(result.detail || "Usuario o contrase?a incorrectos.", "red");
        }
    } catch (error) {
        console.error("Error en login:", error);
        showToast("Error al conectar con el servidor.", "red");
    }
}

// ?? Funci車n para cerrar sesi車n
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    showToast("Has cerrado sesi車n.", "blue");
    setTimeout(() => location.reload(), 1000);
}

// ?? Funci車n para subir PDF con autenticaci車n
async function uploadPDF() {
    let fileInput = document.getElementById("pdfFile").files[0];
    if (!fileInput) {
        showToast("Por favor, selecciona un archivo PDF.", "red");
        return;
    }

    let formData = new FormData();
    formData.append("file", fileInput);

    try {
        let response = await fetch(`${BASE_URL}/upload/`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
            body: formData
        });

        let result = await response.json();

        if (response.ok) {
            showToast("Archivo subido correctamente.", "green");
        } else {
            showToast(result.error || "Error al subir el archivo.", "red");
        }
    } catch (error) {
        console.error("Error en uploadPDF:", error);
        showToast("Error al conectar con el servidor.", "red");
    }
}

// ?? Funci車n para dividir el PDF con autenticaci車n
async function splitPDF() {
    let filename = document.getElementById("filename").value.trim();
    let loadingBar = document.getElementById("loadingBar");

    if (!filename) {
        showToast("Ingresa el nombre del archivo (sin .pdf).", "red");
        return;
    }

    try {
        // ?? Mostrar la barra de carga al iniciar el proceso
        loadingBar.classList.remove("hidden");

        let response = await fetch(`${BASE_URL}/split/${filename}.pdf`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (response.ok) {
            setTimeout(() => {
                loadingBar.classList.add("hidden"); // ?? Ocultar la barra de carga despues de completar
            }, 1000);

            showToast("PDF dividido con exito.", "yellow");
        } else {
            loadingBar.classList.add("hidden");
            showToast("Error al dividir el PDF.", "red");
        }
    } catch (error) {
        console.error("Error en splitPDF:", error);
        loadingBar.classList.add("hidden");
        showToast("Error al conectar con el servidor.", "red");
    }
}

// ?? Funci車n para descargar el ZIP del PDF con autenticaci車n
async function downloadZip() {
    let filename = document.getElementById("filename").value.trim();
    if (!filename) {
        showToast("Ingresa el nombre del archivo para descargar el ZIP.", "red");
        return;
    }

    try {
        let response = await fetch(`${BASE_URL}/download_zip/${filename}`, {
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });

        if (response.ok) {
            let blob = await response.blob();
            let link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = `${filename}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Descarga iniciada.", "green");
        } else {
            showToast("No se encontr車 el archivo ZIP.", "red");
        }
    } catch (error) {
        console.error("Error en downloadZip:", error);
        showToast("Error al conectar con el servidor.", "red");
    }
}

// ?? Funci車n para mostrar mensajes flotantes (Toasts)
function showToast(message, color) {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        console.error("No se encontr車 el contenedor de notificaciones.");
        return;
    }

    let toast = document.createElement("div");
    toast.className = `bg-${color}-500 text-white px-4 py-2 rounded shadow-lg fixed top-5 right-5 opacity-100 transition-opacity duration-300 transform translate-x-0`;
    toast.style.minWidth = "250px";
    toast.style.textAlign = "center";
    toast.style.padding = "10px 20px";
    toast.style.margin = "10px";
    toast.style.borderRadius = "5px";
    toast.style.fontWeight = "bold";
    toast.innerHTML = message;

    toastContainer.appendChild(toast);

    // ?? Desaparecer芍 despu谷s de 3 segundos con animaci車n
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(10px)";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
