const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Base de datos
const DATA_FILE = path.join(__dirname, 'datos.json');
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    config: { 
      nombreApp: "Organización del Hogar",
      dineroInicial: 0,  // DINERO CON EL QUE ARRANCÁS
      totalGastado: 0    // LO QUE LLEVÁS GASTADO
    },
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

function leerDatos() { return JSON.parse(fs.readFileSync(DATA_FILE)); }
function guardarDatos(datos) { fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2)); }

// Función para calcular totales automáticamente
function calcularTotales(datos) {
  let total = 0;
  datos.productos.forEach(p => {
    total += parseFloat(p.precio);
  });
  datos.config.totalGastado = total;
  guardarDatos(datos);
  return total;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ESTILOS MEJORADOS
const estilos = `
<style>
    * {margin:0;padding:0;box-sizing:border-box;font-family:Arial}
    body {background:#f0f2f5;padding:20px}
    .contenedor {max-width:1100px;margin:auto}
    .header {background:#2c3e50;color:white;padding:20px;border-radius:10px;text-align:center;font-size:22px;font-weight:bold;margin-bottom:10px}
    .resumen {background:white;padding:15px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:20px;display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:10px;}
    .resumen div {padding:8px 15px;border-radius:8px;font-weight:bold;}
    .ini {background:#e3f2fd;color:#0d47a1;}
    .gas {background:#fff3e0;color:#e65100;}
    .saldo {background:#e8f5e9;color:#2e7d32;font-size:18px;}
    .saldo.rojo {background:#ffebee;color:#c62828;}
    .nav {text-align:center;margin:15px 0}
    .nav a {display:inline-block;margin:0 5px;padding:10px 12px;background:#eff6ff;border-radius:8px;text-decoration:none;color:#2563eb;font-weight:bold;border:1px solid #dbeafe;font-size:14px;}
    .nav a:hover {background:#dbeafe}
    .tarjeta {background:white;border-radius:10px;padding:20px;min-height:300px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
    input,select,button {width:100%;padding:12px;margin:8px 0;border-radius:5px;border:1px solid #ddd;font-size:15px}
    button {background:#2563eb;color:white;font-weight:bold;border:none;cursor:pointer}
    .btn-verde {background:#16a34a}
    .btn-rojo {background:#dc2626}
    table {width:100%;border-collapse:collapse;margin-top:10px}
    th,td {padding:12px;text-align:left;border-bottom:1px solid #eee}
    .alerta-roja {background:#f8d7da;color:#721c24;padding:10px;border-radius:5px;margin:10px 0;text-align:center}
</style>
`;

// LOGIN
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
});

