const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const DB_PATH = path.join(__dirname, 'database');
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });

async function iniciarSistema() {
  try {
    await mongoose.connect(`mongodb://localhost:27017/gastoshogar`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'gastoshogar',
      autoIndex: true
    });
    
    console.log('✅ SISTEMA LISTO PARA RENDER');

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const ConfigSchema = new mongoose.Schema({ nombreApp: String });
    const Config = mongoose.model('Config', ConfigSchema);
    const hayConfig = await Config.countDocuments();
    if (hayConfig === 0) await new Config({ nombreApp: "Organización del Hogar" }).save();

    const SectorSchema = new mongoose.Schema({ nombre: { type: String, unique: true } });
    const Sector = mongoose.model('Sector', SectorSchema);
    const haySectores = await Sector.countDocuments();
    if (haySectores === 0) {
      await new Sector({ nombre: "1 - Gastos fijos" }).save();
      await new Sector({ nombre: "2 - Verdulería" }).save();
      await new Sector({ nombre: "3 - Limpieza" }).save();
      await new Sector({ nombre: "4 - Aseo" }).save();
      await new Sector({ nombre: "5 - Alimentos" }).save();
      await new Sector({ nombre: "6 - Mascotas" }).save();
      await new Sector({ nombre: "7 - Otros" }).save();
    }

    const UsuarioSchema = new mongoose.Schema({
      nombre: {type: String, required: true},
      codigoAcceso: {type: String, unique: true, required: true},
      rol: {type: String, enum: ['dueno', 'admin', 'staff'], required: true},
      activo: {type: Boolean, default: true}
    });
    const Usuario = mongoose.model('Usuario', UsuarioSchema);
    const hayUsuarios = await Usuario.countDocuments();
    if (hayUsuarios === 0) {
      await new Usuario({ nombre: "Dueño", codigoAcceso: "1234", rol: "dueno" }).save();
      await new Usuario({ nombre: "Admin", codigoAcceso: "5678", rol: "admin" }).save();
      await new Usuario({ nombre: "Empleado", codigoAcceso: "9012", rol: "staff" }).save();
    }

    const ProductoSchema = new mongoose.Schema({
      nombre: String,
      sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
      precio: Number,
      cantidad: Number,
      alertaEn: Number,
      fecha: { type: Date, default: Date.now }
    });
    const Producto = mongoose.model('Producto', ProductoSchema);

    const estilos = `
    <style>
        * {margin:0;padding:0;box-sizing:border-box;font-family:Arial}
        body {background:#f0f2f5;padding:20px}
        .contenedor {max-width:1100px;margin:auto}
        .header {background:#2c3e50;color:white;padding:20px;border-radius:10px;text-align:center;font-size:22px;font-weight:bold;margin-bottom:20px}
        .nav {text-align:center;margin:15px 0}
        .nav a {display:inline-block;margin:0 8px;padding:10px 16px;background:#eff6ff;border-radius:8px;text-decoration:none;color:#2563eb;font-weight:bold;border:1px solid #dbeafe}
        .nav a:hover {background:#dbeafe}
        .tarjeta {background:white;border-radius:10px;padding:20px;min-height:300px;box-shadow:0 2px 8px #00000015}
        input,select,button {width:100%;padding:10px;margin:8px 0;border-radius:5px;border:1px solid #ddd;font-size:15px}
        button {background:#2563eb;color:white;font-weight:bold;border:none;cursor:pointer}
        .btn-verde {background:#16a34a}
        .btn-rojo {background:#dc2626}
        .btn-amarillo {background:#f59e0b}
        table {width:100%;border-collapse:collapse;margin-top:10px}
        th,td {padding:12px;text-align:left;border-bottom:1px solid #eee}
        .alerta-roja {background:#f8d7da;color:#721c24;padding:10px;border-radius:5px;margin:10px 0}
        .fila-acciones {display:flex;gap:5px}
        .copiar {cursor:pointer;color:#2563eb;font-weight:bold}
        .aviso {background:#fff3cd;padding:8px;border-radius:5px;margin:10px 0;text-align:center;font-weight:bold;}
        .usuario-item {display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #ddd;}
    </style>
    `;

    app.get('/', async (req, res) => {
      const cfg = await Config.findOne();
      res.send(`
        <html>
        <head><title>${cfg.nombreApp}</title>${estilos}</head>
        <body>
          <div class="contenedor">
            <div class="header">🔐 ${cfg.nombreApp}</div>
            <div class="tarjeta" style="max-width:400px;margin:auto">
              <h2 style="text-align:center">Ingresar al Sistema</h2>
              <form action="/acceso" method="POST">
                <label>Tu Nombre:</label>
                <input type="text" name="nombre" required placeholder="Ej: Juan Pérez">
                <label>Código de Acceso:</label>
                <input type="password" name="codigo" required placeholder="Tu código ej: 1234">
                <button>INGRESAR</button>
              </form>
            </div>
          </div>
        </body>
        </html>
      `);
    });

    app.post('/acceso', async (req, res) => {
      const user = await Usuario.findOne({ nombre: req.body.nombre, codigoAcceso: req.body.codigo, activo: true });
      if (!user) return res.send(`<div class="tarjeta alerta-roja" style="max-width:400px;margin:auto"><h3>❌ Nombre o Código incorrecto</h3><a href="/">Volver</a></div>`);
      res.send(`<script>localStorage.setItem('u',JSON.stringify({id:'${user._id}',rol:'${user.rol}',nombre:'${user.nombre}'}));location.href='/panel';</script>`);
    });

    app.get('/panel', async (req, res) => {
      const sectores = await Sector.find();
      const cfg = await Config.findOne();
      res.send(`
        <html>
        <head><title>Panel | ${cfg.nombreApp}</title>${estilos}</head>
        <body>
          <div class="contenedor">
            <div class="header">🏠 ${cfg.nombreApp}<p id="userData" style="font-size:14px;margin-top:5px"></p></div>
            <div class="nav">
              <a href="#" onclick="mostrar('inicio');return false;">🏠 Inicio</a>
              <a href="#" onclick="mostrar('cargar');return false;">📝 Cargar Artículo</a>
              <a href="#" onclick="mostrar('historial');return false;">📜 Historial</a>
              <a href="#" onclick="mostrar('alertas');return false;">⚠️ Alertas</a>
              <span id="menuExtra"></span>
              <a href="/" style="color:#dc2626">🚪 Salir</a>
            </div>
            <div id="contenido" class="tarjeta"></div>
          </div>
          <script>
            const listaSectores = ${JSON.stringify(sectores)};
            let usuario;
            let datosTemporales = {};
            window.onload = function() {
              const dato = localStorage.getItem('u');
              if(!dato) return location.href='/';
              usuario = JSON.parse(dato);
              document.getElementById('userData').textContent = 'Conectado: ' + usuario.nombre + ' (' + usuario.rol + ')';
              if(usuario.rol === 'dueno' || usuario.rol === 'admin') document.getElementById('menuExtra').innerHTML += '<a href="#" onclick="mostrar(\\'admin\\');return false;">⚙️ Administrar</a>';
              if(usuario.rol === 'dueno') document.getElementById('menuExtra').innerHTML += '<a href="#" onclick="mostrar(\\'dueno\\');return false;">👑 Dueño</a>';
              mostrar('inicio');
            }
            function copiarTexto(texto) { navigator.clipboard.writeText(texto); alert('✅ Copiado!'); }
            function mostrar(vista) {
              const c = document.getElementById('contenido');
              if(vista === 'inicio') { c.innerHTML = '<h2>Bienvenido al Sistema</h2><p>Accesible desde cualquier lugar por internet</p>'; }
              if(vista === 'cargar') {
                let opciones = '';
                listaSectores.forEach(s => opciones += `<option value="${s._id}">${s.nombre}</option>`);
                c.innerHTML = `<h2>Cargar Nuevo</h2><form action="/guardar" method="POST">
                  <input name="nombre" required placeholder="Nombre / Descripción">
                  <select name="sector" required>${opciones}</select>
                  <input name="precio" type="number" step="0.01" required placeholder="Precio $">
                  <input name="cantidad" type="number" value="1">
                  <input name="alertaEn" type="number" value="2">
                  <button class="btn-verde">GUARDAR</button>
                </form>`;
              }
              if(vista === 'historial') {
                fetch('/ver-historial').then(r=>r.json()).then(lista=>{
                  let html = '<h2>Historial Completo</h2><table><tr><th>Fecha</th><th>Nombre</th><th>Sector</th><th>Precio</th><th>Acciones</th></tr>';
                  lista.forEach(i=>{
                    html += `<tr><td>${new Date(i.fecha).toLocaleDateString()}</td><td>${i.nombre}</td><td>${i.sector?.nombre || ''}</td><td>$${i.precio}</td><td>`;
                    if(usuario.rol === 'dueno' || usuario.rol === 'admin') html += `<a href="/borrar-uno/${i._id}" class="btn-rojo" style="padding:4px 8px;text-decoration:none" onclick="return confirm('¿Borrar?')">🗑️</a>`;
                    else html += '🔒';
                    html += `</td></tr>`;
                  });
                  html += '</table>'; c.innerHTML = html;
                });
              }
              if(vista === 'alertas') {
                fetch('/ver-alertas').then(r=>r.json()).then(lista=>{
                  let html = '<h2>Productos con Stock Bajo</h2>';
                  lista.forEach(i=>html += `<div class="alerta-roja">⚠️ ${i.nombre} - Quedan ${i.cantidad}</div>`);
                  c.innerHTML = html;
                });
              }
              if(vista === 'admin' && (usuario.rol === 'admin' || usuario.rol === 'dueno')) {
                c.innerHTML = `<h2>Administrar Usuarios</h2>
                <form action="/crear-usuario" method="POST">
                  <input name="nombre" required placeholder="Nombre Usuario">
                  <input name="codigo" required placeholder="Código Acceso">
                  <select name="rol"><option value="staff">Staff</option><option value="admin">Admin</option><option value="dueno">Dueño</option></select>
                  <button class="btn-verde">CREAR USUARIO</button>
                </form><hr><div id="listaUsuarios"></div>`;
                fetch('/ver-usuarios').then(r=>r.json()).then(lista=>{
                  let html = '';
                  lista.forEach(u=>{
                    if(u.rol !== 'dueno') html += `<div>${u.nombre} | Código: ${u.codigoAcceso} <a href="/borrar-usuario/${u._id}" class="btn-rojo" style="padding:4px 8px;text-decoration:none" onclick="return confirm('¿Borrar?')">BORRAR</a></div>`;
                    else html += `<div><strong>${u.nombre} | Código: ${u.codigoAcceso} (Dueño)</strong></div>`;
                  });
                  document.getElementById('listaUsuarios').innerHTML = html;
                });
              }
              if(vista === 'dueno' && usuario.rol === 'dueno') {
                c.innerHTML = `<h2>Mis Datos</h2>
                <form action="/actualizar-dueno" method="POST">
                  <input name="nuevoNombre" required placeholder="Nuevo Nombre">
                  <input name="nuevoCodigo" required placeholder="Nuevo Código">
                  <button class="btn-verde">ACTUALIZAR</button>
                </form>`;
              }
            }
          </script>
        </body>
        </html>
      `);
    });

    app.post('/guardar', async (req, res) => { await new Producto(req.body).save(); res.send(`<script>alert('✅ Guardado');location.href='/panel';</script>`); });
    app.get('/ver-historial', async (req, res) => { res.json(await Producto.find().populate('sector').sort({fecha:-1})); });
    app.get('/ver-alertas', async (req, res) => { res.json(await Producto.find({$expr:{$lte:["$cantidad","$alertaEn"]}})); });

    app.post('/crear-usuario', async (req, res) => {
      const existe = await Usuario.findOne({codigoAcceso: req.body.codigo});
      if (existe) return res.send(`<script>alert('❌ Código ya existe');</script>`);
      await new Usuario(req.body).save();
      res.send(`<script>alert('✅ Creado');location.href='/panel#admin';</script>`);
    });
    app.get('/ver-usuarios', async (req, res) => { res.json(await Usuario.find()); });
    app.get('/borrar-usuario/:id', async (req, res) => { await Usuario.findByIdAndDelete(req.params.id); res.send(`<script>alert('🗑️ Borrado');location.href='/panel#admin';</script>`); });
    app.get('/borrar-uno/:id', async (req, res) => { await Producto.findByIdAndDelete(req.params.id); res.send(`<script>alert('🗑️ Borrado');location.href='/panel#historial';</script>`); });

    app.post('/actualizar-dueno', async (req, res) => {
      const { nuevoNombre, nuevoCodigo } = req.body;
      const existe = await Usuario.findOne({codigoAcceso: nuevoCodigo, rol: {$ne:'dueno'}});
      if (existe) return res.send(`<script>alert('❌ Código en uso');</script>`);
      await Usuario.findOneAndUpdate({rol:'dueno'}, {nombre: nuevoNombre, codigoAcceso: nuevoCodigo});
      res.send(`<script>alert('✅ Actualizado. Ingresá de nuevo.');localStorage.clear();location.href='/';</script>`);
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ SERVICIO DISPONIBLE EN PUERTO ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

iniciarSistema();