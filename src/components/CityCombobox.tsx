import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Major cities by country - a curated list of popular cities
const majorCitiesByCountry: Record<string, string[]> = {
  US: ['New York City', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington D.C.', 'Boston', 'Nashville', 'Baltimore', 'Oklahoma City', 'Louisville', 'Portland', 'Las Vegas', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh', 'Long Beach', 'Virginia Beach', 'Miami', 'Oakland', 'Minneapolis', 'Tulsa', 'Bakersfield', 'Wichita', 'Arlington', 'Aurora', 'Tampa', 'New Orleans', 'Cleveland', 'Honolulu', 'Anaheim', 'Pittsburgh', 'Cincinnati', 'Orlando', 'Anchorage', 'Detroit'],
  GB: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Bristol', 'Edinburgh', 'Leeds', 'Sheffield', 'Newcastle', 'Nottingham', 'Southampton', 'Cardiff', 'Belfast', 'Leicester', 'Oxford', 'Cambridge', 'York', 'Brighton', 'Bath'],
  FR: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne', 'Toulon', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Cannes'],
  DE: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Heidelberg'],
  IT: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Toledo', 'Salamanca', 'San Sebastián', 'Ibiza'],
  JP: ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai', 'Nara', 'Nagasaki', 'Okinawa', 'Kanazawa', 'Yokosuka', 'Kamakura', 'Hakone', 'Nikko'],
  CN: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xian', 'Chongqing', 'Nanjing', 'Tianjin', 'Suzhou', 'Qingdao', 'Dalian', 'Shenyang', 'Harbin', 'Kunming', 'Guilin', 'Xiamen', 'Lijiang'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Hobart', 'Darwin', 'Cairns', 'Townsville', 'Geelong', 'Ballarat', 'Alice Springs', 'Bendigo', 'Launceston', 'Mackay', 'Rockhampton'],
  CA: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'Victoria', 'Halifax', 'Saskatoon', 'Regina', 'St. John\'s', 'Kelowna', 'Niagara Falls', 'Whistler', 'Banff', 'Charlottetown'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Florianópolis', 'Natal', 'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'Santos', 'Ouro Preto', 'Paraty', 'Búzios'],
  IN: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Visakhapatnam', 'Indore', 'Thane', 'Bhopal', 'Patna', 'Vadodara', 'Goa', 'Agra', 'Varanasi', 'Udaipur', 'Jodhpur', 'Kochi', 'Mysore'],
  MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Ciudad Juárez', 'Zapopan', 'Mérida', 'Cancún', 'San Miguel de Allende', 'Oaxaca', 'Guanajuato', 'Puerto Vallarta', 'Playa del Carmen', 'Tulum', 'Cabo San Lucas', 'Cozumel', 'Querétaro', 'Morelia'],
  TH: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui', 'Hua Hin', 'Ayutthaya', 'Sukhothai', 'Chiang Rai', 'Kanchanaburi', 'Pai', 'Koh Phangan', 'Koh Tao', 'Koh Lanta'],
  VN: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An', 'Nha Trang', 'Hue', 'Halong Bay', 'Sapa', 'Dalat', 'Phu Quoc', 'Can Tho', 'Mui Ne', 'Ninh Binh', 'Phong Nha'],
  GR: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Rhodes', 'Santorini', 'Mykonos', 'Corfu', 'Crete', 'Delphi', 'Olympia', 'Meteora', 'Nafplio', 'Zakynthos', 'Paros'],
  PT: ['Lisbon', 'Porto', 'Faro', 'Coimbra', 'Braga', 'Funchal', 'Sintra', 'Évora', 'Lagos', 'Albufeira', 'Cascais', 'Óbidos', 'Aveiro', 'Guimarães', 'Tavira'],
  NL: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen', 'Haarlem', 'Delft', 'Leiden', 'Maastricht'],
  BE: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège', 'Charleroi', 'Leuven', 'Namur', 'Mechelen', 'Mons', 'Aalst', 'Hasselt', 'Ostend', 'Kortrijk'],
  CH: ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Lucerne', 'St. Gallen', 'Lugano', 'Interlaken', 'Zermatt', 'Montreux', 'Grindelwald', 'Davos', 'St. Moritz'],
  AT: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz', 'Klagenfurt', 'Villach', 'Hallstatt', 'Bad Ischl', 'Bregenz', 'St. Wolfgang', 'Kitzbühel'],
  SE: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Kiruna', 'Visby'],
  NO: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Tromsø', 'Ålesund', 'Bodø', 'Kristiansand', 'Flåm', 'Geiranger', 'Lofoten'],
  DK: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Helsingør', 'Billund'],
  FI: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Rovaniemi', 'Lapland', 'Savonlinna'],
  PL: ['Warsaw', 'Krakow', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice', 'Gdynia', 'Sopot', 'Zakopane', 'Toruń'],
  CZ: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Karlovy Vary', 'Český Krumlov', 'Kutná Hora'],
  HU: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Eger', 'Szentendre'],
  IE: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Kilkenny', 'Killarney', 'Dingle', 'Clifden', 'Doolin', 'Belfast', 'Derry'],
  NZ: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Queenstown', 'Rotorua', 'Napier', 'Nelson', 'Wanaka', 'Te Anau'],
  SG: ['Singapore', 'Sentosa', 'Jurong East', 'Tampines', 'Changi'],
  HK: ['Hong Kong', 'Kowloon', 'Victoria Peak', 'Lantau', 'Tsim Sha Tsui'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'],
  ZA: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'Stellenbosch', 'Knysna', 'Franschhoek', 'Kruger National Park'],
  EG: ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Hurghada', 'Sharm El Sheikh', 'Dahab', 'Siwa Oasis'],
  MA: ['Marrakech', 'Casablanca', 'Fes', 'Tangier', 'Rabat', 'Agadir', 'Chefchaouen', 'Essaouira', 'Ouarzazate', 'Merzouga'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi', 'Lamu', 'Masai Mara', 'Amboseli'],
  TZ: ['Dar es Salaam', 'Zanzibar', 'Arusha', 'Mwanza', 'Dodoma', 'Serengeti', 'Kilimanjaro', 'Ngorongoro'],
  AR: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Mar del Plata', 'Salta', 'Bariloche', 'Ushuaia', 'El Calafate', 'Puerto Iguazú'],
  CL: ['Santiago', 'Valparaíso', 'Concepción', 'Viña del Mar', 'Antofagasta', 'Temuco', 'Puerto Montt', 'Punta Arenas', 'Easter Island', 'San Pedro de Atacama'],
  PE: ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Chiclayo', 'Iquitos', 'Huancayo', 'Piura', 'Puno', 'Machu Picchu', 'Sacred Valley'],
  CO: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Santa Marta', 'Bucaramanga', 'Pereira', 'San Andrés', 'Villa de Leyva'],
  KR: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Suwon', 'Jeju', 'Gyeongju', 'Jeonju'],
  TW: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu', 'Taoyuan', 'Keelung', 'Hualien', 'Jiufen', 'Sun Moon Lake'],
  MY: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Shah Alam', 'Kota Kinabalu', 'Kuching', 'Malacca', 'Langkawi', 'Cameron Highlands'],
  ID: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Palembang', 'Bali', 'Yogyakarta', 'Lombok', 'Ubud', 'Seminyak'],
  PH: ['Manila', 'Quezon City', 'Davao', 'Cebu City', 'Makati', 'Pasig', 'Baguio', 'Boracay', 'Palawan', 'Siargao', 'Bohol'],
  RU: ['Moscow', 'St. Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Sochi', 'Vladivostok'],
  TR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Cappadocia', 'Pamukkale', 'Ephesus', 'Bodrum', 'Fethiye'],
  IL: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Nazareth', 'Acre', 'Dead Sea', 'Masada', 'Tiberias', 'Caesarea'],
  HR: ['Zagreb', 'Split', 'Dubrovnik', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Rovinj', 'Hvar', 'Korčula', 'Plitvice Lakes'],
  SI: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Bled', 'Piran', 'Portorož', 'Postojna', 'Koper'],
  SK: ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Banská Bystrica', 'Trnava', 'High Tatras'],
  RO: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Sibiu', 'Sighișoara'],
  BG: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Veliko Tarnovo', 'Bansko', 'Nesebar'],
  UA: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Donetsk', 'Zaporizhzhia', 'Lviv', 'Mariupol', 'Crimea'],
  RS: ['Belgrade', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zemun', 'Zlatibor'],
  ME: ['Podgorica', 'Kotor', 'Budva', 'Herceg Novi', 'Bar', 'Ulcinj', 'Tivat', 'Cetinje'],
  MK: ['Skopje', 'Ohrid', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Struga'],
  AL: ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Fier', 'Elbasan', 'Berat', 'Gjirokastër', 'Saranda'],
  BA: ['Sarajevo', 'Banja Luka', 'Mostar', 'Tuzla', 'Zenica', 'Medjugorje', 'Jajce'],
  XK: ['Pristina', 'Prizren', 'Gjakova', 'Mitrovica', 'Peja', 'Ferizaj'],
  IS: ['Reykjavik', 'Akureyri', 'Keflavik', 'Selfoss', 'Vik', 'Húsavík', 'Blue Lagoon', 'Golden Circle'],
  LU: ['Luxembourg City', 'Esch-sur-Alzette', 'Dudelange', 'Differdange', 'Echternach', 'Vianden'],
  MT: ['Valletta', 'Sliema', 'St. Julian\'s', 'Mdina', 'Gozo', 'Marsaxlokk'],
  CY: ['Nicosia', 'Limassol', 'Larnaca', 'Paphos', 'Famagusta', 'Ayia Napa', 'Protaras'],
  LT: ['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Trakai'],
  LV: ['Riga', 'Daugavpils', 'Liepāja', 'Jelgava', 'Jūrmala', 'Sigulda'],
  EE: ['Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve', 'Saaremaa'],
  MC: ['Monaco', 'Monte Carlo', 'La Condamine', 'Fontvieille'],
  SM: ['San Marino', 'Serravalle', 'Borgo Maggiore', 'Domagnano'],
  AD: ['Andorra la Vella', 'Escaldes-Engordany', 'Encamp', 'Sant Julià de Lòria'],
  VA: ['Vatican City'],
  LI: ['Vaduz', 'Schaan', 'Balzers', 'Triesen', 'Triesenberg'],
  MU: ['Port Louis', 'Curepipe', 'Vacoas-Phoenix', 'Grand Baie', 'Flic en Flac'],
  MV: ['Malé', 'Addu City', 'Hulhumalé'],
  LK: ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Sigiriya', 'Ella', 'Trincomalee', 'Anuradhapura'],
  NP: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bharatpur', 'Biratnagar', 'Bhaktapur', 'Lumbini', 'Everest Base Camp'],
  BT: ['Thimphu', 'Paro', 'Punakha', 'Bumthang', 'Wangdue Phodrang'],
  MM: ['Yangon', 'Mandalay', 'Naypyidaw', 'Bagan', 'Inle Lake', 'Ngapali'],
  KH: ['Phnom Penh', 'Siem Reap', 'Sihanoukville', 'Battambang', 'Kampot', 'Kep'],
  LA: ['Vientiane', 'Luang Prabang', 'Pakse', 'Vang Vieng', 'Savannakhet'],
  BD: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Rangpur', 'Cox\'s Bazar'],
  PK: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Hunza'],
  AF: ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad'],
  IR: ['Tehran', 'Mashhad', 'Isfahan', 'Shiraz', 'Tabriz', 'Karaj', 'Yazd', 'Persepolis'],
  IQ: ['Baghdad', 'Basra', 'Erbil', 'Mosul', 'Sulaymaniyah', 'Najaf', 'Karbala'],
  SA: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Dhahran', 'Abha'],
  JO: ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Petra', 'Wadi Rum', 'Dead Sea'],
  LB: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Jounieh', 'Byblos', 'Baalbek'],
  OM: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Wahiba Sands'],
  QA: ['Doha', 'Al Wakrah', 'Al Khor', 'Dukhan'],
  KW: ['Kuwait City', 'Hawalli', 'Salmiya', 'Jahra'],
  BH: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town'],
  YE: ['Sanaa', 'Aden', 'Taiz', 'Al Hudaydah'],
  SY: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama', 'Palmyra'],
  NG: ['Lagos', 'Kano', 'Ibadan', 'Abuja', 'Port Harcourt', 'Benin City'],
  GH: ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Sekondi-Takoradi'],
  SN: ['Dakar', 'Saint-Louis', 'Thiès', 'Kaolack', 'Gorée Island'],
  ET: ['Addis Ababa', 'Dire Dawa', 'Gondar', 'Bahir Dar', 'Lalibela', 'Axum'],
  UG: ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu'],
  RW: ['Kigali', 'Butare', 'Gisenyi', 'Ruhengeri', 'Cyangugu'],
  BW: ['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Kasane'],
  NA: ['Windhoek', 'Walvis Bay', 'Swakopmund', 'Rundu', 'Sossusvlei'],
  ZW: ['Harare', 'Bulawayo', 'Chitungwiza', 'Victoria Falls', 'Mutare'],
  ZM: ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone', 'Kabwe'],
  MW: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Lake Malawi'],
  MZ: ['Maputo', 'Beira', 'Nampula', 'Matola', 'Vilankulo'],
  MG: ['Antananarivo', 'Toamasina', 'Antsirabe', 'Nosy Be', 'Diego Suarez'],
  CR: ['San José', 'Limón', 'Alajuela', 'Heredia', 'Puntarenas', 'La Fortuna', 'Manuel Antonio'],
  PA: ['Panama City', 'Colón', 'David', 'Bocas del Toro', 'San Blas'],
  GT: ['Guatemala City', 'Antigua Guatemala', 'Quetzaltenango', 'Flores', 'Lake Atitlán'],
  BZ: ['Belize City', 'San Ignacio', 'Placencia', 'Ambergris Caye', 'Caye Caulker'],
  HN: ['Tegucigalpa', 'San Pedro Sula', 'La Ceiba', 'Roatán', 'Copán'],
  NI: ['Managua', 'León', 'Granada', 'Masaya', 'San Juan del Sur', 'Ometepe'],
  SV: ['San Salvador', 'Santa Ana', 'San Miguel', 'Suchitoto', 'El Tunco'],
  CU: ['Havana', 'Santiago de Cuba', 'Camagüey', 'Holguín', 'Varadero', 'Trinidad', 'Viñales', 'Cienfuegos'],
  DO: ['Santo Domingo', 'Santiago', 'Punta Cana', 'Puerto Plata', 'La Romana', 'Samaná'],
  JM: ['Kingston', 'Montego Bay', 'Ocho Rios', 'Negril', 'Port Antonio'],
  HT: ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Jacmel'],
  PR: ['San Juan', 'Ponce', 'Mayagüez', 'Carolina', 'Vieques', 'Culebra'],
  TT: ['Port of Spain', 'San Fernando', 'Chaguanas', 'Tobago'],
  BB: ['Bridgetown', 'Speightstown', 'Holetown', 'Oistins'],
  BS: ['Nassau', 'Freeport', 'Marsh Harbour', 'Exuma'],
  FJ: ['Suva', 'Nadi', 'Lautoka', 'Denarau Island'],
  WS: ['Apia', 'Salelologa'],
  TO: ['Nuku\'alofa', 'Neiafu'],
  VU: ['Port Vila', 'Luganville'],
  PG: ['Port Moresby', 'Lae', 'Madang', 'Mount Hagen'],
  NC: ['Nouméa', 'Mont-Dore', 'Dumbéa'],
  PF: ['Papeete', 'Bora Bora', 'Moorea', 'Tahiti'],
  GU: ['Hagåtña', 'Dededo', 'Yigo', 'Tumon'],
  UY: ['Montevideo', 'Punta del Este', 'Colonia del Sacramento', 'Salto'],
  PY: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Encarnación'],
  BO: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Potosí', 'Uyuni'],
  EC: ['Quito', 'Guayaquil', 'Cuenca', 'Galápagos', 'Baños', 'Otavalo'],
  VE: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Ciudad Guayana', 'Margarita Island'],
  GY: ['Georgetown', 'Linden', 'New Amsterdam'],
  SR: ['Paramaribo', 'Lelydorp', 'Brokopondo'],
};

interface CityComboboxProps {
  countryIso2: string;
  value: string;
  onSelect: (city: string) => void;
  disabled?: boolean;
}

export function CityCombobox({ countryIso2, value, onSelect, disabled }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get cities for this country
  const countryCities = useMemo(() => {
    return majorCitiesByCountry[countryIso2] || [];
  }, [countryIso2]);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery) return countryCities;
    return countryCities.filter(city => 
      city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [countryCities, searchQuery]);

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value || "Select or type a city..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput 
              placeholder="Type to search or add a city..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {filteredCities.length === 0 && !searchQuery && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <p>No popular cities found.</p>
                  <p className="text-xs mt-1">Start typing to add your city</p>
                </div>
              )}
              {filteredCities.length === 0 && searchQuery && (
                <CommandGroup heading="Add your city">
                  <CommandItem
                    value={searchQuery}
                    onSelect={() => {
                      onSelect(searchQuery);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    <span>Add "<strong>{searchQuery}</strong>"</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {filteredCities.length > 0 && (
                <CommandGroup heading="Popular cities">
                  {filteredCities.slice(0, 20).map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => {
                        onSelect(city);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === city ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchQuery && filteredCities.length > 0 && !filteredCities.some(c => c.toLowerCase() === searchQuery.toLowerCase()) && (
                <CommandGroup heading="Add your city">
                  <CommandItem
                    value={`custom-${searchQuery}`}
                    onSelect={() => {
                      onSelect(searchQuery);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    <span>Add "<strong>{searchQuery}</strong>"</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Can't find your city? Just type it in and press enter.
      </p>
    </div>
  );
}

// Add missing Plus icon import
import { Plus } from 'lucide-react';
