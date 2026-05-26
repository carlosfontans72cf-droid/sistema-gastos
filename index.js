const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONEXIÓN A MONGO DB ATLAS ---
// Usa la variable de entorno de Render o una base local por defecto
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/organizacion_hogar';
mongoose.connect(MONGO_URI)
  .then(() => console.log('🔌 Conectado exitosamente a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// --- MODELOS DE DATOS (Mongoose) ---
const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigoAcceso: { type: String, required: true, unique: true },
  rol: { type: String, enum: ['dueno', 'admin', 'staff'], default: 'staff' },
  activo: { type: Boolean, default: true }
});

const GastoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  sector: { type: String, required: true },
  precio: { type: Number, required: true },
  fecha: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);
const Gasto = mongoose.model('Gasto', GastoSchema);

// Sectores fijos del sistema
const SECTORES = [
  { id: "s1", nombre: "1 - Gastos fijos" },
  { id: "s2", nombre: "2 - Verdulería" },
  { id: "s3", nombre: "3 - Limpieza" },
  { id: "s4", nombre: "4 - Aseo" },
  { id: "s5", nombre: "5 - Alimentos" },
  { id: "s6", nombre: "6 - Mascotas" },
  { id: "s7", nombre: "7 - Otros" }
];

// Crea el usuario Dueño inicial si la base de datos está totalmente vacía
async function crearDuenoInicial() {
  try {
    const existe = await Usuario.findOne({ rol: 'dueno' });
    if (!existe) {
      await Usuario.create({
        nombre: "Dueño",
        codigoAcceso: "1234",
        rol: "dueno",
        activo: true
      });
      console.log('👑 Usuario Dueño inicial creado (Código: 1234)');
    }
  } catch (error) {
    console.error('Error al inicializar dueño:', error);
  }
}
crearDuenoInicial();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones seguras en el servidor (Reemplaza LocalStorage)
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave-secreta-local-123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 3600000 } // 1 hora de sesión activa
}));

// Protectores de rutas (Seguridad del Backend)
const requerirAutenticacion = (req, res, next) => {
  if (!req.session.usuario) return res.redirect('/');
  next();
};

const requerirRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.session.usuario || !rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).send('❌ Acceso denegado: No tenés permisos para realizar esta acción.');
    }
    next();
  };
};

// --- TUS ESTILOS ORIGINALES ---
const estilos = `
<style>
    * {margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
    body {background:#f0f2f5;padding:20px}
    .contenedor {max-width:1100px;margin:auto}
    .header {background:#2c3e50;color:white;padding:20px;border-radius:10px;text-align:center;font-size:22px;font-weight:bold;margin-bottom:20px}
    .nav {text-align:center;margin:15px 0}
    .nav a {display:inline-block;margin:0 8px;padding:10px 16px;background:#eff6ff;border-radius:8px;text-decoration:none;color:#2563eb;font-weight:bold;border:1px solid #dbeafe}
    .nav a:hover {background:#dbeafe}
    .tarjeta {background:white;border-radius:10px;padding:20px;min-height:300px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
    input,select,button {width:100%;padding:10px;margin:8px 0;border-radius:5px;border:1px solid #ddd;font-size:15px}
    button {background:#2563eb;color:white;font-weight:bold;border:none;cursor:pointer}
    .btn-verde {background:#16a34a}
    .btn-rojo {background:#dc2626; color:white; padding:4px 8px; text-decoration:none; border-radius:5px; font-size:12px}
    table {width:100%;border-collapse:collapse;margin-top:10px}
    th,td {padding:12px;text-align:left;border-bottom:1px solid #eee}
    .alerta-roja {background:#f8d7da;color:#721c24;padding:10px;border-radius:5px;margin:10px 0;text-align:center}
</style>
`;

// --- VISTA DE LOGIN ---
app.get('/', (req, res) => {
  if (req.session.usuario) return res.redirect('/panel');
  res.send(`
    <html><head><title>Organización del Hogar</title>${estilos}</head>
    <body><div class="contenedor">
      <div class="header">🔐 Organización del Hogar</div>
      <div class="tarjeta" style="max-width:400px;margin:auto">
        <h2 style="text-align:center">Ingresar al Sistema</h2>
        <form action="/acceso" method="POST">
          <input type="text" name="nombre" required placeholder="Tu Nombre Completo">
          <input type="password" name="codigo" required placeholder="Código de Acceso">
          <button>ENTRAR</button>
        </form>
      </div>
    </div></body></html>
  `);
});

