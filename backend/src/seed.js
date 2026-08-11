// File: src/seed.js
// Description: Database seeding script for Puducherry restaurants, dishes, and walking trails.
// Author: Akilan M
// Created: 2026-08-11T17:37:35+05:30

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Restaurant = require('./models/Restaurant');
const Dish = require('./models/Dish');
const Trail = require('./models/Trail');
const SavedTrip = require('./models/SavedTrip');

const restaurantsData = [
  {
    name: 'Baker Street',
    description: 'An iconic French-style bakery and cafe famous for authentic croissants, pastries, and fresh bread.',
    address: '123 Bussy St, White Town, Puducherry',
    area: 'White Town',
    location: {
      type: 'Point',
      coordinates: [79.8338, 11.9351], // [longitude, latitude]
    },
    vibeTags: ['Indoor AC', 'Bakery'],
    busyStatus: 'Plenty of Tables',
    rating: 4.6,
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Coromandel Cafe',
    description: 'Elegant colonial mansion cafe offering European cuisine, artisanal cocktails, and a stunning pink courtyard.',
    address: '8 Romain Rolland St, White Town, Puducherry',
    area: 'White Town',
    location: {
      type: 'Point',
      coordinates: [79.8318, 11.9301],
    },
    vibeTags: ['Outdoor garden', 'Pet-friendly', 'Instagrammable'],
    busyStatus: 'Filling Up',
    rating: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Bread & Chocolate',
    description: 'A popular organic cafe serving stoneground organic chocolates, sourdough toasts, and amazing coffees.',
    address: 'Auroville Rd, Kuilapalayam, Puducherry',
    area: 'Auroville Road',
    location: {
      type: 'Point',
      coordinates: [79.8115, 11.9961],
    },
    vibeTags: ['Vegan options', 'Laptop-friendly', 'Outdoor garden'],
    busyStatus: '~15 Min Wait',
    rating: 4.7,
    photoUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Cafe des Arts',
    description: 'A vintage French cafe housed in a 19th-century colonial building, serving French crepes and sandwiches.',
    address: '10 Suffren St, White Town, Puducherry',
    area: 'White Town',
    location: {
      type: 'Point',
      coordinates: [79.8322, 11.9312],
    },
    vibeTags: ['Outdoor garden', 'Vintage vibe'],
    busyStatus: 'Plenty of Tables',
    rating: 4.5,
    photoUrl: 'https://images.unsplash.com/photo-1464979681340-1261d70b242a?w=600&auto=format&fit=crop&q=60',
  },
  {
    name: 'Well Cafe',
    description: 'Eco-friendly garden restaurant known for healthy Mediterranean items, vegan specials, and organic produce.',
    address: 'Auroville Rd, Kuilapalayam, Puducherry',
    area: 'Auroville Road',
    location: {
      type: 'Point',
      coordinates: [79.8130, 11.9995],
    },
    vibeTags: ['Vegan options', 'Outdoor garden', 'Eco-friendly'],
    busyStatus: 'Plenty of Tables',
    rating: 4.6,
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
  },
];

const dishesData = [
  // Baker Street
  {
    name: 'Almond Croissant',
    description: 'Classic flaky French croissant baked with sweet almond paste and topped with toasted almonds.',
    price: 160,
    photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Baker Street',
    rating: 4.9,
    isSignature: true,
  },
  {
    name: 'Chocolate Eclair',
    description: 'Delicate choux pastry shell filled with decadent chocolate custard and topped with dark chocolate glaze.',
    price: 140,
    photoUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Baker Street',
    rating: 4.7,
  },
  // Coromandel Cafe
  {
    name: 'Wood-fired Pizza (Margherita)',
    description: 'Neapolitan style wood-fired pizza with San Marzano tomatoes, fresh mozzarella, and aromatic basil.',
    price: 420,
    photoUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Coromandel Cafe',
    rating: 4.8,
    isSignature: true,
  },
  {
    name: 'Pink Hot Chocolate',
    description: 'Rich white chocolate milk colored naturally with beetroot and topped with roasted marshmallows.',
    price: 260,
    photoUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Coromandel Cafe',
    rating: 4.6,
  },
  // Bread & Chocolate
  {
    name: 'Avocado Sourdough Toast',
    description: 'House sourdough toast spread with fresh smashed avocado, confit garlic, cherry tomatoes, and flax seeds.',
    price: 310,
    photoUrl: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Bread & Chocolate',
    rating: 4.8,
  },
  {
    name: 'Almond Croissant',
    description: 'Sourdough-based flaky croissant loaded with stoneground organic almond butter and dark cacao nibs.',
    price: 180,
    photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Bread & Chocolate',
    rating: 4.7,
    isSignature: true,
  },
  // Cafe des Arts
  {
    name: 'Nutella Crepe',
    description: 'Fresh warm crepe folded with a generous layer of Nutella, banana slices, and a dust of powdered sugar.',
    price: 220,
    photoUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Cafe des Arts',
    rating: 4.5,
  },
  {
    name: 'Croque Monsieur',
    description: 'Classic toasted French ham and cheese sandwich baked under a bubbling layer of rich béchamel.',
    price: 290,
    photoUrl: 'https://images.unsplash.com/photo-1475090169767-40ed8d18a67d?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Cafe des Arts',
    rating: 4.6,
    isSignature: true,
  },
  // Well Cafe
  {
    name: 'Vegan Falafel Wrap',
    description: 'Soft flatbread wrap filled with freshly fried crisp falafels, creamy hummus, salad, and tahini sauce.',
    price: 240,
    photoUrl: 'https://images.unsplash.com/photo-1626700051175-6518c4793f4f?w=600&auto=format&fit=crop&q=60',
    restaurantName: 'Well Cafe',
    rating: 4.7,
  },
];

