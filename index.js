const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_FILE = path.join(__dirname, 'datos.json');
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    config: { nombreApp: "Organización del Hogar" },
    sectores: [
      { id: "s1", nombre: "1 - Gastos fijos" },
      { id: "s2", nombre: "2 - Verdulería" },
      { id: "s3", nombre: "3 - Limpieza" },
      { id: "s4", nombre: "4 - Aseo" },
      { id: "s5", nombre: "5 - Alimentos" },
      { id: "s6", nombre: "6 - Mascotas" },
      { id: "s7", nombre: "7 - Otros" }
    ],
    usuarios: [
      { id: "u1", nombre: "Dueño", codigoAcceso: "1234", rol: "dueno", activo: true },
      { id: "u2", nombre: "Admin", codigoAcceso: "5678", rol: "admin", activo: true },
      { id: "u3", nombre: "Empleado", codigoAcceso: "9012", rol: "staff", activo: true }
    ],
    productos: []
  }, null, 2));
}

function leerDatos() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function guardarDatos(datos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const estilos = `
<style>
    * {margin:0;padding:0;box-sizing:border-box;font-family:Arial}
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
    .btn-rojo {background:#dc2626}
    .btn-amarillo {background:#f59e0b}
    table {width:100%;border-collapse:collapse;margin-top:10px}
    th,td {padding:12px;text-align:left;border-bottom:1px solid #eee}
    .alerta-roja {background:#f8d7da;color:#721c24;padding:10px;border-radius:5px;margin:10px 0;text-align:center}
</style>
`;

app.get('/', (req, res) => {
  const datos = leerDatos();
  res.send(`
    <html><head><title>${datos.config.nombreApp}</title>${estilos}</head>
    <body><div class="contenedor">
      <div class="header">🔐 ${datos.config.nombreApp}</div>
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

app.post('/acceso', (req, res) => {
  const datos = leerDatos();
  const user = datos.usuarios.find(u => u.nombre === req.body.nombre && u.codigoAcceso === req.body.codigo && u.activo);
  if (!user) {
    return res.send(`<div class="contenedor"><div class="alerta-roja tarjeta" style="max-width:400px;margin:auto"><h3>❌ DATOS INCORRECTOS</h3><a href="/" style="color:#721c24;font-weight:bold">Volver a intentar</a></div></div>`);
  }
  res.send(`<script>localStorage.setItem('u',JSON.stringify({id:'${user.id}',rol:'${user.rol}',nombre:'${user.nombre}'}));location.href='/panel';</script>`);
});app.get('/panel', (req, res) => {
  const datos = leerDatos();
  res.send(`
    <html><head><title>Panel de Control</title>${estilos}</head>
    <body><div class="contenedor">
      <div class="header">🏠 Sistema de Gastos <p id="userData" style="font-size:14px;margin-top:5px;opacity:0.9"></p></div>
      <div class="nav">
        <a href="#" onclick="mostrar('inicio');return false;">🏠 Inicio</a>
        <a href="#" onclick="mostrar('cargar');return false;">📝 Cargar Gasto</a>
        <a href="#" onclick="mostrar('historial');return false;">📜 Ver Historial</a>
        <span id="menuAdmin"></span>
        <a href="/" style="color:#dc2626">🚪 Cerrar Sesión</a>
      </div>
      <div id="contenido" class="tarjeta"></div>
    </div>
    <script>
      const datosGlobales = ${JSON.stringify(datos)};
      let usuario;
      window.onload = function() {
        const dato = localStorage.getItem('u');
        if(!dato) return location.href='/';
        usuario = JSON.parse(dato);
        document.getElementById('userData').textContent = 'Conectado: ' + usuario.nombre + ' ('+usuario.rol+')';
        if(usuario.rol === 'dueno' || usuario.rol === 'admin') {
          document.getElementById('menuAdmin').innerHTML += '<a href="#" onclick="mostrar(\\'admin\\');return false;">⚙️ Administrar Usuarios</a>';
        }
        if(usuario.rol === 'dueno') {
          document.getElementById('menuAdmin').innerHTML += '<a href="#" onclick="mostrar(\\'dueno\\');return false;">👑 Configuración</a>';
        }
        mostrar('inicio');
      }

      function mostrar(vista) {
        const c = document.getElementById('contenido');
        if(vista === 'inicio') {
          c.innerHTML = '<h2 style="text-align:center;margin-top:30px">✅ BIENVENIDO AL SISTEMA</h2><p style="text-align:center;margin-top:15px;font-size:16px">Usá el menú de arriba para empezar a cargar o ver gastos.</p>';
        }

        if(vista === 'cargar') {
        let opt = ''; datosGlobales.sectores.forEach( s => { opt += '<option value="' + s.id + '">' + s.nombre + '</option>'; } );
          c.innerHTML = `
          <h2>Cargar Nuevo Gasto</h2>
          <form action="/guardar" method="POST">
            <input name="nombre" required placeholder="¿Qué compraste? Ej: Arroz, Jabón...">
            <select name="sector" required>${opt}</select>
            <input name="precio" type="number" step="0.01" required placeholder="¿Cuánto costó? ($)">
            <button class="btn-verde">💾 GUARDAR REGISTRO</button>
          </form>`;
        }

        if(vista === 'historial') {
          let html = '<h2>Historial Completo</h2><table><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Acción</th></tr>';
          datosGlobales.productos.forEach((p,i)=>{
            const sec = datosGlobales.sectores.find(s=>s.id===p.sector);
            html+=`<tr><td>${p.nombre}</td><td>${sec?sec.nombre:'Sin categoría'}</td><td>$${p.precio}</td><td><a href="/borrar/${i}" class="btn-rojo" style="padding:4px 8px;text-decoration:none;font-size:12px">ELIMINAR</a></td></tr>`;
          });
          html += '</table>'; c.innerHTML = html;
        }

        if(vista === 'admin' && (usuario.rol === 'admin' || usuario.rol === 'dueno')) {
          c.innerHTML = `
          <h2>Crear Nuevo Usuario</h2>
          <form action="/crear-usuario" method="POST">
            <input name="nombre" required placeholder="Nombre completo">
            <input name="codigo" required placeholder="Código de acceso (números)">
            <select name="rol"><option value="staff">Empleado / Trabajador</option><option value="admin">Administrador</option></select>
            <button class="btn-verde">➕ CREAR USUARIO</button>
          </form>`;
        }

        if(vista === 'dueno' && usuario.rol === 'dueno') {
          c.innerHTML = `
          <h2>Actualizar Datos del Dueño</h2>
          <form action="/cambiar-dueno" method="POST">
            <input name="nuevoNombre" required placeholder="Nuevo nombre">
            <input name="nuevoCodigo" required placeholder="Nuevo código">
            <button class="btn-verde">🔄 ACTUALIZAR</button>
          </form>`;
        }
      }
    </script>
    </body></html>
  `);
});

app.post('/guardar', (req, res) => {
  const datos = leerDatos();
  datos.productos.push(req.body);
  guardarDatos(datos);
  res.send(`<script>alert('✅ GASTO GUARDADO CORRECTAMENTE');location.href='/panel#historial';</script>`);
});

app.get('/borrar/:indice', (req, res) => {
  const datos = leerDatos();
  datos.productos.splice(req.params.indice, 1);
  guardarDatos(datos);
  res.redirect('/panel');
});

app.post('/crear-usuario', (req, res) => {
  const datos = leerDatos();
  if(datos.usuarios.some(u => u.codigoAcceso === req.body.codigo)) {
    return res.send(`<script>alert('❌ Ese código ya existe, elegí otro')</script>`);
  }
  req.body.id = 'u'+Date.now();
  req.body.activo = true;
  datos.usuarios.push(req.body);
  guardarDatos(datos);
  res.send(`<script>alert('✅ USUARIO CREADO');location.href='/panel';</script>`);
});

app.post('/cambiar-dueno', (req, res) => {
  const datos = leerDatos();
  const dueno = datos.usuarios.find(u => u.rol === 'dueno');
  dueno.nombre = req.body.nuevoNombre;
  dueno.codigoAcceso = req.body.nuevoCodigo;
  guardarDatos(datos);
  res.send(`<script>alert('✅ DATOS ACTUALIZADOS. Tenés que volver a entrar.');localStorage.clear();location.href='/';</script>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SISTEMA COMPLETO Y FUNCIONANDO');
});
