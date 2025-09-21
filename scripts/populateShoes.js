const mongoose = require("mongoose");
const Producto = require("../models/Producto");
const TipoProducto = require("../models/TipoProducto");
require("dotenv").config();

// Datos de tipos de producto
const tiposProducto = [
  {
    nombre: "Sneakers",
    descripcion: "Zapatillas deportivas modernas y cómodas",
    activo: true,
    slug: "sneakers"
  },
  {
    nombre: "Running",
    descripcion: "Zapatos especializados para correr",
    activo: true,
    slug: "running"
  },
  {
    nombre: "Basketball",
    descripcion: "Zapatos de baloncesto de alto rendimiento",
    activo: true,
    slug: "basketball"
  },
  {
    nombre: "Casual",
    descripcion: "Zapatos casuales para uso diario",
    activo: true,
    slug: "casual"
  },
  {
    nombre: "Formal",
    descripcion: "Zapatos formales elegantes",
    activo: true,
    slug: "formal"
  }
];

// Datos de productos de tenis
const productos = [
  // Nike
  {
    nombre: "Nike Air Max 270",
    descripcion: "Zapatillas Nike Air Max 270 con tecnología de amortiguación Max Air visible. Perfectas para uso diario y deportivo.",
    precio: 450000,
    stock: 25,
    marca: "Nike",
    modelo: "Air Max 270",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rojo"],
    material: "Mesh y cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Nike Air Max 270 - Zapatillas deportivas con tecnología Max Air",
    palabrasClave: ["nike", "air max", "deportivas", "amortiguación"]
  },
  {
    nombre: "Nike Air Force 1",
    descripcion: "Las icónicas Nike Air Force 1, un clásico atemporal que nunca pasa de moda. Perfectas para cualquier ocasión.",
    precio: 380000,
    stock: 30,
    marca: "Nike",
    modelo: "Air Force 1",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Blanco/Negro"],
    material: "Cuero premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: true,
      descuento: 15,
      precioOferta: 323000
    },
    metaDescripcion: "Nike Air Force 1 - Zapatillas clásicas icónicas",
    palabrasClave: ["nike", "air force", "clásicas", "cuero"]
  },
  {
    nombre: "Nike React Element 55",
    descripcion: "Zapatillas Nike React Element 55 con tecnología React para máxima comodidad y rendimiento.",
    precio: 420000,
    stock: 20,
    marca: "Nike",
    modelo: "React Element 55",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Blanco", "Negro", "Gris", "Azul"],
    material: "Mesh y React foam",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Nike React Element 55 - Tecnología React para comodidad",
    palabrasClave: ["nike", "react", "element", "comodidad"]
  },

  // Adidas
  {
    nombre: "Adidas Ultraboost 22",
    descripcion: "Adidas Ultraboost 22 con tecnología Boost para máxima energía de retorno y comodidad durante todo el día.",
    precio: 480000,
    stock: 18,
    marca: "Adidas",
    modelo: "Ultraboost 22",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Verde"],
    material: "Primeknit y Boost",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Adidas Ultraboost 22 - Tecnología Boost para running",
    palabrasClave: ["adidas", "ultraboost", "boost", "running"]
  },
  {
    nombre: "Adidas Stan Smith",
    descripcion: "Las clásicas Adidas Stan Smith, un icono del tenis que combina estilo y comodidad de manera perfecta.",
    precio: 320000,
    stock: 35,
    marca: "Adidas",
    modelo: "Stan Smith",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Verde", "Negro", "Rosa"],
    material: "Cuero premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: true,
      descuento: 20,
      precioOferta: 256000
    },
    metaDescripcion: "Adidas Stan Smith - Zapatillas clásicas de cuero",
    palabrasClave: ["adidas", "stan smith", "clásicas", "cuero"]
  },
  {
    nombre: "Adidas NMD R1",
    descripcion: "Adidas NMD R1 con diseño futurista y tecnología Boost para una experiencia de calzado única.",
    precio: 400000,
    stock: 22,
    marca: "Adidas",
    modelo: "NMD R1",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Blanco", "Negro", "Azul", "Rojo"],
    material: "Primeknit y Boost",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Adidas NMD R1 - Diseño futurista con Boost",
    palabrasClave: ["adidas", "nmd", "futurista", "boost"]
  },

  // Jordan
  {
    nombre: "Air Jordan 1 Retro High",
    descripcion: "Air Jordan 1 Retro High, el modelo que inició la leyenda. Diseño icónico con tecnología de baloncesto.",
    precio: 520000,
    stock: 15,
    marca: "Jordan",
    modelo: "Air Jordan 1 Retro High",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco/Rojo", "Negro/Blanco", "Azul/Blanco"],
    material: "Cuero premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Air Jordan 1 Retro High - Icono del baloncesto",
    palabrasClave: ["jordan", "air jordan", "retro", "baloncesto"]
  },
  {
    nombre: "Air Jordan 4 Retro",
    descripcion: "Air Jordan 4 Retro con diseño distintivo y tecnología de amortiguación Air-Sole para máximo rendimiento.",
    precio: 580000,
    stock: 12,
    marca: "Jordan",
    modelo: "Air Jordan 4 Retro",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco/Negro", "Azul/Blanco", "Rojo/Blanco"],
    material: "Cuero y malla",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Air Jordan 4 Retro - Diseño distintivo con Air-Sole",
    palabrasClave: ["jordan", "air jordan 4", "retro", "air-sole"]
  },

  // Puma
  {
    nombre: "Puma RS-X Reinvention",
    descripcion: "Puma RS-X Reinvention con diseño bold y tecnología de amortiguación RS para comodidad extrema.",
    precio: 350000,
    stock: 28,
    marca: "Puma",
    modelo: "RS-X Reinvention",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rosa", "Verde"],
    material: "Mesh y cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: true,
      descuento: 25,
      precioOferta: 262500
    },
    metaDescripcion: "Puma RS-X Reinvention - Diseño bold con tecnología RS",
    palabrasClave: ["puma", "rs-x", "reinvention", "bold"]
  },
  {
    nombre: "Puma Suede Classic",
    descripcion: "Puma Suede Classic, un clásico atemporal que combina estilo y comodidad en un diseño minimalista.",
    precio: 280000,
    stock: 40,
    marca: "Puma",
    modelo: "Suede Classic",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rojo", "Verde"],
    material: "Gamuza premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Puma Suede Classic - Clásico atemporal de gamuza",
    palabrasClave: ["puma", "suede", "classic", "gamuza"]
  },

  // Converse
  {
    nombre: "Converse Chuck Taylor All Star",
    descripcion: "Converse Chuck Taylor All Star, el icono del calzado casual que ha definido generaciones.",
    precio: 250000,
    stock: 50,
    marca: "Converse",
    modelo: "Chuck Taylor All Star",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rojo", "Verde", "Amarillo"],
    material: "Lona de algodón",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Converse Chuck Taylor All Star - Icono del calzado casual",
    palabrasClave: ["converse", "chuck taylor", "all star", "lona"]
  },
  {
    nombre: "Converse Chuck 70",
    descripcion: "Converse Chuck 70, una versión premium del clásico con materiales mejorados y construcción superior.",
    precio: 320000,
    stock: 25,
    marca: "Converse",
    modelo: "Chuck 70",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rojo"],
    material: "Lona premium y cuero",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Converse Chuck 70 - Versión premium del clásico",
    palabrasClave: ["converse", "chuck 70", "premium", "lona"]
  },

  // Vans
  {
    nombre: "Vans Old Skool",
    descripcion: "Vans Old Skool, el modelo que define la cultura skate con su diseño icónico y durabilidad legendaria.",
    precio: 280000,
    stock: 35,
    marca: "Vans",
    modelo: "Old Skool",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco/Negro", "Negro/Blanco", "Azul/Blanco", "Rojo/Blanco"],
    material: "Lona y cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Vans Old Skool - Icono de la cultura skate",
    palabrasClave: ["vans", "old skool", "skate", "lona"]
  },
  {
    nombre: "Vans Sk8-Hi",
    descripcion: "Vans Sk8-Hi con diseño de caña alta que ofrece mayor soporte y protección para el tobillo.",
    precio: 300000,
    stock: 30,
    marca: "Vans",
    modelo: "Sk8-Hi",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco/Negro", "Negro/Blanco", "Azul/Blanco"],
    material: "Lona y cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Vans Sk8-Hi - Caña alta para mayor soporte",
    palabrasClave: ["vans", "sk8-hi", "caña alta", "soporte"]
  },

  // New Balance
  {
    nombre: "New Balance 574",
    descripcion: "New Balance 574, un clásico atemporal que combina estilo retro con tecnología moderna de amortiguación.",
    precio: 350000,
    stock: 25,
    marca: "New Balance",
    modelo: "574",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Gris", "Blanco", "Negro", "Azul"],
    material: "Suede y mesh",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "New Balance 574 - Clásico retro con tecnología moderna",
    palabrasClave: ["new balance", "574", "retro", "suede"]
  },
  {
    nombre: "New Balance 990v5",
    descripcion: "New Balance 990v5 con tecnología ENCAP para máxima durabilidad y comodidad en cada paso.",
    precio: 450000,
    stock: 20,
    marca: "New Balance",
    modelo: "990v5",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Gris", "Blanco", "Negro"],
    material: "Suede premium y mesh",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "New Balance 990v5 - Tecnología ENCAP premium",
    palabrasClave: ["new balance", "990v5", "encap", "premium"]
  },

  // Reebok
  {
    nombre: "Reebok Classic Leather",
    descripcion: "Reebok Classic Leather, un icono del fitness que combina estilo clásico con comodidad duradera.",
    precio: 300000,
    stock: 30,
    marca: "Reebok",
    modelo: "Classic Leather",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Azul", "Rojo"],
    material: "Cuero premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Reebok Classic Leather - Icono del fitness",
    palabrasClave: ["reebok", "classic leather", "fitness", "cuero"]
  },
  {
    nombre: "Reebok Club C 85",
    descripcion: "Reebok Club C 85 con diseño minimalista y construcción premium para un look elegante y atemporal.",
    precio: 320000,
    stock: 25,
    marca: "Reebok",
    modelo: "Club C 85",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    colores: ["Blanco", "Negro", "Cremas"],
    material: "Cuero premium",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: false,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Reebok Club C 85 - Diseño minimalista premium",
    palabrasClave: ["reebok", "club c", "minimalista", "premium"]
  },

  // Marcas de lujo
  {
    nombre: "Balenciaga Triple S",
    descripcion: "Balenciaga Triple S, el modelo que revolucionó el streetwear de lujo con su diseño bold y construcción premium.",
    precio: 1200000,
    stock: 8,
    marca: "Balenciaga",
    modelo: "Triple S",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Blanco", "Negro", "Azul", "Rosa"],
    material: "Cuero premium y mesh",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Balenciaga Triple S - Streetwear de lujo revolucionario",
    palabrasClave: ["balenciaga", "triple s", "lujo", "streetwear"]
  },
  {
    nombre: "Off-White x Nike Air Presto",
    descripcion: "Off-White x Nike Air Presto, colaboración exclusiva que combina el diseño de Virgil Abloh con la tecnología Nike.",
    precio: 800000,
    stock: 5,
    marca: "Off-White",
    modelo: "Air Presto",
    tallas: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colores: ["Blanco", "Negro"],
    material: "Mesh y cuero sintético",
    genero: "UNISEX",
    edad: "ADULTO",
    temporada: "TODO_EL_AÑO",
    destacado: true,
    oferta: {
      activa: false,
      descuento: 0,
      precioOferta: 0
    },
    metaDescripcion: "Off-White x Nike Air Presto - Colaboración exclusiva",
    palabrasClave: ["off-white", "nike", "air presto", "colaboración"]
  }
];

