document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
});

// ?? Verifica si el usuario est芍 autenticado
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    
    if (token) {
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("appSection").classList.remove("hidden");
    } else {
        document.getElementById("loginSection").classList.remove("hidden");
        document.getElementById("appSection").classList.add("hidden");
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
        let response = await fetch("http://127.0.0.1:8000/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
        });

        let result = await response.json();

        if (response.ok) {
            // ?? Guardar token en LocalStorage
            localStorage.setItem("token", result.access_token);
            localStorage.setItem("username", username);

            // ?? Mostrar mensaje de 谷xito y actualizar UI
            showToast("Inicio de sesion exitoso.", "green");
            setTimeout(() => checkLoginStatus(), 500);
        } else {
            showToast("Usuario o contrase?a incorrectos.", "red");
        }
    } catch (error) {
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

    let response = await fetch("http://127.0.0.1:8000/upload/", {
        method: "POST",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") },
        body: formData
    });

    let result = await response.json();

    if (response.ok) {
        showToast("Archivo subido correctamente.", "green");
    } else {
        showToast("Error al subir el archivo.", "red");
    }
}

// ?? Funci車n para dividir el PDF con autenticaci車n
async function splitPDF() {
    let filename = document.getElementById("filename").value.trim();
    if (!filename) {
        showToast("Ingresa el nombre del archivo (sin .pdf).", "red");
        return;
    }

    let response = await fetch(`http://127.0.0.1:8000/split/${filename}.pdf`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });

    if (response.ok) {
        showToast("PDF dividido con 谷xito.", "yellow");
    } else {
        showToast("Error al dividir el PDF.", "red");
    }
}

// ?? Funci車n para descargar el ZIP del PDF con autenticaci車n
async function downloadZip() {
    let filename = document.getElementById("filename").value.trim();
    if (!filename) {
        showToast("Ingresa el nombre del archivo para descargar el ZIP.", "red");
        return;
    }

    let response = await fetch(`http://127.0.0.1:8000/download_zip/${filename}`, {
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
}

// ?? Funci車n para mostrar mensajes flotantes (Toasts)
function showToast(message, color) {
    let toast = document.createElement("div");
    toast.className = `bg-${color}-500 text-white px-4 py-2 rounded shadow-lg fixed top-5 right-5 opacity-100 transition-opacity duration-300 transform translate-x-0`;
    toast.style.minWidth = "250px";
    toast.style.textAlign = "center";
    toast.style.padding = "10px 20px";
    toast.style.margin = "10px";
    toast.style.borderRadius = "5px";
    toast.style.fontWeight = "bold";
    toast.innerHTML = message;

    let toastContainer = document.getElementById("toast-container");
    toastContainer.appendChild(toast);

    // ?? Desaparecer芍 despu谷s de 3 segundos con animaci車n
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(10px)";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