app.post('/acceso', async (req, res) => {
  try {
    const user = await Usuario.findOne({ nombre: req.body.nombre, codigoAcceso: req.body.codigo, activo: true });
    if (!user) {
      return res.send(`<head>${estilos}</head><div class="contenedor"><div class="alerta-roja tarjeta" style="max-width:400px;margin:auto"><h3>❌ DATOS INCORRECTOS</h3><br><a href="/" style="color:#721c24;font-weight:bold">Volver a intentar</a></div></div>`);
    }
    // Guarda los datos en la sesión segura del servidor
    req.session.usuario = { id: user._id, rol: user.rol, nombre: user.nombre };
    res.redirect('/panel');
  } catch (err) {
    res.status(500).send('Error al procesar el ingreso.');
  }
});

app.get('/cerrar-sesion', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// --- VISTA DEL PANEL PRINCIPAL ---
app.get('/panel', requerirAutenticacion, async (req, res) => {
  try {
    const usuario = req.session.usuario;
    // Trae de MongoDB todos los gastos actuales ordenados del más nuevo al más viejo
    const productos = await Gasto.find().sort({ fecha: -1 });

    res.send(`
      <html><head><title>Panel de Control</title>${estilos}</head>
      <body><div class="contenedor">
        <div class="header">🏠 Sistema de Gastos <p style="font-size:14px;margin-top:5px;opacity:0.9">Conectado: ${usuario.nombre} (${usuario.rol})</p></div>
        <div class="nav">
          <a href="#" onclick="mostrar('inicio');return false;">🏠 Inicio</a>
          <a href="#" onclick="mostrar('cargar');return false;">📝 Cargar Gasto</a>
          <a href="#" onclick="mostrar('historial');return false;">📜 Ver Historial</a>
          ${['dueno', 'admin'].includes(usuario.rol) ? `<a href="#" onclick="mostrar('admin');return false;">⚙️ Usuarios</a>` : ''}
          ${usuario.rol === 'dueno' ? `<a href="#" onclick="mostrar('dueno');return false;">👑 Configuración</a>` : ''}
          <a href="/cerrar-sesion" style="background:#ffeeee;color:#dc2626;border-color:#fecaca">🚪 Cerrar Sesión</a>
        </div>
        <div id="contenido" class="tarjeta"></div>
      </div>
      <script>
        const sectoresGlobales = ${JSON.stringify(SECTORES)};
        const listaProductos = ${JSON.stringify(productos)};

        function mostrar(vista) {
          const c = document.getElementById('contenido');
          
          if(vista === 'inicio') {
            c.innerHTML = '<h2 style="text-align:center;margin-top:30px">✅ BIENVENIDO AL SISTEMA</h2><p style="text-align:center;margin-top:15px;font-size:16px">Los datos se sincronizan en tiempo real con MongoDB Atlas.</p>';
          }
          
          if(vista === 'cargar') {
            let opt = sectoresGlobales.map(s => \`<option value="\${s.id}">\${s.nombre}</option>\`).join('');
            c.innerHTML = \`
              <h2>Cargar Nuevo Gasto</h2>
              <form action="/guardar" method="POST">
                <input name="nombre" required placeholder="¿Qué compraste?">
                <select name="sector" required>\${opt}</select>
                <input name="precio" type="number" step="0.01" required placeholder="¿Cuánto costó? ($)">
                <button class="btn-verde">💾 GUARDAR REGISTRO</button>
              </form>
            \`;
          }
          
          if(vista === 'historial') {
            let filas = listaProductos.map((p) => {
              const sec = sectoresGlobales.find(s => s.id === p.sector);
              return \`
                <tr>
                  <td>\${p.nombre}</td>
                  <td>\${sec ? sec.nombre : 'Sin categoría'}</td>
                  <td>$\${p.precio}</td>
                  <td><a href="/borrar/\${p._id}" class="btn-rojo" onclick="return confirm('¿Seguro que querés borrar este gasto?')">ELIMINAR</a></td>
                </tr>
              \`;
            }).join('');
            
            c.innerHTML = \`
              <h2>Historial Completo</h2>
              <table>
                <tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Acción</th></tr>
                \${filas || '<tr><td colspan="4" style="text-align:center">No hay gastos cargados aún.</td></tr>'}
              </table>
            \`;
          }
          
          if(vista === 'admin') {
            c.innerHTML = \`
              <h2>Crear Nuevo Usuario</h2>
              <form action="/crear-usuario" method="POST">
                <input name="nombre" required placeholder="Nombre completo">
                <input name="codigo" required placeholder="Código de acceso (números)">
                <select name="rol">
                  <option value="staff">Empleado / Trabajador</option>
                  <option value="admin">Administrador</option>
                </select>
                <button class="btn-verde">➕ CREAR USUARIO</button>
              </form>
            \`;
          }
          
          if(vista === 'dueno') {
            c.innerHTML = \`

