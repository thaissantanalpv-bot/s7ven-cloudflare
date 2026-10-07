export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
};

// Número do WhatsApp da loja (somente dígitos, com DDI + DDD)
export const WHATSAPP_NUMBER = "5518988244263";
export const STORE_NAME = "S7VEN Lounge e Tabacaria";

export const CATEGORIES = ["Todos", "Bebidas", "Cases", "Charuto", "Fluido", "Headshop", "Isqueiros/Maçarico", "Juice", "Narguiles", "Palheiros", "Piteiras", "Pod Descartável", "Sedas", "Tabaco", "Tereré", "Tesoura", "Narguiles > Abafadores", "Narguiles > Alumínio", "Narguiles > Caixa de Carvão", "Narguiles > COMBOS DE ESSÊNCIAS", "Narguiles > Essências", "Narguiles > Piteira Para Narguile", "Narguiles > Rosh", "Narguiles > Vasos"];

export const PRODUCTS: Product[] = [
  {
    "id": "p1",
    "name": "Combo Gin Viagem",
    "description": "",
    "price": 45.0,
    "category": "Bebidas",
    "emoji": "🍹"
  },
  {
    "id": "p2",
    "name": "Energético Bally 2 Litros",
    "description": "",
    "price": 12.9,
    "category": "Bebidas",
    "emoji": "🍹"
  },
  {
    "id": "p3",
    "name": "Gelo de Sabor",
    "description": "Sabores: Coco, Maçã Verde, Melancia...",
    "price": 4.0,
    "category": "Bebidas",
    "emoji": "🍹"
  },
  {
    "id": "p4",
    "name": "Gin Invictus",
    "description": "Sabores: Maçã verde, Melancia, Morango...",
    "price": 20.9,
    "category": "Bebidas",
    "emoji": "🍹"
  },
  {
    "id": "p5",
    "name": "Kit com Case",
    "description": "",
    "price": 35.0,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p6",
    "name": "Kit com Case",
    "description": "",
    "price": 39.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p7",
    "name": "Kit com Case Completo Azul",
    "description": "",
    "price": 49.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p8",
    "name": "Kit com Case Completo Preto",
    "description": "",
    "price": 49.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p9",
    "name": "Kit com Case Completo Rosa",
    "description": "",
    "price": 49.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p10",
    "name": "Kit com Case Completo Verde",
    "description": "",
    "price": 49.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p11",
    "name": "Kit Completo com Case Sesh",
    "description": "",
    "price": 139.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p12",
    "name": "Mini Case",
    "description": "",
    "price": 19.9,
    "category": "Cases",
    "emoji": "🎒"
  },
  {
    "id": "p13",
    "name": "Charuto Baianinho de Chocolate",
    "description": "",
    "price": 8.0,
    "category": "Charuto",
    "emoji": "🚬"
  },
  {
    "id": "p14",
    "name": "Charuto Mulatinha Corona",
    "description": "",
    "price": 6.0,
    "category": "Charuto",
    "emoji": "🚬"
  },
  {
    "id": "p15",
    "name": "Fluido Para Isqueiro Flux 60ml",
    "description": "",
    "price": 12.0,
    "category": "Fluido",
    "emoji": "🧴"
  },
  {
    "id": "p16",
    "name": "Gás Butano Para Maçarico",
    "description": "",
    "price": 22.0,
    "category": "Fluido",
    "emoji": "🧴"
  },
  {
    "id": "p17",
    "name": "Dichavador de Policarbonato Cremaria",
    "description": "",
    "price": 12.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p18",
    "name": "Anel de Silicone",
    "description": "",
    "price": 12.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p19",
    "name": "Bolador",
    "description": "",
    "price": 30.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p20",
    "name": "Bolador Guru Spirit",
    "description": "Cores: Azul, Branco, Laranja Claro...",
    "price": 25.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p21",
    "name": "Bong de Acrílico",
    "description": "",
    "price": 29.9,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p22",
    "name": "Cinzeiro de Metal",
    "description": "",
    "price": 5.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p23",
    "name": "Cuia Média",
    "description": "",
    "price": 12.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p24",
    "name": "Cuia Pequena",
    "description": "",
    "price": 9.9,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p25",
    "name": "Dichavador Acrílico Black",
    "description": "Cores: Amarelo, Preto, Verde",
    "price": 10.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p26",
    "name": "Dichavador de Ferro",
    "description": "",
    "price": 45.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p27",
    "name": "Dichavador de Ferro Pequeno",
    "description": "",
    "price": 25.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p28",
    "name": "Dichavador Fibra De Coco",
    "description": "",
    "price": 10.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p29",
    "name": "Filtro Slim Dark Horse",
    "description": "",
    "price": 7.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p30",
    "name": "Maçarico Fire",
    "description": "",
    "price": 15.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p31",
    "name": "Pré Bolado",
    "description": "",
    "price": 13.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p32",
    "name": "Rapé",
    "description": "",
    "price": 3.5,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p33",
    "name": "Slick Pequeno",
    "description": "",
    "price": 7.99,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p34",
    "name": "Tesoura Ice Bud",
    "description": "Cores: Dourada, Prata, Rose",
    "price": 16.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p35",
    "name": "Tubete",
    "description": "",
    "price": 12.0,
    "category": "Headshop",
    "emoji": "🌿"
  },
  {
    "id": "p36",
    "name": "Isqueiro Bic",
    "description": "",
    "price": 6.5,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p37",
    "name": "Isqueiro Blaz",
    "description": "",
    "price": 2.0,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p38",
    "name": "Isqueiro Chama",
    "description": "",
    "price": 2.0,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p39",
    "name": "Isqueiro Maçarico Moon",
    "description": "",
    "price": 10.0,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p40",
    "name": "Maçarico de Fluido",
    "description": "",
    "price": 14.0,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p41",
    "name": "Maçarico Prof",
    "description": "Cores: Azul, Roxo, Verde Militar...",
    "price": 16.0,
    "category": "Isqueiros/Maçarico",
    "emoji": "🔥"
  },
  {
    "id": "p42",
    "name": "Essência Para Juice Sem Nicotina",
    "description": "Sabores: 7 Belo, Blueberry, Bubaloo...",
    "price": 19.9,
    "category": "Juice",
    "emoji": "💨"
  },
  {
    "id": "p43",
    "name": "Furador Copa do Mundo",
    "description": "",
    "price": 15.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p44",
    "name": "Kaloud",
    "description": "",
    "price": 30.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p45",
    "name": "Molde para Furação",
    "description": "Cores: Azul, Laranja, Rosa...",
    "price": 10.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p46",
    "name": "Narguile Chininha",
    "description": "",
    "price": 70.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p47",
    "name": "Narguile Completo Simples",
    "description": "",
    "price": 130.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p48",
    "name": "Narguile Completo Velvet",
    "description": "",
    "price": 250.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p49",
    "name": "Panelinha Media",
    "description": "",
    "price": 45.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p50",
    "name": "Panelinha Pequena",
    "description": "",
    "price": 35.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p51",
    "name": "Pegador",
    "description": "",
    "price": 14.0,
    "category": "Narguiles",
    "emoji": "🫧"
  },
  {
    "id": "p52",
    "name": "Palheiro Aroma do Campo Menta",
    "description": "",
    "price": 7.5,
    "category": "Palheiros",
    "emoji": "🛍️"
  },
  {
    "id": "p53",
    "name": "Palheiro Paulistinha",
    "description": "",
    "price": 34.0,
    "category": "Palheiros",
    "emoji": "🛍️"
  },
  {
    "id": "p54",
    "name": "Palheiros Cutiano",
    "description": "Sabores: Menta, Tradicional",
    "price": 8.0,
    "category": "Palheiros",
    "emoji": "🛍️"
  },
  {
    "id": "p55",
    "name": "Palheiros JC",
    "description": "Sabores: Menta, Uva",
    "price": 9.0,
    "category": "Palheiros",
    "emoji": "🛍️"
  },
  {
    "id": "p56",
    "name": "Palheiros Santropez",
    "description": "Sabores: Menta",
    "price": 24.0,
    "category": "Palheiros",
    "emoji": "🛍️"
  },
  {
    "id": "p57",
    "name": "Piteira Extra Large Cremaria",
    "description": "",
    "price": 4.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p58",
    "name": "Pecinha para Vaso/Mangueira/Rosh",
    "description": "Peça: Mangueira, Rosh, Vaso",
    "price": 6.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p59",
    "name": "Piteira Bear Tips Longa",
    "description": "",
    "price": 5.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p60",
    "name": "Piteira Clássica Lá Revolucion",
    "description": "",
    "price": 4.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p61",
    "name": "Piteira de Vidro Hippie Bong",
    "description": "",
    "price": 9.9,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p62",
    "name": "Piteira Extra Large Monster",
    "description": "",
    "price": 6.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p63",
    "name": "Piteira Extra Large Tatu Do Bem",
    "description": "",
    "price": 8.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p64",
    "name": "Piteira Large Sadhu",
    "description": "",
    "price": 4.5,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p65",
    "name": "Piteira Papelito Mega Longa",
    "description": "",
    "price": 7.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p66",
    "name": "Piteira Papelito Ultra Longa",
    "description": "",
    "price": 7.5,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p67",
    "name": "Piteira Pequena Tatu Do Bem",
    "description": "",
    "price": 4.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p68",
    "name": "Piteira Sesh Extra Longa",
    "description": "",
    "price": 7.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p69",
    "name": "Piteira Ultra Longa La Revolucion",
    "description": "",
    "price": 6.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p70",
    "name": "Piteira Ultra Longa Tô na Be",
    "description": "",
    "price": 9.0,
    "category": "Piteiras",
    "emoji": "🛍️"
  },
  {
    "id": "p71",
    "name": "Pod Descartável Ignite 30k",
    "description": "Sabores: Dragon Fruit Watermelon, Melon...",
    "price": 130.0,
    "category": "Pod Descartável",
    "emoji": "🛍️"
  },
  {
    "id": "p72",
    "name": "Blunt King",
    "description": "Sabores: Baunilha, Chocolate, Maçã Verde...",
    "price": 10.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p73",
    "name": "Seda Aleda Celulose",
    "description": "",
    "price": 5.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p74",
    "name": "Seda Bem Bolado Brown",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p75",
    "name": "Seda Bem Bolado MC Kevin",
    "description": "",
    "price": 5.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p76",
    "name": "Seda Bem Bolado Pop",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p77",
    "name": "Seda Brown Large",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p78",
    "name": "Seda Brown Slim",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p79",
    "name": "Seda de Sabor Lion Rolling Circus",
    "description": "Sabores: Chocolate, Morango",
    "price": 10.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p80",
    "name": "Seda Dólar",
    "description": "",
    "price": 8.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p81",
    "name": "Seda Elements",
    "description": "",
    "price": 8.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p82",
    "name": "Seda Keep Rolling",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p83",
    "name": "Seda King Mini Size Ultra Fino",
    "description": "",
    "price": 1.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p84",
    "name": "Seda King Sadhu",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p85",
    "name": "Seda King Size Brown Crema",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p86",
    "name": "Seda King Size Slim Crema",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p87",
    "name": "Seda King Size Smoking Brown",
    "description": "",
    "price": 6.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p88",
    "name": "Seda Longa Blue Ice Sadhu",
    "description": "",
    "price": 7.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p89",
    "name": "Seda OCB",
    "description": "",
    "price": 7.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p90",
    "name": "Seda Papelito Brown",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p91",
    "name": "Seda Papelito Slim",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p92",
    "name": "Seda Papelito Tradicional",
    "description": "",
    "price": 4.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p93",
    "name": "Seda Raw",
    "description": "",
    "price": 8.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p94",
    "name": "Seda Sadhu Slim Longa",
    "description": "",
    "price": 6.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p95",
    "name": "Seda Sasso Rolling King Slim",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p96",
    "name": "Seda Smoking Master",
    "description": "",
    "price": 8.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p97",
    "name": "Seda Zomo Hemp",
    "description": "",
    "price": 2.5,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p98",
    "name": "Seda Zomo Perfect",
    "description": "",
    "price": 2.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p99",
    "name": "Seda Zomo Slim",
    "description": "",
    "price": 3.0,
    "category": "Sedas",
    "emoji": "🛍️"
  },
  {
    "id": "p100",
    "name": "Filtro para Tabaco c/ 130 unidades",
    "description": "",
    "price": 8.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p101",
    "name": "Tabaco de Baunilha Tabash 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p102",
    "name": "Tabaco Acrema 80gr",
    "description": "",
    "price": 69.9,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p103",
    "name": "Tabaco Acrema Blend 20gr",
    "description": "",
    "price": 16.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p104",
    "name": "Tabaco Amsterdã",
    "description": "",
    "price": 16.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p105",
    "name": "Tabaco de Baunilha Crazy Dogs 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p106",
    "name": "Tabaco de Limão Crazy Dogs 25gr",
    "description": "",
    "price": 18.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p107",
    "name": "Tabaco de Maracujá Tabash 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p108",
    "name": "Tabaco de Menta Tabash 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p109",
    "name": "Tabaco Dora Ice 20gr",
    "description": "",
    "price": 18.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p110",
    "name": "Tabaco Dora Melancia 20gr",
    "description": "",
    "price": 16.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p111",
    "name": "Tabaco Dora Mint 20gr",
    "description": "",
    "price": 16.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p112",
    "name": "Tabaco Dublin Ice Mint 25gr",
    "description": "",
    "price": 16.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p113",
    "name": "Tabaco Dublin Pink 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p114",
    "name": "Tabaco Dublin Purple 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p115",
    "name": "Tabaco Jah 15gr",
    "description": "",
    "price": 10.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p116",
    "name": "Tabaco Lion Rolling Circus 30gr",
    "description": "",
    "price": 18.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p117",
    "name": "Tabaco Marajó Extra Leve 35gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p118",
    "name": "Tabaco Pêssego Crazy Dogs 25gr",
    "description": "",
    "price": 18.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p119",
    "name": "Tabaco Tabaquin 20gr",
    "description": "",
    "price": 14.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p120",
    "name": "Tabaco Tabas Orgânico 25gr",
    "description": "",
    "price": 12.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p121",
    "name": "Tabaco Terpenado Weed",
    "description": "Sabores: Limão, Uva",
    "price": 19.9,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p122",
    "name": "Tabaco TOG 25gr",
    "description": "",
    "price": 15.0,
    "category": "Tabaco",
    "emoji": "🛍️"
  },
  {
    "id": "p123",
    "name": "Erva de Tereré Black",
    "description": "Sabores: Cereja Ice, Menta e Boldo",
    "price": 22.0,
    "category": "Tereré",
    "emoji": "🛍️"
  },
  {
    "id": "p124",
    "name": "Erva de Tereré Tereré Raiz",
    "description": "Sabores: Cereja Ice, Limão Rosa, Menta...",
    "price": 19.9,
    "category": "Tereré",
    "emoji": "🛍️"
  },
  {
    "id": "p125",
    "name": "Erva de Tereré Tererex",
    "description": "Sabores: Extreme Mint, Intense, Menta...",
    "price": 18.0,
    "category": "Tereré",
    "emoji": "🛍️"
  },
  {
    "id": "p126",
    "name": "Tesoura Lux",
    "description": "",
    "price": 12.0,
    "category": "Tesoura",
    "emoji": "🛍️"
  },
  {
    "id": "p127",
    "name": "Tesoura MD",
    "description": "",
    "price": 16.0,
    "category": "Tesoura",
    "emoji": "🛍️"
  },
  {
    "id": "p128",
    "name": "Tesourinha Para Tabaco",
    "description": "",
    "price": 12.0,
    "category": "Tesoura",
    "emoji": "🛍️"
  },
  {
    "id": "p129",
    "name": "Abafador",
    "description": "Cores: Prata, Rosa",
    "price": 30.0,
    "category": "Narguiles > Abafadores",
    "emoji": "🛍️"
  },
  {
    "id": "p130",
    "name": "Pack de Alumínio Asterisco",
    "description": "",
    "price": 13.0,
    "category": "Narguiles > Alumínio",
    "emoji": "🛍️"
  },
  {
    "id": "p131",
    "name": "Papel Alumínio Avulso",
    "description": "",
    "price": 0.5,
    "category": "Narguiles > Alumínio",
    "emoji": "🛍️"
  },
  {
    "id": "p132",
    "name": "Caixa de Carvão Fumax 500gr",
    "description": "",
    "price": 28.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p133",
    "name": "Caixa de Carvão Fumeta 1kg",
    "description": "",
    "price": 35.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p134",
    "name": "Caixa de Carvão Rainbow Premium 1kg",
    "description": "",
    "price": 50.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p135",
    "name": "Caixa de Carvão Summer 32 Peças",
    "description": "",
    "price": 22.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p136",
    "name": "Caixa de Carvão Unicoco 1kg",
    "description": "",
    "price": 50.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p137",
    "name": "Caixa de Carvão Unicoco 500gr",
    "description": "",
    "price": 25.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p138",
    "name": "Carvão Unitário Coco Black",
    "description": "",
    "price": 0.5,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p139",
    "name": "Carvão Unitário Fumeta",
    "description": "",
    "price": 1.0,
    "category": "Narguiles > Caixa de Carvão",
    "emoji": "🛍️"
  },
  {
    "id": "p140",
    "name": "Combo Nay",
    "description": "",
    "price": 30.0,
    "category": "Narguiles > COMBOS DE ESSÊNCIAS",
    "emoji": "🛍️"
  },
  {
    "id": "p141",
    "name": "Combo Ziggy",
    "description": "",
    "price": 30.0,
    "category": "Narguiles > COMBOS DE ESSÊNCIAS",
    "emoji": "🛍️"
  },
  {
    "id": "p142",
    "name": "Combo Zomo",
    "description": "",
    "price": 30.0,
    "category": "Narguiles > COMBOS DE ESSÊNCIAS",
    "emoji": "🛍️"
  },
  {
    "id": "p143",
    "name": "Essência Lust Leite Condensado",
    "description": "",
    "price": 7.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p144",
    "name": "Essência Pimp",
    "description": "Sabores: Banana, Melancia, Tutti Frutti...",
    "price": 10.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p145",
    "name": "Essência Adalya Love 66",
    "description": "",
    "price": 19.9,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p146",
    "name": "Essência Babos",
    "description": "Sabores: Mint, Pineapple, Watermelon...",
    "price": 11.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p147",
    "name": "Essência Nay",
    "description": "Sabores: Berries Blend, Blueberry Gra...",
    "price": 10.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p148",
    "name": "Essência Onix",
    "description": "Sabores: Chocomenta, Coco com Limão,...",
    "price": 12.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p149",
    "name": "Essência para narguile Myza Melancia",
    "description": "",
    "price": 7.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p150",
    "name": "Essência para narguile Myza Morango com…",
    "description": "",
    "price": 7.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p151",
    "name": "Essência Sense",
    "description": "Sabores: Absolut Mint, Baunilha Mix,...",
    "price": 12.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p152",
    "name": "Essência Smyrna",
    "description": "Sabores: Cherry Lemon, Cherry Orange,...",
    "price": 13.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p153",
    "name": "Essência Ziggy",
    "description": "Sabores: 7 Belo, Banana Tropical, Bur...",
    "price": 10.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p154",
    "name": "Essência Zomo",
    "description": "Sabores: Bala de Morango, Blueberry,...",
    "price": 10.0,
    "category": "Narguiles > Essências",
    "emoji": "🛍️"
  },
  {
    "id": "p155",
    "name": "Piteira Acid",
    "description": "",
    "price": 20.0,
    "category": "Narguiles > Piteira Para Narguile",
    "emoji": "🛍️"
  },
  {
    "id": "p156",
    "name": "Piteira de Gelo",
    "description": "",
    "price": 80.0,
    "category": "Narguiles > Piteira Para Narguile",
    "emoji": "🛍️"
  },
  {
    "id": "p157",
    "name": "Piteira Fina Black Hookah",
    "description": "",
    "price": 20.0,
    "category": "Narguiles > Piteira Para Narguile",
    "emoji": "🛍️"
  },
  {
    "id": "p158",
    "name": "Rosh",
    "description": "",
    "price": 19.9,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p159",
    "name": "Rosh coringa",
    "description": "",
    "price": 20.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p160",
    "name": "Rosh Free Hookah",
    "description": "",
    "price": 25.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p161",
    "name": "Rosh Hookah Gold",
    "description": "",
    "price": 45.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p162",
    "name": "Rosh Nick",
    "description": "Cores: Azul Bebê, Branco",
    "price": 25.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p163",
    "name": "Rosh Sense",
    "description": "",
    "price": 25.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p164",
    "name": "Rosh Seven",
    "description": "",
    "price": 49.9,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p165",
    "name": "Rosh Simples",
    "description": "Cores: Azul, Branco, Cinza...",
    "price": 20.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p166",
    "name": "Rosh Simples",
    "description": "Cores: Azul Bebê, Preto",
    "price": 19.9,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p167",
    "name": "Rosh Ziggy",
    "description": "",
    "price": 25.0,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p168",
    "name": "Rosh Ziggy",
    "description": "",
    "price": 39.9,
    "category": "Narguiles > Rosh",
    "emoji": "🛍️"
  },
  {
    "id": "p169",
    "name": "Vaso Nasa",
    "description": "Cores: Branco, Preto",
    "price": 0.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p170",
    "name": "Vaso Para Narguile",
    "description": "",
    "price": 49.9,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p171",
    "name": "Vaso Para Narguile",
    "description": "",
    "price": 29.9,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p172",
    "name": "Vaso Para Narguile",
    "description": "",
    "price": 50.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p173",
    "name": "Vaso Para Narguile Grande",
    "description": "",
    "price": 90.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p174",
    "name": "Vaso Redondo Transparente",
    "description": "",
    "price": 20.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p175",
    "name": "Vaso Reforçado",
    "description": "Cores: Amarelo com Preto, Branco, Preto...",
    "price": 35.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  },
  {
    "id": "p176",
    "name": "Vaso Simples Transparente",
    "description": "",
    "price": 25.0,
    "category": "Narguiles > Vasos",
    "emoji": "🛍️"
  }
];

export const PAYMENT_METHODS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
