// MongoDB initialization script
db = db.getSiblingDB("tekashi_shoes");

// Create collections
db.createCollection("productos");
db.createCollection("tiposproducto");
db.createCollection("imagenes");
db.createCollection("usuarios");
db.createCollection("favoritos");
db.createCollection("wishlists");
db.createCollection("notificaciones");

// Create indexes for better performance
db.productos.createIndex({ marca: 1 });
db.productos.createIndex({ tipoProductoId: 1 });
db.productos.createIndex({ precio: 1 });
db.productos.createIndex({ stock: 1 });
db.productos.createIndex({ activo: 1 });

db.usuarios.createIndex({ email: 1 }, { unique: true });
db.usuarios.createIndex({ firebaseUid: 1 }, { unique: true });

db.favoritos.createIndex({ usuarioId: 1, productoId: 1 }, { unique: true });
db.wishlists.createIndex({ usuarioId: 1 });
db.notificaciones.createIndex({ usuarioId: 1 });
db.notificaciones.createIndex({ leida: 1 });

// Insert initial data
db.tiposproducto.insertMany([
  {
    nombre: "Tenis",
    descripcion: "Zapatos deportivos para correr y actividades físicas",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    nombre: "Zapatillas",
    descripcion: "Calzado casual y cómodo para uso diario",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    nombre: "Botas",
    descripcion: "Calzado resistente para actividades al aire libre",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    nombre: "Sandalias",
    descripcion: "Calzado abierto para clima cálido",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print("MongoDB initialization completed successfully!");

