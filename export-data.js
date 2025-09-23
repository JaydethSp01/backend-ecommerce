const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Importar todos los modelos
const Usuario = require("./models/Usuario");
const Producto = require("./models/Producto");
const TipoProducto = require("./models/TipoProducto");
const Pedido = require("./models/Pedido");
const Favorito = require("./models/Favorito");
const Wishlist = require("./models/Wishlist");
const Imagen = require("./models/Imagen");
const Notificacion = require("./models/Notificacion");

// Configuración de conexión local
const LOCAL_MONGODB_URI = "mongodb://localhost:27017/tekashi_shoes";

async function exportData() {
  try {
    console.log("🔄 Conectando a base de datos local...");
    await mongoose.connect(LOCAL_MONGODB_URI);
    console.log("✅ Conectado a base de datos local");

    const exportData = {};

    // Exportar cada colección
    console.log("📦 Exportando usuarios...");
    exportData.usuarios = await Usuario.find({}).lean();
    console.log(`✅ ${exportData.usuarios.length} usuarios exportados`);

    console.log("📦 Exportando tipos de productos...");
    exportData.tiposProductos = await TipoProducto.find({}).lean();
    console.log(
      `✅ ${exportData.tiposProductos.length} tipos de productos exportados`
    );

    console.log("📦 Exportando productos...");
    exportData.productos = await Producto.find({}).lean();
    console.log(`✅ ${exportData.productos.length} productos exportados`);

    console.log("📦 Exportando pedidos...");
    exportData.pedidos = await Pedido.find({}).lean();
    console.log(`✅ ${exportData.pedidos.length} pedidos exportados`);

    console.log("📦 Exportando favoritos...");
    exportData.favoritos = await Favorito.find({}).lean();
    console.log(`✅ ${exportData.favoritos.length} favoritos exportados`);

    console.log("📦 Exportando wishlists...");
    exportData.wishlists = await Wishlist.find({}).lean();
    console.log(`✅ ${exportData.wishlists.length} wishlists exportados`);

    console.log("📦 Exportando imágenes...");
    exportData.imagenes = await Imagen.find({}).lean();
    console.log(`✅ ${exportData.imagenes.length} imágenes exportadas`);

    console.log("📦 Exportando notificaciones...");
    exportData.notificaciones = await Notificacion.find({}).lean();
    console.log(
      `✅ ${exportData.notificaciones.length} notificaciones exportadas`
    );

    // Guardar en archivo JSON
    const exportPath = path.join(__dirname, "exported-data.json");
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`💾 Datos exportados a: ${exportPath}`);

    // Mostrar resumen
    console.log("\n📊 RESUMEN DE EXPORTACIÓN:");
    console.log(`👥 Usuarios: ${exportData.usuarios.length}`);
    console.log(`🏷️  Tipos de productos: ${exportData.tiposProductos.length}`);
    console.log(`👟 Productos: ${exportData.productos.length}`);
    console.log(`📦 Pedidos: ${exportData.pedidos.length}`);
    console.log(`❤️  Favoritos: ${exportData.favoritos.length}`);
    console.log(`📋 Wishlists: ${exportData.wishlists.length}`);
    console.log(`🖼️  Imágenes: ${exportData.imagenes.length}`);
    console.log(`🔔 Notificaciones: ${exportData.notificaciones.length}`);

    await mongoose.connection.close();
    console.log("✅ Conexión cerrada");
  } catch (error) {
    console.error("❌ Error durante la exportación:", error);
    process.exit(1);
  }
}

exportData();