async function seedDatabase() {
  try {
    await connectDB();

    // Clear existing collections
    await Restaurant.deleteMany({});
    await Dish.deleteMany({});
    await Trail.deleteMany({});
    await SavedTrip.deleteMany({});
    console.log('Cleared existing database entries.');

    // Seed Restaurants
    const createdRestaurants = await Restaurant.insertMany(restaurantsData);
    console.log(`Successfully seeded ${createdRestaurants.length} restaurants.`);

    // Map restaurants by name for easy matching in dishes/trails
    const restaurantMap = {};
    createdRestaurants.forEach((rest) => {
      restaurantMap[rest.name] = rest._id;
    });

    // Match restaurantId for Dishes
    const dishesToSeed = dishesData.map((dish) => {
      const { restaurantName, ...dishDetails } = dish;
      const restaurantId = restaurantMap[restaurantName];
      if (!restaurantId) {
        throw new Error(`Restaurant ${restaurantName} not found for dish ${dish.name}`);
      }
      return {
        ...dishDetails,
        restaurantId,
      };
    });

    // Seed Dishes
    const createdDishes = await Dish.insertMany(dishesToSeed);
    console.log(`Successfully seeded ${createdDishes.length} dishes.`);

    // Define Trails
    const trailsData = [
      {
        name: 'White Town Morning Bakery Trail',
        description: 'A refreshing morning walk through the French Quarter. Grab a warm croissant, look around the vintage buildings, and end with a premium beverage in a beautiful pink courtyard.',
        estimatedDuration: 10,
        distance: 800,
        area: 'White Town',
        photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=60',
        stops: [
          {
            order: 1,
            restaurantId: restaurantMap['Baker Street'],
            description: 'Start with a fresh, warm Almond Croissant right out of the oven.',
          },
          {
            order: 2,
            restaurantId: restaurantMap['Cafe des Arts'],
            description: 'Stop by this colonial-era yellow house for a crepe or to check out their vintage wall art.',
          },
          {
            order: 3,
            restaurantId: restaurantMap['Coromandel Cafe'],
            description: 'Conclude the trail with a famous pink hot chocolate in their tranquil garden.',
          },
        ],
      },
      {
        name: 'Auroville Road Eco-Cafes',
        description: 'Escape the city rush. Take a stroll along Auroville Road to experience green garden cafes, stoneground chocolates, organic produce, and healthy vegan options.',
        estimatedDuration: 15,
        distance: 1200,
        area: 'Auroville Road',
        photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
        stops: [
          {
            order: 1,
            restaurantId: restaurantMap['Bread & Chocolate'],
            description: 'Kick off your trail with a clean cold brew and a robust Avocado Sourdough toast.',
          },
          {
            order: 2,
            restaurantId: restaurantMap['Well Cafe'],
            description: 'Relax in their open-air garden and enjoy a wholesome vegan falafel wrap.',
          },
        ],
      },
    ];

    // Seed Trails
    const createdTrails = await Trail.insertMany(trailsData);
    console.log(`Successfully seeded ${createdTrails.length} walking trails.`);

    console.log('Database seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
