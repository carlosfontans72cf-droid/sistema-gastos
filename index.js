const express = require('express');
const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Base de datos simple
let gastos = [];
let usuarios = [
  {id:1, nombre:"Dueño", clave:"1234", rol:"dueno"},
  {id:2, nombre:"Admin", clave:"5678", rol:"admin"}
];

// ESTILOS
const css = `
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial}
body{background:#f0f2f5;padding:20px}
.caja{max-width:500px;margin:auto;background:white;padding:25px;border-radius:10px;box-shadow:0 0 10px #0002}
h2{text-align:center;margin-bottom:20px;color:#2c3e50}
input,button{width:100%;padding:10px;margin:8px 0;border-radius:5px;border:1px solid #ccc}
button{background:#2563eb;color:white;font-weight:bold;border:none}
.nav{text-align:center;margin:15px 0}
.nav a{margin:0 10px;text-decoration:none;color:#2563eb;font-weight:bold}
</style>
`;

// PÁGINA PRINCIPAL
app.get('/', (req,res)=>{
  res.send(`
  <html><head><title>Sistema Gastos</title>${css}</head>
  <body>
    <div class="caja">
      <h2>🔐 INGRESAR</h2>
      <form action="/entrar" method="POST">
        <input name="nombre" placeholder="Tu Nombre" required>
        <input name="clave" type="password" placeholder="Código" required>
        <button>ENTRAR</button>
      </form>
    </div>
  </body></html>
  `);
});

// VERIFICAR INGRESO
app.post('/entrar', (req,res)=>{
  const u = usuarios.find(x=>x.nombre===req.body.nombre && x.clave===req.body.clave);
  if(!u) return res.send(`<div class="caja"><h2>❌ Error</h2><a href="/">Volver</a></div>`);
  res.send(`<script>localStorage.setItem('u',JSON.stringify(${JSON.stringify(u)}));location.href='/panel';</script>`);
});

// PANEL DE CONTROL
app.get('/panel', (req,res)=>{
  res.send(`
  <html><head><title>Panel</title>${css}</head>
  <body>
    <div class="caja">
      <h2>🏠 PANEL DE GASTOS</h2>
      <div class="nav">
        <a href="#" onclick="ver('cargar')">📝 Cargar</a>
        <a href="#" onclick="ver('ver')">📋 Ver Todos</a>
        <a href="/" style="color:red">🚪 Salir</a>
      </div>
      <div id="contenido"></div>
    </div>
    <script>
    const usuario = JSON.parse(localStorage.getItem('u'));
    function ver(vista){
      const div = document.getElementById('contenido');
      if(vista==='cargar'){
        div.innerHTML = `
        <form action="/guardar" method="POST">
          <input name="nombre" placeholder="Nombre del gasto" required>
          <input name="monto" type="number" step="0.01" placeholder="$ Monto" required>
          <button>GUARDAR</button>
        </form>`;
      }
      if(vista==='ver'){
        let lista = "<h3>Lista de Gastos:</h3>";
        ${JSON.stringify(gastos)}.forEach(g=>lista+=`<p>💲 ${g.nombre}: $${g.monto}</p>`);
        div.innerHTML = lista;
      }
    }
    </script>
  </body></html>
  `);
});

// GUARDAR GASTO
app.post('/guardar', (req,res)=>{
  gastos.push(req.body);
  res.send(`<script>alert('✅ Guardado!');location.href='/panel';</script>`);
});

// INICIAR
app.listen(PUERTO, '0.0.0.0', ()=>console.log('✅ FUNCIONANDO 100%'));
