// Curated travel facts by country ISO2 code
// Each country has 3-5 interesting facts for variety

const countryFacts: Record<string, string[]> = {
  // Africa
  DZ: ["Algeria is the largest country in Africa by land area.", "The Sahara Desert covers over 80% of Algeria's territory.", "Algeria has seven UNESCO World Heritage Sites."],
  AO: ["Angola's Kalandula Falls are among the largest waterfalls in Africa.", "Angola is the second-largest oil producer in Sub-Saharan Africa.", "The country has over 1,600 km of Atlantic coastline."],
  BW: ["Botswana's Okavango Delta is the world's largest inland delta.", "Botswana is home to one of the largest elephant populations on Earth.", "Diamonds account for about 70% of Botswana's export earnings."],
  EG: ["The Great Pyramid of Giza is the only surviving Wonder of the Ancient World.", "Egypt's Suez Canal handles roughly 12% of global trade.", "Cairo is the largest city in the Arab world and Africa."],
  ET: ["Ethiopia follows a unique calendar that is 7-8 years behind the Gregorian calendar.", "Ethiopia is the birthplace of coffee — the legend of Kaldi and his goats.", "Addis Ababa is the diplomatic capital of Africa, hosting the African Union."],
  GH: ["Ghana was the first sub-Saharan African country to gain independence (1957).", "Lake Volta in Ghana is one of the world's largest artificial lakes.", "Ghana is the second-largest cocoa producer in the world."],
  KE: ["Kenya's Great Rift Valley is visible from space.", "The Maasai Mara hosts the world's greatest annual wildebeest migration.", "Kenya is one of the world's top tea exporters."],
  MA: ["Morocco is home to the world's oldest university, the University of al-Qarawiyyin (859 AD).", "The blue city of Chefchaouen is painted entirely in shades of blue.", "Morocco is the world's largest exporter of phosphates."],
  MU: ["Mauritius is home to the now-extinct dodo bird.", "Mauritius has underwater waterfalls — an optical illusion caused by sand and silt.", "The island has no indigenous population; everyone is a descendant of immigrants."],
  NA: ["Namibia's Namib Desert is considered the oldest desert in the world (~55 million years).", "Namibia was the first African country to incorporate environmental protection into its constitution.", "The Skeleton Coast is named for whale and seal bones that once lined its shores."],
  NG: ["Nigeria is the most populous country in Africa with over 200 million people.", "Nollywood produces more films annually than Hollywood.", "Nigeria has over 500 distinct languages."],
  RW: ["Rwanda banned single-use plastic bags in 2008, making it one of the cleanest countries in Africa.", "Rwanda has the highest percentage of women in parliament worldwide.", "Mountain gorillas in Volcanoes National Park are one of Rwanda's biggest draws."],
  ZA: ["South Africa has three capital cities: Pretoria, Cape Town, and Bloemfontein.", "Table Mountain is estimated to be one of the oldest mountains in the world.", "South Africa is the only country to have voluntarily dismantled its nuclear weapons."],
  TZ: ["Mount Kilimanjaro is the tallest free-standing mountain in the world.", "Zanzibar was once the world's leading clove producer.", "The Serengeti migration involves over 1.5 million wildebeest."],
  TN: ["Tunisia's amphitheatre of El Jem is the third-largest Roman amphitheatre ever built.", "Star Wars' Tatooine scenes were filmed in the Tunisian town of Tataouine.", "Tunisia was the birthplace of the Arab Spring in 2010."],

  // Europe
  AT: ["Austria has produced more Nobel Prize winners per capita than most countries.", "The world's oldest zoo, Tiergarten Schönbrunn, is in Vienna (1752).", "Austria is 62% covered by the Alps."],
  BE: ["Belgium has over 1,000 varieties of beer.", "Brussels' Manneken Pis statue has over 1,000 costumes.", "Belgium produces 220,000 tonnes of chocolate per year."],
  HR: ["Croatia has over 1,200 islands, but only about 50 are inhabited.", "The necktie originated in Croatia — 'cravat' comes from 'Croat'.", "Dubrovnik's old town served as King's Landing in Game of Thrones."],
  CZ: ["Prague Castle is the largest ancient castle complex in the world.", "The Czech Republic has the highest beer consumption per capita globally.", "The word 'robot' was coined by Czech writer Karel Čapek."],
  DK: ["Denmark's flag (Dannebrog) is the oldest national flag still in use.", "LEGO was invented in Billund, Denmark in 1932.", "Copenhagen's Tivoli Gardens inspired Walt Disney to create Disneyland."],
  FI: ["Finland has over 3 million saunas for a population of 5.5 million.", "Finland was the first country to make broadband access a legal right.", "Finnish people drink the most coffee per capita in the world."],
  FR: ["France is the most visited country in the world with over 89 million tourists annually.", "There are over 400 varieties of French cheese.", "The Eiffel Tower was originally meant to be a temporary structure."],
  DE: ["Germany has over 1,500 varieties of beer and 1,300 breweries.", "The autobahn is one of the few highway systems with no general speed limit.", "Oktoberfest attracts over 6 million visitors each year."],
  GR: ["Greece has more archaeological museums than any other country.", "The Greek alphabet has been in use for over 2,700 years.", "Greece gets about 250 days of sunshine per year."],
  HU: ["Budapest has the largest thermal water cave system in the world.", "Hungary invented the Rubik's Cube, ballpoint pen, and Vitamin C extraction.", "Lake Balaton is the largest lake in Central Europe."],
  IS: ["Iceland has no mosquitoes.", "Icelanders read more books per capita than any other nation.", "Iceland runs almost entirely on renewable energy (geothermal and hydroelectric)."],
  IE: ["Ireland's pub culture dates back over 1,000 years — Sean's Bar in Athlone (900 AD).", "Halloween originated from the ancient Celtic festival of Samhain in Ireland.", "The Cliffs of Moher rise 214 meters above the Atlantic."],
  IT: ["Italy has the most UNESCO World Heritage Sites of any country (58+).", "The University of Bologna (1088) is the oldest university in continuous operation.", "Italians consume about 26 kg of pasta per person per year."],
  NL: ["The Netherlands has more bikes than people.", "About one-third of the Netherlands lies below sea level.", "The Dutch are statistically the tallest people in the world."],
  NO: ["Norway's coastline, including fjords and islands, stretches over 100,000 km.", "Norway introduced salmon sushi to Japan in the 1980s.", "The midnight sun can be seen for up to 76 days in northern Norway."],
  PL: ["Poland is home to the world's largest castle by land area — Malbork Castle.", "Poland's Wieliczka Salt Mine has an underground cathedral carved entirely from salt.", "Kraków's Main Square is the largest medieval town square in Europe."],
  PT: ["Portugal is the oldest country in Europe with the same defined borders since 1139.", "Lisbon is older than Rome by hundreds of years.", "Portugal's Vasco da Gama Bridge is the longest in Europe (12.3 km)."],
  ES: ["Spain has more bars per capita than any other European country.", "La Tomatina festival uses about 150,000 tomatoes.", "Spanish is the second most spoken native language in the world."],
  SE: ["Sweden has a hotel made entirely of ice that's rebuilt every winter.", "Sweden introduced the concept of 'fika' — a daily coffee and pastry break.", "IKEA, Spotify, and Skype all originated from Sweden."],
  CH: ["Switzerland has enough nuclear bunkers to shelter its entire population.", "Swiss trains are so punctual that a delay of 3+ minutes counts as 'late'.", "Switzerland has four official languages: German, French, Italian, and Romansh."],
  GB: ["The London Underground is the oldest metro system in the world (1863).", "The UK has no written constitution.", "Big Ben is actually the name of the bell, not the tower."],

  // Asia
  CN: ["The Great Wall of China spans over 21,000 km.", "China invented paper, printing, gunpowder, and the compass.", "Chinese is the most spoken native language in the world."],
  IN: ["India has the world's largest postal network with over 155,000 post offices.", "The game of chess originated in India.", "India's Kumbh Mela gathering is visible from space."],
  ID: ["Indonesia has over 17,000 islands — the most of any country.", "Komodo dragons are found only in Indonesia.", "Indonesia is home to the world's largest flower, Rafflesia arnoldii."],
  JP: ["Japan has over 6,800 islands and 110 active volcanoes.", "Vending machines in Japan sell everything from hot soup to fresh eggs.", "Japan's Shinkansen bullet trains have an average delay of under 1 minute per year."],
  KR: ["South Korea's internet speed is consistently among the fastest in the world.", "Seoul's subway system has heated seats in winter.", "Taekwondo originated in Korea."],
  MY: ["Malaysia's Petronas Towers were the world's tallest buildings from 1998-2004.", "Malaysia has one of the oldest rainforests in the world (~130 million years).", "The country is home to the world's largest flower, Rafflesia."],
  MN: ["Mongolia is the least densely populated country in the world.", "Genghis Khan's empire was the largest contiguous land empire in history.", "Mongolia has more horses than people."],
  NP: ["Nepal is home to 8 of the world's 10 tallest mountains.", "Nepal's flag is the only national flag that isn't rectangular.", "Lumbini, Nepal is the birthplace of Buddha."],
  PH: ["The Philippines has over 7,600 islands.", "The Philippines has the longest Christmas celebration — starting in September.", "Jeepneys are the most popular form of public transport."],
  SG: ["Singapore is both a city and a country.", "Chewing gum has been banned in Singapore since 1992.", "Singapore's Changi Airport has been voted the world's best airport multiple times."],
  TH: ["Thailand is the only Southeast Asian country never colonized by a European power.", "Bangkok's full ceremonial name is 168 characters long.", "Thailand is the world's second-largest exporter of rice."],
  TR: ["Turkey straddles two continents — Europe and Asia.", "Istanbul's Grand Bazaar is one of the oldest and largest covered markets, with 4,000+ shops.", "Turkey introduced coffee to Europe in the 16th century."],
  VN: ["Vietnam is the world's second-largest coffee exporter.", "Halong Bay has nearly 2,000 limestone islands.", "Motorbikes outnumber cars 45 to 1 in Vietnam."],
  AE: ["The Burj Khalifa in Dubai is the tallest building in the world at 828 meters.", "Abu Dhabi's Sheikh Zayed Mosque can hold 40,000 worshippers.", "Dubai's Palm Jumeirah is the world's largest artificial island."],

  // Americas
  AR: ["Argentina has the widest avenue in the world — Avenida 9 de Julio in Buenos Aires.", "Argentina is the birthplace of tango.", "Patagonia's Perito Moreno glacier is one of the few advancing glaciers."],
  BR: ["Brazil's Amazon Rainforest produces about 20% of the world's oxygen.", "Brazil has won the FIFA World Cup a record 5 times.", "São Paulo has the largest Japanese population outside Japan."],
  CA: ["Canada has more lakes than all other countries combined.", "Canada's coastline is the longest in the world at 243,000 km.", "Maple syrup production: Canada produces 71% of the world's supply."],
  CL: ["Chile is the longest north-south country, stretching over 4,300 km.", "The Atacama Desert in Chile is the driest place on Earth.", "Easter Island (Rapa Nui) with its Moai statues belongs to Chile."],
  CO: ["Colombia is the only South American country with coastlines on both the Pacific and Caribbean.", "Colombia produces the most emeralds in the world.", "Bogotá's Ciclovía closes 120 km of roads to cars every Sunday for cyclists."],
  CR: ["Costa Rica has no military — it was abolished in 1948.", "Costa Rica contains nearly 6% of the world's biodiversity.", "Over 25% of Costa Rica's land is protected national parks."],
  CU: ["Cuba has one of the highest literacy rates in the world (99.8%).", "Classic American cars from the 1950s are still daily drivers in Cuba.", "Cuba has 9 UNESCO World Heritage Sites."],
  MX: ["Mexico City is built on a lake and sinks about 10 inches per year.", "Mexico introduced chocolate, chilies, and corn to the world.", "Mexico has 35 UNESCO World Heritage Sites — more than any other country in the Americas."],
  PE: ["Machu Picchu was built around 1450 AD and never discovered by the Spanish.", "Peru has 90 different microclimates.", "The Amazon River begins in Peru."],
  US: ["The USA has more public libraries than McDonald's restaurants.", "Alaska has more coastline than all other US states combined.", "Yellowstone was the world's first national park (1872)."],

  // Oceania
  AU: ["Australia is both a country and a continent.", "The Great Barrier Reef is the largest living structure on Earth, visible from space.", "Australia has over 10,000 beaches — you could visit a new one every day for 27 years."],
  NZ: ["New Zealand was the first country to give women the right to vote (1893).", "There are more sheep than people in New Zealand — roughly 6 sheep per person.", "New Zealand has no native land snakes."],
  FJ: ["Fiji has over 330 islands, but only about 110 are inhabited.", "Kava, a traditional Fijian drink, is used in welcoming ceremonies.", "Fiji's international date line makes it one of the first countries to see the new year."],
};

