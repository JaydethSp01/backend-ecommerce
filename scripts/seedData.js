const mongoose = require("mongoose");
require("dotenv").config();

// Importar modelos
const Usuario = require("../models/Usuario");
const TipoProducto = require("../models/TipoProducto");
const Producto = require("../models/Producto");
const Imagen = require("../models/Imagen");

// Datos de semilla
const tiposProducto = [
  {
    nombre: "Zapatillas Deportivas",
    descripcion: "Zapatillas para actividades deportivas y ejercicio",
    orden: 1,
    traducciones: {
      es: {
        nombre: "Zapatillas Deportivas",
        descripcion: "Zapatillas para actividades deportivas y ejercicio",
      },
      en: {
        nombre: "Sports Shoes",
        descripcion: "Shoes for sports activities and exercise",
      },
      fr: {
        nombre: "Chaussures de Sport",
        descripcion: "Chaussures pour activités sportives et exercice",
      },
      pt: {
        nombre: "Tênis Esportivos",
        descripcion: "Tênis para atividades esportivas e exercício",
      },
    },
  },
  {
    nombre: "Zapatos Formales",
    descripcion: "Zapatos elegantes para ocasiones formales",
    orden: 2,
    traducciones: {
      es: {
        nombre: "Zapatos Formales",
        descripcion: "Zapatos elegantes para ocasiones formales",
      },
      en: {
        nombre: "Formal Shoes",
        descripcion: "Elegant shoes for formal occasions",
      },
      fr: {
        nombre: "Chaussures Formelles",
        descripcion: "Chaussures élégantes pour occasions formelles",
      },
      pt: {
        nombre: "Sapatos Formais",
        descripcion: "Sapatos elegantes para ocasiões formais",
      },
    },
  },
  {
    nombre: "Botas",
    descripcion: "Botas para diferentes estilos y actividades",
    orden: 3,
    traducciones: {
      es: {
        nombre: "Botas",
        descripcion: "Botas para diferentes estilos y actividades",
      },
      en: {
        nombre: "Boots",
        descripcion: "Boots for different styles and activities",
      },
      fr: {
        nombre: "Bottes",
        descripcion: "Bottes pour différents styles et activités",
      },
      pt: {
        nome: "Botas",
        descripcion: "Botas para diferentes estilos e atividades",
      },
    },
  },
  {
    nombre: "Sandalias",
    descripcion: "Sandalias cómodas para el verano",
    orden: 4,
    traducciones: {
      es: {
        nombre: "Sandalias",
        descripcion: "Sandalias cómodas para el verano",
      },
      en: { nombre: "Sandals", descripcion: "Comfortable sandals for summer" },
      fr: {
        nombre: "Sandales",
        descripcion: "Sandales confortables pour l'été",
      },
      pt: {
        nome: "Sandálias",
        descripcion: "Sandálias confortáveis para o verão",
      },
    },
  },
];

const productos = [
  {
    nombre: "Nike Air Max 270",
    descripcion:
      "Zapatillas deportivas con tecnología Air Max para máxima comodidad",
    precio: 120000,
    stock: 50,
    marca: "Nike",
    modelo: "Air Max 270",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Negro", "Blanco", "Azul", "Rojo"],
    material: "Mesh y cuero sintético",
    genero: "UNISEX",
    destacado: true,
    oferta: {
      activa: true,
      descuento: 15,
      precioOferta: 102000,
    },
    traducciones: {
      es: {
        nombre: "Nike Air Max 270",
        descripcion:
          "Zapatillas deportivas con tecnología Air Max para máxima comodidad",
      },
      en: {
        nombre: "Nike Air Max 270",
        descripcion: "Sports shoes with Air Max technology for maximum comfort",
      },
      fr: {
        nome: "Nike Air Max 270",
        descripcion:
          "Chaussures de sport avec technologie Air Max pour un confort maximal",
      },
      pt: {
        nome: "Nike Air Max 270",
        descripcion:
          "Tênis esportivos com tecnologia Air Max para máximo conforto",
      },
    },
  },
  {
    nombre: "Adidas Ultraboost 22",
    descripcion:
      "Zapatillas de running con tecnología Boost para energía y comodidad",
    precio: 150000,
    stock: 30,
    marca: "Adidas",
    modelo: "Ultraboost 22",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Negro", "Blanco", "Gris"],
    material: "Primeknit y Boost",
    genero: "UNISEX",
    destacado: true,
    traducciones: {
      es: {
        nombre: "Adidas Ultraboost 22",
        descripcion:
          "Zapatillas de running con tecnología Boost para energía y comodidad",
      },
      en: {
        nome: "Adidas Ultraboost 22",
        descripcion:
          "Running shoes with Boost technology for energy and comfort",
      },
      fr: {
        nome: "Adidas Ultraboost 22",
        descripcion:
          "Chaussures de course avec technologie Boost pour énergie et confort",
      },
      pt: {
        nome: "Adidas Ultraboost 22",
        descripcion:
          "Tênis de corrida com tecnologia Boost para energia e conforto",
      },
    },
  },
  {
    nombre: "Zapato Oxford Negro",
    descripcion:
      "Zapato formal clásico en cuero negro para ocasiones elegantes",
    precio: 200000,
    stock: 25,
    marca: "Clarks",
    modelo: "Oxford",
    tallas: ["38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Negro"],
    material: "Cuero genuino",
    genero: "HOMBRE",
    destacado: false,
    traducciones: {
      es: {
        nome: "Zapato Oxford Negro",
        descripcion:
          "Zapato formal clásico en cuero negro para ocasiones elegantes",
      },
      en: {
        nome: "Black Oxford Shoe",
        descripcion:
          "Classic formal shoe in black leather for elegant occasions",
      },
      fr: {
        nome: "Chaussure Oxford Noire",
        descripcion:
          "Chaussure formelle classique en cuir noir pour occasions élégantes",
      },
      pt: {
        nome: "Sapato Oxford Preto",
        descripcion:
          "Sapato formal clássico em couro preto para ocasiões elegantes",
      },
    },
  },
];

