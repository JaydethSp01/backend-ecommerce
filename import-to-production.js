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

// Configuración de conexión a producción
const PRODUCTION_MONGODB_URI =
  "mongodb+srv://jsimarrapolo:WOseRE9U77jEqAgT@taskcluster.hixyz.mongodb.net/tekashi_shoes?retryWrites=true&w=majority&appName=TaskCluster";

async function importToProduction() {
  try {
    console.log("🔄 Conectando a base de datos de producción...");
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log("✅ Conectado a base de datos de producción");

    // Leer datos exportados
    const exportPath = path.join(__dirname, "exported-data.json");
    if (!fs.existsSync(exportPath)) {
      throw new Error(
        "❌ Archivo exported-data.json no encontrado. Ejecuta primero export-data.js"
      );
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    console.log("📖 Datos exportados leídos correctamente");

    // Limpiar colecciones existentes (opcional - comentar si no quieres borrar datos existentes)
    console.log("🧹 Limpiando colecciones existentes...");
    await Usuario.deleteMany({});
    await TipoProducto.deleteMany({});
    await Producto.deleteMany({});
    await Pedido.deleteMany({});
    await Favorito.deleteMany({});
    await Wishlist.deleteMany({});
    await Imagen.deleteMany({});
    await Notificacion.deleteMany({});
    console.log("✅ Colecciones limpiadas");

    // Importar datos en el orden correcto (respetando dependencias)
    console.log("\n📥 IMPORTANDO DATOS...");

    // 1. Tipos de productos primero (no tienen dependencias)
    if (exportData.tiposProductos && exportData.tiposProductos.length > 0) {
      console.log("📦 Importando tipos de productos...");
      await TipoProducto.insertMany(exportData.tiposProductos);
      console.log(
        `✅ ${exportData.tiposProductos.length} tipos de productos importados`
      );
    }

    // 2. Usuarios
    if (exportData.usuarios && exportData.usuarios.length > 0) {
      console.log("👥 Importando usuarios...");
      await Usuario.insertMany(exportData.usuarios);
      console.log(`✅ ${exportData.usuarios.length} usuarios importados`);
    }

    // 3. Productos (dependen de tipos de productos)
    if (exportData.productos && exportData.productos.length > 0) {
      console.log("👟 Importando productos...");
      await Producto.insertMany(exportData.productos);
      console.log(`✅ ${exportData.productos.length} productos importados`);
    }

    // 4. Imágenes
    if (exportData.imagenes && exportData.imagenes.length > 0) {
      console.log("🖼️  Importando imágenes...");
      await Imagen.insertMany(exportData.imagenes);
      console.log(`✅ ${exportData.imagenes.length} imágenes importadas`);
    }

    // 5. Pedidos (dependen de usuarios y productos)
    if (exportData.pedidos && exportData.pedidos.length > 0) {
      console.log("📦 Importando pedidos...");
      await Pedido.insertMany(exportData.pedidos);
      console.log(`✅ ${exportData.pedidos.length} pedidos importados`);
    }

    // 6. Favoritos (dependen de usuarios y productos)
    if (exportData.favoritos && exportData.favoritos.length > 0) {
      console.log("❤️  Importando favoritos...");
      await Favorito.insertMany(exportData.favoritos);
      console.log(`✅ ${exportData.favoritos.length} favoritos importados`);
    }

    // 7. Wishlists (dependen de usuarios)
    if (exportData.wishlists && exportData.wishlists.length > 0) {
      console.log("📋 Importando wishlists...");
      await Wishlist.insertMany(exportData.wishlists);
      console.log(`✅ ${exportData.wishlists.length} wishlists importadas`);
    }

    // 8. Notificaciones (dependen de usuarios)
    if (exportData.notificaciones && exportData.notificaciones.length > 0) {
      console.log("🔔 Importando notificaciones...");
      await Notificacion.insertMany(exportData.notificaciones);
      console.log(
        `✅ ${exportData.notificaciones.length} notificaciones importadas`
      );
    }

    // Verificar importación
    console.log("\n📊 VERIFICACIÓN FINAL:");
    const usuariosCount = await Usuario.countDocuments();
    const tiposCount = await TipoProducto.countDocuments();
    const productosCount = await Producto.countDocuments();
    const pedidosCount = await Pedido.countDocuments();
    const favoritosCount = await Favorito.countDocuments();
    const wishlistsCount = await Wishlist.countDocuments();
    const imagenesCount = await Imagen.countDocuments();
    const notificacionesCount = await Notificacion.countDocuments();

    console.log(`👥 Usuarios en producción: ${usuariosCount}`);
    console.log(`🏷️  Tipos de productos en producción: ${tiposCount}`);
    console.log(`👟 Productos en producción: ${productosCount}`);
    console.log(`📦 Pedidos en producción: ${pedidosCount}`);
    console.log(`❤️  Favoritos en producción: ${favoritosCount}`);
    console.log(`📋 Wishlists en producción: ${wishlistsCount}`);
    console.log(`🖼️  Imágenes en producción: ${imagenesCount}`);
    console.log(`🔔 Notificaciones en producción: ${notificacionesCount}`);

    await mongoose.connection.close();
    console.log("\n🎉 ¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!");
    console.log("✅ Conexión cerrada");
  } catch (error) {
    console.error("❌ Error durante la importación:", error);
    process.exit(1);
  }
}

importToProduction();


