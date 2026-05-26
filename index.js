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
      dineroInicial: 0,
      totalGastado: 0
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

// ESTILOS
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
    .btn-azul {background:#0288d1}
    table {width:100%;border-collapse:collapse;margin-top:10px}
    th,td {padding:12px;text-align:left;border-bottom:1px solid #eee}
    .alerta-roja {background:#f8d7da;color:#721c24;padding:10px;border-radius:5px;margin:10px 0;text-align:center}
    .lista-codigos {background:#f8f9fa;padding:10px;border-radius:8px;margin-top:20px;border:1px solid #ddd;}
    .lista-codigos h4 {color:#333;margin-bottom:8px;}
    .codigo-item {font-size:13px;padding:3px 0;border-bottom:1px solid #eee;}
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
  const nombreIngresado = req.body.nombre.trim().toLowerCase();
  const user = datos.usuarios.find(u => 
    u.nombre.trim().toLowerCase() === nombreIngresado && 
    u.codigoAcceso === req.body.codigo && 
    u.activo === true
  );

  if (!user) {
    return res.send(`<div class="contenedor"><div class="alerta-roja tarjeta" style="max-width:400px;margin:auto"><h3>❌ DATOS INCORRECTOS</h3><a href="/" style="color:#721c24;font-weight:bold">Volver a intentar</a></div></div>`);
  }
  
  res.send(`<script>
    localStorage.setItem('u', JSON.stringify({id:'${user.id}',rol:'${user.rol}',nombre:'${user.nombre}'}));
    location.href='/panel';
  </script>`);
});

// PANEL
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
      
      <div class="resumen">
        <div class="ini">Dinero Inicial:<br>$ ${datos.config.dineroInicial.toLocaleString('es-ES')}</div>
        <div class="gas">Total Gastado:<br>$ ${totalGastado.toLocaleString('es-ES')}</div>
        <div class="saldo ${saldo < 0 ? 'rojo' : ''}">LO QUE QUEDA:<br>$ ${saldo.toLocaleString('es-ES')}</div>
      </div>

      <div class="nav" id="menuPrincipal">
        <a href="#" onclick="mostrar('inicio'); return false;">🏠 Inicio</a>
        <a href="#" onclick="mostrar('cargar'); return false;">📝 Cargar Gasto</a>
        <a href="#" onclick="mostrar('historial'); return false;">📜 Ver Historial</a>
        
        <a id="opcionAdmin" href="#" onclick="mostrar('admin'); return false;" style="display:none;">⚙️ Administrar</a>
        <a id="opcionDinero" href="#" onclick="mostrar('dinero'); return false;" style="display:none;">💰 Poner Dinero</a>
        <a id="opcionConfig" href="#" onclick="mostrar('dueno'); return false;" style="display:none;">👑 Configuración</a>
        
        <a href="/" style="color:#dc2626">🚪 Salir</a>
      </div>

      <div id="contenido" class="tarjeta"></div>
    </div>

    <script>
      const datosGlobales = ${JSON.stringify(datos)};
      let usuario;
      let temporal = {}; // Para guardar lo que escribe el empleado y corregir

      window.onload = function() {
        const dato = localStorage.getItem('u');
        if (!dato) { location.href='/'; return; }
        
        usuario = JSON.parse(dato);
        document.getElementById('userData').textContent = 'Conectado: ' + usuario.nombre + ' (' + usuario.rol + ')';

        if (usuario.rol === 'dueno' || usuario.rol === 'admin') {
          document.getElementById('opcionAdmin').style.display = 'inline-block';
        }
        if (usuario.rol === 'dueno') {
          document.getElementById('opcionDinero').style.display = 'inline-block';
          document.getElementById('opcionConfig').style.display = 'inline-block';
        }

        mostrar('inicio');
      }

      function mostrar(vista) {
        const c = document.getElementById('contenido');
        let html = '';

        // 🏠 INICIO
        if (vista === 'inicio') {
          html = '<h2 style="text-align:center;margin-top:30px">✅ BIENVENIDO AL SISTEMA</h2><p style="text-align:center;margin-top:15px;font-size:16px">Arriba tenés el resumen de tu dinero. Usá el menú para cargar gastos o administrar.</p>';
        }

        // 📝 CARGAR GASTO (CON OPCIÓN DE CORREGIR ANTES DE GUARDAR)
        if (vista === 'cargar') {
          let opt = ''; 
          datosGlobales.sectores.forEach(function(s) { 
            opt += '<option value="' + s.id + '">' + s.nombre + '</option>'; 
          });

          // Si hay datos temporales para corregir, los mostramos cargados
          let nombreVal = temporal.nombre || '';
          let sectorVal = temporal.sector || '';
          let precioVal = temporal.precio || '';

          html = '<h2>Cargar Nuevo Gasto</h2>' +
                 '<form id="formGasto" action="/guardar" method="POST">' +
                 '<input name="nombre" required placeholder="Ej: Arroz, Jabón, Carne..." value="'+nombreVal+'">' +
                 '<select name="sector" required>'+opt+'</select>' +
                 '<input name="precio" type="number" step="0.01" required placeholder="Precio ($)" value="'+precioVal+'">' +
                 '<div style="display:flex;gap:10px;margin-top:10px">' +
                 '<button type="submit" class="btn-verde" style="flex:2">💾 GUARDAR</button>' +
                 '<button type="button" class="btn-azul" style="flex:1" onclick="guardarTemporal()">✏️ CORREGIR</button>' +
                 '</div>' +
                 '</form>' +
                 '<p style="font-size:12px;color:#666;margin-top:8px">* Usá CORREGIR si te equivocaste antes de guardar.</p>';

          // Limpiamos lo temporal después de mostrar
          temporal = {};
        }

        // 📜 HISTORIAL (EMPLEADO SIN BORRAR - DUEÑO/ADMIN CON BORRAR)
        if (vista === 'historial') {
          let totalVista = 0;
          html = '<h2>Historial Completo de Gastos</h2>' +
                 '<table><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Acción</th></tr>';
          
          datosGlobales.productos.forEach(function(p, i) {
            const sec = datosGlobales.sectores.find(s => s.id === p.sector);
            totalVista += parseFloat(p.precio);
            
            // Solo Dueño y Admin ven el botón BORRAR
            let accion = (usuario.rol === 'dueno' || usuario.rol === 'admin') 
              ? '<a href="/borrar/' + i + '" class="btn-rojo" style="padding:4px 8px;text-decoration:none;font-size:12px">🗑️ BORRAR</a>' 
              : '<span style="color:#999">Solo lectura</span>';

            html += '<tr><td>' + p.nombre +'</td><td>' + (sec ? sec.nombre : 'Sin categoría') + '</td><td>$ ' + p.precio + '</td><td>'+accion+'</td></tr>';
          });
          
          html += '<tr style="background:#f8f9fa;font-weight:bold"><td colspan="2">TOTAL GASTADO</td><td colspan="2">$ ' + totalVista + '</td></tr></table>';
        }

        // ⚙️ ADMINISTRAR USUARIOS - CON LISTA DE CÓDIGOS EXISTENTES
        if (vista === 'admin' && (usuario.rol === 'dueno' || usuario.rol === 'admin')) {
          html = '<h2>Crear Nuevo Usuario</h2>' +
                 '<form action="/crear-usuario" method="POST">' +
                 '<input name="nombre" required placeholder="Nombre completo (Ej: Luis)">' +
                 '<input name="codigo" required placeholder="Código numérico (Ej: 1111)">' +
                 '<select name="rol">' +
                 '<option value="staff">Empleado / Solo carga gastos</option>' +
                 '<option value="admin">Administrador / Crea usuarios</option>' +
                 '</select>' +
                 '<button class="btn-verde">➕ CREAR USUARIO</button>' +
                 '</form>';

          // ✅ LISTA DE USUARIOS Y CÓDIGOS PARA NO REPETIR
          html += '<div class="lista-codigos"><h4>📋 Lista actual de Usuarios y Códigos:</h4>';
          datosGlobales.usuarios.forEach(function(u) {
            html += '<div class="codigo-item"><strong>'+u.nombre+'</strong> → Código: <strong>'+u.codigoAcceso+'</strong> ('+u.rol+')</div>';
          });
          html += '</div>';
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

      // Función para guardar lo escrito y seguir corrigiendo
      function guardarTemporal() {
        temporal.nombre = document.querySelector('input[name="nombre"]').value;
        temporal.sector = document.querySelector('select[name="sector"]').value;
        temporal.precio = document.querySelector('input[name="precio"]').value;
        alert('✏️ Datos guardados para corregir. Podés modificar y guardar cuando estés bien.');
      }
    </script>
    </body></html>
  `);
});

// 💾 GUARDAR GASTO
app.post('/guardar', (req, res) => {
  const datos = leerDatos();
  datos.productos.push(req.body);
  calcularTotales(datos);
  res.send(`<script>alert('✅ GASTO GUARDADO CORRECTAMENTE');location.href='/panel';</script>`);
});

// 🗑️ BORRAR GASTO
app.get('/borrar/:indice', (req, res) => {
  const datos = leerDatos();
  datos.productos.splice(req.params.indice, 1);
  calcularTotales(datos);
  res.redirect('/panel');
});

// ➕ CREAR USUARIO - ✅ GUARDA AL PRINCIPIO DE LA LISTA
app.post('/crear-usuario', (req, res) => {
  const datos = leerDatos();
  
  if(datos.usuarios.some(u => u.codigoAcceso === req.body.codigo.trim())) {
    return res.send(`<script>alert('❌ Ese código YA EXISTE, mirá la lista abajo y elegí otro');history.back();</script>`);
  }

  const nuevoUsuario = {
    id: 'u' + Date.now(),
    nombre: req.body.nombre.trim(),
    codigoAcceso: req.body.codigo.trim(),
    rol: req.body.rol,
    activo: true
  };

  // ✅ LO AGREGAMOS AL PRINCIPIO, NO AL FINAL
  datos.usuarios.unshift(nuevoUsuario);
  
  guardarDatos(datos);
  res.send(`<script>alert('✅ USUARIO CREADO Y PUESTO AL PRINCIPIO\\n\\nNombre: ${nuevoUsuario.nombre}\\nCódigo: ${nuevoUsuario.codigoAcceso}');location.href='/panel';</script>`);
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
  dueno.nombre = req.body.nuevoNombre.trim();
  dueno.codigoAcceso = req.body.nuevoCodigo.trim();
  guardarDatos(datos);
  res.send(`<script>alert('✅ DATOS ACTUALIZADOS');localStorage.clear();location.href='/';</script>`);
});

// 🚀 INICIO SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SISTEMA LISTO CON TUS 3 CAMBIOS`);
});