// PANEL PRINCIPAL
app.get('/panel', (req, res) => {
  const datos = leerDatos();
  const totalGastado = calcularTotales(datos);
  const saldo = datos.config.dineroInicial - totalGastado;
  
  res.send(`
    <html><head><title>Panel de Control</title>${estilos}</head>
    <body><div class="contenedor">
      <div class="header">🏠 Sistema de Gastos 
        <p id="userData" style="font-size:14px;margin-top:5px;opacity:0.9"></p>
      </div>
      
      <!-- 💵 RESUMEN DE DINERO (SIEMPRE VISIBLE) -->
      <div class="resumen">
        <div class="ini">Dinero Inicial:<br>$ ${datos.config.dineroInicial.toLocaleString('es-ES')}</div>
        <div class="gas">Total Gastado:<br>$ ${totalGastado.toLocaleString('es-ES')}</div>
        <div class="saldo ${saldo < 0 ? 'rojo' : ''}">LO QUE QUEDA:<br>$ ${saldo.toLocaleString('es-ES')}</div>
      </div>

      <!-- 🧭 MENÚ - ARREGLADO Y COMPLETO -->
      <div class="nav" id="menuPrincipal">
        <a href="#" onclick="mostrar('inicio'); return false;">🏠 Inicio</a>
        <a href="#" onclick="mostrar('cargar'); return false;">📝 Cargar Gasto</a>
        <a href="#" onclick="mostrar('historial'); return false;">📜 Ver Historial</a>
        
        <!-- OPCIONES DE ADMIN / DUEÑO (OCULTAS AL PRINCIPIO) -->
        <a id="opcionAdmin" href="#" onclick="mostrar('admin'); return false;" style="display:none;">⚙️ Administrar</a>
        <a id="opcionDinero" href="#" onclick="mostrar('dinero'); return false;" style="display:none;">💰 Poner Dinero</a>
        <a id="opcionConfig" href="#" onclick="mostrar('dueno'); return false;" style="display:none;">👑 Configuración</a>
        
        <a href="/" style="color:#dc2626">🚪 Salir</a>
      </div>

      <!-- 📄 CONTENIDO DINÁMICO -->
      <div id="contenido" class="tarjeta"></div>
    </div>

    <script>
      const datosGlobales = ${JSON.stringify(datos)};
      let usuario;
      
      window.onload = function() {
        const dato = localStorage.getItem('u');
        if (!dato) { location.href='/'; return; }
        
        usuario = JSON.parse(dato);
        document.getElementById('userData').textContent = 'Conectado: ' + usuario.nombre + ' (' + usuario.rol + ')';

        // ✅ MOSTRAR OPCIONES SEGÚN ROL (100% FUNCIONANDO)
        if (usuario.rol === 'dueno' || usuario.rol === 'admin') {
          document.getElementById('opcionAdmin').style.display = 'inline-block';
        }
        if (usuario.rol === 'dueno') {
          document.getElementById('opcionDinero').style.display = 'inline-block'; // Solo dueño pone la plata
          document.getElementById('opcionConfig').style.display = 'inline-block';
        }

        mostrar('inicio');
      }

      function mostrar(vista) {
        const c = document.getElementById('contenido');
        let html = '';

        // 🏠 INICIO
        if (vista === 'inicio') {
          html = '<h2 style="text-align:center;margin-top:30px">✅ BIENVENIDO AL SISTEMA</h2>' +
                 '<p style="text-align:center;margin-top:15px;font-size:16px">Arriba tenés el resumen de tu dinero. Usá el menú para cargar gastos o administrar.</p>';
        }

        // 📝 CARGAR GASTO
        if (vista === 'cargar') {
          let opt = ''; 
          datosGlobales.sectores.forEach(function(s) { 
            opt += '<option value="' + s.id + '">' + s.nombre + '</option>'; 
          });
          html = '<h2>Cargar Nuevo Gasto</h2>' +
                 '<form action="/guardar" method="POST">' +
                 '<input name="nombre" required placeholder="Ej: Arroz, Jabón, Carne...">' +
                 '<select name="sector" required>' + opt + '</select>' +
                 '<input name="precio" type="number" step="0.01" required placeholder="Precio del gasto ($)">' +
                 '<button class="btn-verde">💾 GUARDAR Y ACTUALIZAR TOTALES</button>' +
                 '</form>';
        }

        // 📜 HISTORIAL CON TOTALES
        if (vista === 'historial') {
          let totalVista = 0;
          html = '<h2>Historial Completo de Gastos</h2>' +
                 '<table><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Acción</th></tr>';
          
          datosGlobales.productos.forEach(function(p, i) {
            const sec = datosGlobales.sectores.find(s => s.id === p.sector);
            totalVista += parseFloat(p.precio);
            html += '<tr><td>' + p.nombre +'</td><td>' + (sec ? sec.nombre : 'Sin categoría') + '</td><td>$ ' + p.precio + '</td><td><a href="/borrar/' + i + '" class="btn-rojo" style="padding:4px 8px;text-decoration:none;font-size:12px">ELIMINAR</a></td></tr>';
          });
          
          // PONEMOS EL TOTAL AL FINAL DE LA TABLA
          html += '<tr style="background:#f8f9fa;font-weight:bold"><td colspan="2">TOTAL GASTADO</td><td colspan="2">$ ' + totalVista + '</td></tr>';
          html += '</table>';
        }

        // ⚙️ ADMINISTRAR USUARIOS
        if (vista === 'admin' && (usuario.rol === 'admin' || usuario.rol === 'dueno')) {
          html = '<h2>Crear Nuevo Usuario</h2>' +
                 '<form action="/crear-usuario" method="POST">' +
                 '<input name="nombre" required placeholder="Nombre completo">' +
                 '<input name="codigo" required placeholder="Código numérico">' +
                 '<select name="rol"><option value="staff">Empleado</option><option value="admin">Administrador</option></select>' +
                 '<button class="btn-verde">➕ CREAR USUARIO</button>' +
                 '</form>';
        }

        // 💰 PONER DINERO INICIAL (SOLO DUEÑO)
        if (vista === 'dinero' && usuario.rol === 'dueno') {
          html = '<h2>Definir Dinero Inicial del Mes</h2>' +
                 '<p style="color:#666;margin-bottom:15px">Acá ponés con cuánta plata arrancás. Ejemplo: 50000</p>' +
                 '<form action="/cambiar-dinero" method="POST">' +
                 '<input name="monto" type="number" step="0.01" required placeholder="Ej: 50000" value="' + datosGlobales.config.dineroInicial + '">' +
                 '<button class="btn-verde">💵 GUARDAR MONTO</button>' +
                 '</form>';
        }

        // 👑 CONFIGURACIÓN DUEÑO
        if (vista === 'dueno' && usuario.rol === 'dueno') {
          html = '<h2>Cambiar Datos del Dueño</h2>' +
                 '<form action="/cambiar-dueno" method="POST">' +
                 '<input name="nuevoNombre" required placeholder="Nuevo nombre">' +
                 '<input name="nuevoCodigo" required placeholder="Nuevo código">' +
                 '<button class="btn-verde">🔄 ACTUALIZAR</button>' +
                 '</form>';
        }

        c.innerHTML = html;
      }
    </script>
    </body></html>
  `);
});

