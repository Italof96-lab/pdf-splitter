from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from jwt import PyJWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from PyPDF2 import PdfReader, PdfWriter
import shutil
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ?? Servir archivos estaticos (Frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")


# ?? Habilitar CORS para evitar bloqueos en el navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite cualquier origen (ajustalo si es necesario)
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los metodos HTTP (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)

# ?? Configuracion de JWT
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ?? Base de datos simulada (Se debe usar una real en produccion)
fake_users_db = {
    "admin": {
        "username": "admin",
        "full_name": "Admin User",
        "hashed_password": "$2b$12$ScwtLsADDFjdafU5Lz.oI.Txa00mVzW/IBeROo/wAGGSgsIvvRB9q",  # Contrasena: 1234
    },
    "milagros": {
        "username": "milagros",
        "full_name": "Milagros User",
        "hashed_password": "$2b$12$slax7iDoL6.e0DnndepGEuNM0uaJzr9tnvs3aWXcSXZFTNXPWbouq",  # Contrasena: 050923
    }
}

# ?? Manejo de contrasenas y autenticacion
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ?? Funcion para verificar contrasenas
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# ?? Funcion para autenticar usuarios
def authenticate_user(username: str, password: str):
    user = fake_users_db.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return False
    return user

# ?? Funcion para crear tokens JWT
def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ?? Endpoint para obtener token de autenticacion
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ?? Middleware para proteger rutas
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalido")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalido")
    return username

# ?? Endpoint protegido (prueba de autenticacion)
@app.get("/protected")
async def protected_route(user: str = Depends(get_current_user)):
    return {"message": "Acceso concedido", "username": user}

# ?? Manejo de archivos PDF
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ?? Endpoint para subir un PDF (requiere autenticacion)
@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return {"filename": file.filename, "message": "Archivo subido correctamente."}

# ?? Endpoint para dividir el PDF (requiere autenticacion)
@app.get("/split/{filename}")
def split_pdf(filename: str, user: str = Depends(get_current_user)):
    input_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(input_path):
        return {"error": "Archivo no encontrado."}

    output_dir = os.path.join(OUTPUT_DIR, filename.split(".pdf")[0])
    os.makedirs(output_dir, exist_ok=True)

    pdf_reader = PdfReader(input_path)
    for page_number, page in enumerate(pdf_reader.pages, start=1):
        pdf_writer = PdfWriter()
        pdf_writer.add_page(page)

        output_pdf_path = os.path.join(output_dir, f"{filename.split('.pdf')[0]}-{page_number}.pdf")
        with open(output_pdf_path, "wb") as output_pdf:
            pdf_writer.write(output_pdf)

    return {"message": "PDF dividido con exito.", "output_folder": output_dir}

# ?? Endpoint para descargar el ZIP con los PDFs divididos (requiere autenticacion)
@app.get("/download_zip/{filename}")
def download_pdf_zip(filename: str, user: str = Depends(get_current_user)):
    output_dir = os.path.join(OUTPUT_DIR, filename)
    zip_path = os.path.join(OUTPUT_DIR, f"{filename}.zip")

    if not os.path.exists(output_dir):
        return {"error": "No se encontraron archivos para comprimir."}

    shutil.make_archive(zip_path.replace(".zip", ""), 'zip', root_dir=output_dir)
    return FileResponse(zip_path, media_type='application/zip', filename=f"{filename}.zip")

# ?? Copyright
@app.get("/copyright")
def copyright_info():
    return {"message": "Copyright Italo Quirozc - Todos los derechos reservados"}

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # Obtiene el puerto de Render o usa 8000 por defecto
    uvicorn.run(app, host="0.0.0.0", port=port)