const usuarios = [
  {
    nombre: "Administrador",
    email: "admin@tekashishoes.com",
    password: "admin123",
    rol: "ADMIN",
    telefono: "+57 300 123 4567",
    direccion: "Calle 123 #45-67, Bogotá, Colombia",
  },
  {
    nombre: "Juan Pérez",
    email: "juan.perez@email.com",
    password: "cliente123",
    rol: "CLIENTE",
    telefono: "+57 300 987 6543",
    direccion: "Carrera 45 #78-90, Medellín, Colombia",
  },
  {
    nombre: "María García",
    email: "maria.garcia@email.com",
    password: "cliente123",
    rol: "CLIENTE",
    telefono: "+57 300 555 1234",
    direccion: "Avenida 30 #12-34, Cali, Colombia",
  },
];

const seedDatabase = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    // Limpiar colecciones existentes
    await Usuario.deleteMany({});
    await TipoProducto.deleteMany({});
    await Producto.deleteMany({});
    await Imagen.deleteMany({});
    console.log("🧹 Colecciones limpiadas");

    // Crear tipos de producto
    const tiposCreados = await TipoProducto.insertMany(tiposProducto);
    console.log(`✅ ${tiposCreados.length} tipos de producto creados`);

    // Crear usuarios
    const usuariosCreados = await Usuario.insertMany(usuarios);
    console.log(`✅ ${usuariosCreados.length} usuarios creados`);

    // Asignar tipoProductoId a productos
    const productosConTipo = productos.map((producto, index) => ({
      ...producto,
      tipoProductoId: tiposCreados[index % tiposCreados.length]._id,
    }));

    // Crear productos
    const productosCreados = await Producto.insertMany(productosConTipo);
    console.log(`✅ ${productosCreados.length} productos creados`);

    // Crear imágenes de ejemplo
    const imagenes = [
      {
        url: "/uploads/nike-air-max-270.jpg",
        nombre: "Nike Air Max 270 - Vista frontal",
        descripcion: "Vista frontal de las Nike Air Max 270",
        tipoProductoId: tiposCreados[0]._id,
        productoId: productosCreados[0]._id,
        tipo: "PRINCIPAL",
        orden: 1,
        alt: "Nike Air Max 270 vista frontal",
        titulo: "Nike Air Max 270",
        metadatos: {
          ancho: 800,
          alto: 600,
          formato: "JPEG",
          calidad: 85,
          proveedor: "LOCAL",
        },
      },
      {
        url: "/uploads/adidas-ultraboost-22.jpg",
        nombre: "Adidas Ultraboost 22 - Vista lateral",
        descripcion: "Vista lateral de las Adidas Ultraboost 22",
        tipoProductoId: tiposCreados[0]._id,
        productoId: productosCreados[1]._id,
        tipo: "PRINCIPAL",
        orden: 1,
        alt: "Adidas Ultraboost 22 vista lateral",
        titulo: "Adidas Ultraboost 22",
        metadatos: {
          ancho: 800,
          alto: 600,
          formato: "JPEG",
          calidad: 85,
          proveedor: "LOCAL",
        },
      },
    ];

    const imagenesCreadas = await Imagen.insertMany(imagenes);
    console.log(`✅ ${imagenesCreadas.length} imágenes creadas`);

    console.log("\n🎉 Base de datos sembrada exitosamente!");
    console.log("\n📊 Resumen:");
    console.log(`- ${tiposCreados.length} tipos de producto`);
    console.log(`- ${usuariosCreados.length} usuarios`);
    console.log(`- ${productosCreados.length} productos`);
    console.log(`- ${imagenesCreadas.length} imágenes`);

    console.log("\n👤 Usuarios creados:");
    usuariosCreados.forEach((usuario) => {
      console.log(
        `- ${usuario.nombre} (${usuario.email}) - Rol: ${usuario.rol}`
      );
    });
  } catch (error) {
    console.error("❌ Error sembrando la base de datos:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Conexión a MongoDB cerrada");
    process.exit(0);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

