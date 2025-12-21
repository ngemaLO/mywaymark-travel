export interface Country {
  iso2: string;
  name: string;
  continent: string;
  flagPrimaryColor: string;
}

export const countries: Country[] = [
  { iso2: "ZA", name: "South Africa", continent: "Africa", flagPrimaryColor: "#007A4D" },
  { iso2: "US", name: "United States", continent: "North America", flagPrimaryColor: "#3C3B6E" },
  { iso2: "GB", name: "United Kingdom", continent: "Europe", flagPrimaryColor: "#00247D" },
  { iso2: "FR", name: "France", continent: "Europe", flagPrimaryColor: "#0055A4" },
  { iso2: "DE", name: "Germany", continent: "Europe", flagPrimaryColor: "#000000" },
  { iso2: "ES", name: "Spain", continent: "Europe", flagPrimaryColor: "#AA151B" },
  { iso2: "IT", name: "Italy", continent: "Europe", flagPrimaryColor: "#009246" },
  { iso2: "PT", name: "Portugal", continent: "Europe", flagPrimaryColor: "#006600" },
  { iso2: "NL", name: "Netherlands", continent: "Europe", flagPrimaryColor: "#AE1C28" },
  { iso2: "BE", name: "Belgium", continent: "Europe", flagPrimaryColor: "#000000" },
  { iso2: "CH", name: "Switzerland", continent: "Europe", flagPrimaryColor: "#FF0000" },
  { iso2: "AT", name: "Austria", continent: "Europe", flagPrimaryColor: "#ED2939" },
  { iso2: "GR", name: "Greece", continent: "Europe", flagPrimaryColor: "#0D5EAF" },
  { iso2: "SE", name: "Sweden", continent: "Europe", flagPrimaryColor: "#006AA7" },
  { iso2: "NO", name: "Norway", continent: "Europe", flagPrimaryColor: "#BA0C2F" },
  { iso2: "DK", name: "Denmark", continent: "Europe", flagPrimaryColor: "#C8102E" },
  { iso2: "FI", name: "Finland", continent: "Europe", flagPrimaryColor: "#003580" },
  { iso2: "IE", name: "Ireland", continent: "Europe", flagPrimaryColor: "#169B62" },
  { iso2: "PL", name: "Poland", continent: "Europe", flagPrimaryColor: "#DC143C" },
  { iso2: "CZ", name: "Czech Republic", continent: "Europe", flagPrimaryColor: "#11457E" },
  { iso2: "JP", name: "Japan", continent: "Asia", flagPrimaryColor: "#BC002D" },
  { iso2: "CN", name: "China", continent: "Asia", flagPrimaryColor: "#DE2910" },
  { iso2: "KR", name: "South Korea", continent: "Asia", flagPrimaryColor: "#003478" },
  { iso2: "TH", name: "Thailand", continent: "Asia", flagPrimaryColor: "#241D4F" },
  { iso2: "VN", name: "Vietnam", continent: "Asia", flagPrimaryColor: "#DA251D" },
  { iso2: "SG", name: "Singapore", continent: "Asia", flagPrimaryColor: "#EF3340" },
  { iso2: "MY", name: "Malaysia", continent: "Asia", flagPrimaryColor: "#010066" },
  { iso2: "ID", name: "Indonesia", continent: "Asia", flagPrimaryColor: "#FF0000" },
  { iso2: "PH", name: "Philippines", continent: "Asia", flagPrimaryColor: "#0038A8" },
  { iso2: "IN", name: "India", continent: "Asia", flagPrimaryColor: "#FF9933" },
  { iso2: "AU", name: "Australia", continent: "Oceania", flagPrimaryColor: "#00008B" },
  { iso2: "NZ", name: "New Zealand", continent: "Oceania", flagPrimaryColor: "#00247D" },
  { iso2: "CA", name: "Canada", continent: "North America", flagPrimaryColor: "#FF0000" },
  { iso2: "MX", name: "Mexico", continent: "North America", flagPrimaryColor: "#006847" },
  { iso2: "BR", name: "Brazil", continent: "South America", flagPrimaryColor: "#009C3B" },
  { iso2: "AR", name: "Argentina", continent: "South America", flagPrimaryColor: "#75AADB" },
  { iso2: "CL", name: "Chile", continent: "South America", flagPrimaryColor: "#0039A6" },
  { iso2: "PE", name: "Peru", continent: "South America", flagPrimaryColor: "#D91023" },
  { iso2: "CO", name: "Colombia", continent: "South America", flagPrimaryColor: "#FCD116" },
  { iso2: "EG", name: "Egypt", continent: "Africa", flagPrimaryColor: "#C8102E" },
  { iso2: "MA", name: "Morocco", continent: "Africa", flagPrimaryColor: "#C1272D" },
  { iso2: "KE", name: "Kenya", continent: "Africa", flagPrimaryColor: "#006600" },
  { iso2: "TZ", name: "Tanzania", continent: "Africa", flagPrimaryColor: "#1EB53A" },
  { iso2: "AE", name: "United Arab Emirates", continent: "Asia", flagPrimaryColor: "#00732F" },
  { iso2: "IL", name: "Israel", continent: "Asia", flagPrimaryColor: "#0038B8" },
  { iso2: "TR", name: "Turkey", continent: "Asia", flagPrimaryColor: "#E30A17" },
  { iso2: "RU", name: "Russia", continent: "Europe", flagPrimaryColor: "#0039A6" },
  { iso2: "UA", name: "Ukraine", continent: "Europe", flagPrimaryColor: "#0057B7" },
  { iso2: "HU", name: "Hungary", continent: "Europe", flagPrimaryColor: "#436F4D" },
  { iso2: "HR", name: "Croatia", continent: "Europe", flagPrimaryColor: "#FF0000" },
];

export const getCountryByIso = (iso2: string): Country | undefined => {
  return countries.find(c => c.iso2 === iso2);
};

export const getCountriesByContinent = (continent: string): Country[] => {
  return countries.filter(c => c.continent === continent);
};

export const continents = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"];