// 💾 GUARDAR GASTO
app.post('/guardar', (req, res) => {
  const datos = leerDatos();
  datos.productos.push(req.body);
  calcularTotales(datos); // Recalcula todo al guardar
  res.send(`<script>alert('✅ GASTO GUARDADO. Los totales se actualizaron.');location.href='/panel';</script>`);
});

// 🗑️ BORRAR GASTO
app.get('/borrar/:indice', (req, res) => {
  const datos = leerDatos();
  datos.productos.splice(req.params.indice, 1);
  calcularTotales(datos); // Recalcula todo al borrar
  res.redirect('/panel');
});

// ➕ CREAR USUARIO
app.post('/crear-usuario', (req, res) => {
  const datos = leerDatos();
  if(datos.usuarios.some(u => u.codigoAcceso === req.body.codigo)) {
    return res.send(`<script>alert('❌ Código ya existe');history.back();</script>`);
  }
  req.body.id = 'u'+Date.now();
  req.body.activo = true;
  datos.usuarios.push(req.body);
  guardarDatos(datos);
  res.send(`<script>alert('✅ USUARIO CREADO');location.href='/panel';</script>`);
});

// 💵 CAMBIAR DINERO INICIAL
app.post('/cambiar-dinero', (req, res) => {
  const datos = leerDatos();
  datos.config.dineroInicial = parseFloat(req.body.monto);
  guardarDatos(datos);
  res.send(`<script>alert('✅ DINERO INICIAL ACTUALIZADO');location.href='/panel';</script>`);
});

// 👑 CAMBIAR DATOS DUEÑO
app.post('/cambiar-dueno', (req, res) => {
  const datos = leerDatos();
  const dueno = datos.usuarios.find(u => u.rol === 'dueno');
  dueno.nombre = req.body.nuevoNombre;
  dueno.codigoAcceso = req.body.nuevoCodigo;
  guardarDatos(datos);
  res.send(`<script>alert('✅ DATOS ACTUALIZADOS');localStorage.clear();location.href='/';</script>`);
});

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SISTEMA COMPLETO CON DINERO Y TOTALES');
});