async function populateDatabase() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27017/tekashi_shoes?authSource=admin");
    console.log("✅ Conectado a MongoDB");

    // Limpiar datos existentes
    await Producto.deleteMany({});
    await TipoProducto.deleteMany({});
    console.log("🧹 Datos existentes eliminados");

    // Crear tipos de producto
    const tiposCreados = await TipoProducto.insertMany(tiposProducto);
    console.log(`✅ ${tiposCreados.length} tipos de producto creados`);

    // Asignar tipos de producto a los productos
    const productosConTipos = productos.map(producto => {
      // Asignar tipo basado en la marca o características
      let tipoId;
      if (producto.marca === "Jordan" || producto.nombre.includes("Basketball")) {
        tipoId = tiposCreados.find(t => t.slug === "basketball")._id;
      } else if (producto.nombre.includes("Running") || producto.nombre.includes("Ultraboost")) {
        tipoId = tiposCreados.find(t => t.slug === "running")._id;
      } else if (producto.marca === "Balenciaga" || producto.marca === "Off-White") {
        tipoId = tiposCreados.find(t => t.slug === "formal")._id;
      } else {
        tipoId = tiposCreados.find(t => t.slug === "sneakers")._id;
      }

      return {
        ...producto,
        tipoProductoId: tipoId,
        activo: true,
        vistas: Math.floor(Math.random() * 1000),
        slug: producto.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Crear productos
    const productosCreados = await Producto.insertMany(productosConTipos);
    console.log(`✅ ${productosCreados.length} productos creados`);

    // Actualizar contadores de productos en tipos
    for (const tipo of tiposCreados) {
      await tipo.actualizarContadorProductos();
    }

    console.log("🎉 Base de datos poblada exitosamente!");
    console.log(`📊 Resumen:`);
    console.log(`   - ${tiposCreados.length} tipos de producto`);
    console.log(`   - ${productosCreados.length} productos`);
    console.log(`   - Marcas: ${[...new Set(productos.map(p => p.marca))].join(", ")}`);

  } catch (error) {
    console.error("❌ Error al poblar la base de datos:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Conexión a MongoDB cerrada");
  }
}

// Ejecutar el script
populateDatabase();
