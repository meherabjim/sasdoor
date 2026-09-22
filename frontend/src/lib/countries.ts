/**
 * Country list for imported wood.
 *
 * The purchase form used to build its country dropdown from the selected wood type's own
 * `countries` array. That list is often a single entry (or empty until a wood is picked),
 * so the dropdown looked stuck. Now the full list below is always available, and the wood
 * type's own countries are offered first as suggestions.
 */

/** Countries SAS DOOR actually imports timber from — shown at the top of the dropdown. */
export const TIMBER_COUNTRIES = [
  "Myanmar",
  "Malaysia",
  "Indonesia",
  "Ghana",
  "Nigeria",
  "Ivory Coast",
  "Cameroon",
  "Liberia",
  "Congo",
  "Gabon",
  "Brazil",
  "Papua New Guinea",
  "Solomon Islands",
  "Thailand",
  "Vietnam",
  "India",
  "Nepal",
  "Bhutan",
  "New Zealand",
  "Australia",
  "Canada",
  "United States",
  "Russia",
  "Sweden",
  "Finland",
  "Germany",
  "Romania",
  "Ukraine",
  "South Africa",
  "Tanzania",
  "Mozambique",
  "Kenya",
  "Uganda",
  "Sri Lanka",
  "Philippines",
  "China",
];

/** Everything else, so an unusual origin can still be recorded. */
export const OTHER_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belarus", "Belgium", "Belize", "Benin", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Central African Republic", "Chad",
  "Chile", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "France", "Georgia", "Greece", "Guatemala", "Guinea", "Guyana", "Honduras", "Hungary",
  "Iceland", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Libya", "Lithuania",
  "Madagascar", "Malawi", "Maldives", "Mali", "Mauritius", "Mexico", "Moldova", "Mongolia",
  "Morocco", "Namibia", "Netherlands", "Nicaragua", "Niger", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Poland", "Portugal", "Qatar",
  "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Somalia", "South Korea", "Spain", "Sudan", "Suriname", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Togo", "Tunisia", "Turkey", "Turkmenistan", "Uzbekistan",
  "United Arab Emirates", "United Kingdom", "Uruguay", "Venezuela", "Yemen", "Zambia", "Zimbabwe",
];

/**
 * Options for the country dropdown, in three groups:
 *   1. the selected wood type's own countries (if any)
 *   2. the usual timber origins
 *   3. everything else
 * Duplicates are removed, keeping the first (most relevant) position.
 */
export function countryOptions(woodCountries: string[] = []) {
  const seen = new Set<string>();
  const take = (list: string[]) =>
    list.filter((c) => {
      const k = c.trim();
      if (!k || k.toLowerCase() === "bangladesh" || seen.has(k.toLowerCase())) return false;
      seen.add(k.toLowerCase());
      return true;
    });
  return [
    { label: "This wood is usually imported from", items: take(woodCountries) },
    { label: "Common timber origins", items: take(TIMBER_COUNTRIES) },
    { label: "All countries", items: take([...OTHER_COUNTRIES].sort()) },
  ].filter((g) => g.items.length > 0);
}