// Fallback facts by continent for countries without specific facts
const continentFacts: Record<string, string[]> = {
  Africa: [
    "Africa is the second-largest continent, covering about 20% of Earth's land area.",
    "Africa has 54 recognized countries — the most of any continent.",
    "The Sahara Desert is roughly the same size as the United States.",
  ],
  Europe: [
    "Europe has more than 200 languages spoken across its 44 countries.",
    "Europe is the second-smallest continent by area but third by population.",
    "The Euro is used by 20 of the 27 EU member states.",
  ],
  Asia: [
    "Asia is the largest and most populous continent on Earth.",
    "Asia contains the highest (Everest) and lowest (Dead Sea) points on land.",
    "More than 60% of the world's population lives in Asia.",
  ],
  "North America": [
    "North America spans from the Arctic to the tropics.",
    "The Great Lakes contain 21% of the world's surface fresh water.",
    "North America is home to the world's largest freshwater island — Manitoulin Island.",
  ],
  "South America": [
    "The Amazon Rainforest spans nine South American countries.",
    "South America has the world's highest waterfall — Angel Falls in Venezuela.",
    "The Andes is the longest continental mountain range in the world.",
  ],
  Oceania: [
    "Oceania includes over 25,000 islands across the Pacific Ocean.",
    "Australia's Great Barrier Reef is the world's largest coral reef system.",
    "Many Pacific islands are among the first places on Earth to see each new day.",
  ],
};

export function getCountryFacts(iso2: string, continent?: string): string[] {
  if (countryFacts[iso2]) {
    return countryFacts[iso2];
  }
  // Fallback to continent facts
  if (continent && continentFacts[continent]) {
    return continentFacts[continent];
  }
  return ["Every country has a unique story waiting to be discovered."];
}
