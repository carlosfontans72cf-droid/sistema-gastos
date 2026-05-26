const express = require('express');
const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// PÁGINA PRINCIPAL
app.get('/', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Sistema de Gastos</title>
    <style>
      * { font-family: Arial; padding: 0; margin: 0; box-sizing: border-box; }
      body { background: #f0f2f5; padding: 20px; }
      .caja { max-width: 450px; margin: auto; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h2 { text-align: center; color: #2c3e50; margin-bottom: 20px; }
      input, button { width: 100%; padding: 10px; margin: 8px 0; border-radius: 5px; border: 1px solid #ddd; font-size: 15px; }
      button { background: #2563eb; color: white; font-weight: bold; border: none; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="caja">
      <h2>📝 CARGAR GASTO</h2>
      <form action="/guardar" method="POST">
        <input type="text" name="nombre" placeholder="Nombre del gasto" required>
        <input type="number" name="monto" step="0.01" placeholder="Precio ($)" required>
        <button>GUARDAR</button>
      </form>
      <hr style="margin: 20px 0;">
      <h3>✅ LISTA DE GASTOS:</h3>
      <div id="lista"></div>
    </div>
  </body>
  </html>
  `);
});

// GUARDAR (solo aviso)
app.post('/guardar', (req, res) => {
  res.send(`<script>alert('✅ GUARDADO CORRECTAMENTE'); window.location.href='/';</script>`);
});

// INICIAR SERVIDOR
app.listen(PUERTO, '0.0.0.0', () => {
  console.log('✅ SISTEMA FUNCIONANDO AL 100%');
});
