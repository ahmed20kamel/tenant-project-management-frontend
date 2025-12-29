// ثوابت مشتركة للتطبيق

export const MUNICIPALITIES = [
  { value: "Abu Dhabi City", label: { en: "Abu Dhabi City", ar: "أبوظبي" } },
  { value: "Al Ain", label: { en: "Al Ain", ar: "العين" } },
  { value: "Al Dhafra", label: { en: "Al Dhafra", ar: "الظفرة" } },
];

export const ZONES = {
  "Abu Dhabi City": [
    { value: "Al Bateen", label: { en: "Al Bateen", ar: "البطين" } },
    { value: "Madinat Al Riyadh", label: { en: "Madinat Al Riyadh", ar: "مدينة الرياض" } },
    { value: "Khalifa City", label: { en: "Khalifa City", ar: "خليفة سيتي" } },
    { value: "Mohammed Bin Zayed City", label: { en: "Mohammed Bin Zayed City", ar: "مدينة محمد بن زايد" } },
    { value: "Madinat Zayed", label: { en: "Madinat Zayed", ar: "مدينة زايد" } },
    { value: "Al Shamkha", label: { en: "Al Shamkha", ar: "الشامخة" } },
    { value: "Al Shawamekh", label: { en: "Al Shawamekh", ar: "الشوامخ" } },
    { value: "Yas Island", label: { en: "Yas Island", ar: "جزيرة ياس" } },
    { value: "Saadiyat Island", label: { en: "Saadiyat Island", ar: "جزيرة السعديات" } },
    { value: "Al Reem Island", label: { en: "Al Reem Island", ar: "جزيرة الريم" } },
    { value: "Al Raha Beach", label: { en: "Al Raha Beach", ar: "الراحة بيتش" } },
    { value: "Al Shatee", label: { en: "Al Shatee", ar: "الشاطئ" } },
    { value: "Al Shahama", label: { en: "Al Shahama", ar: "الشهامة" } },
  ],
  "Al Ain": [
    { value: "Al Yahar", label: { en: "Al Yahar", ar: "اليحر" } },
    { value: "Al Hayer", label: { en: "Al Hayer", ar: "الهير" } },
    { value: "Zakhir", label: { en: "Zakhir", ar: "زاخر" } },
    { value: "Al Jahili", label: { en: "Al Jahili", ar: "الجاهلي" } },
    { value: "Al Sarouj", label: { en: "Al Sarouj", ar: "الصاروج" } },
  ],
  "Al Dhafra": [
    { value: "Madinat Zayed", label: { en: "Madinat Zayed", ar: "مدينة زايد" } },
    { value: "Ghayathi", label: { en: "Ghayathi", ar: "غياثي" } },
    { value: "Al Ruwais", label: { en: "Al Ruwais", ar: "الرويس" } },
    { value: "As Sila", label: { en: "As Sila", ar: "السلع" } },
    { value: "Delma Island", label: { en: "Delma Island", ar: "دلما" } },
  ],
};

export const NATIONALITIES = [
  { value: "Emirati", label: { en: "Emirati", ar: "إماراتي" } },
  { value: "Saudi", label: { en: "Saudi", ar: "سعودي" } },
  { value: "Egyptian", label: { en: "Egyptian", ar: "مصري" } },
  { value: "Jordanian", label: { en: "Jordanian", ar: "أردني" } },
  { value: "Syrian", label: { en: "Syrian", ar: "سوري" } },
  { value: "Lebanese", label: { en: "Lebanese", ar: "لبناني" } },
  { value: "Palestinian", label: { en: "Palestinian", ar: "فلسطيني" } },
  { value: "Sudanese", label: { en: "Sudanese", ar: "سوداني" } },
  { value: "Indian", label: { en: "Indian", ar: "هندي" } },
  { value: "Pakistani", label: { en: "Pakistani", ar: "باكستاني" } },
  { value: "Bangladeshi", label: { en: "Bangladeshi", ar: "بنغالي" } },
  { value: "Filipino", label: { en: "Filipino", ar: "فلبيني" } },
  { value: "British", label: { en: "British", ar: "بريطاني" } },
  { value: "American", label: { en: "American", ar: "أمريكي" } },
  { value: "French", label: { en: "French", ar: "فرنسي" } },
  { value: "German", label: { en: "German", ar: "ألماني" } },
  { value: "Chinese", label: { en: "Chinese", ar: "صيني" } },
  { value: "Turkish", label: { en: "Turkish", ar: "تركي" } },
  { value: "Moroccan", label: { en: "Moroccan", ar: "مغربي" } },
  { value: "Tunisian", label: { en: "Tunisian", ar: "تونسي" } },
  { value: "Algerian", label: { en: "Algerian", ar: "جزائري" } },
  { value: "Iraqi", label: { en: "Iraqi", ar: "عراقي" } },
  { value: "Yemeni", label: { en: "Yemeni", ar: "يمني" } },
  { value: "Kuwaiti", label: { en: "Kuwaiti", ar: "كويتي" } },
  { value: "Qatari", label: { en: "Qatari", ar: "قطري" } },
  { value: "Bahraini", label: { en: "Bahraini", ar: "بحريني" } },
  { value: "Omani", label: { en: "Omani", ar: "عُماني" } },
];

export const PROJECT_TYPES = {
  ar: [
    ["villa", "فيلا"],
    ["commercial", "تجاري"],
    ["maintenance", "أعمال صيانة"],
    ["governmental", "مشاريع حكومية"],
    ["fitout", "أعمال تجديد وتجهيز داخلي"],
  ],
  en: [
    ["villa", "Villa"],
    ["commercial", "Commercial"],
    ["maintenance", "Maintenance Works"],
    ["governmental", "Governmental"],
    ["fitout", "Renovation & Fit-Out"],
  ],
};

export const VILLA_CATEGORIES = {
  ar: [
    ["residential", "فيلا سكنية"],
    ["commercial", "فيلا تجارية"],
  ],
  en: [
    ["residential", "Residential Villa"],
    ["commercial", "Commercial Villa"],
  ],
};

export const CONTRACT_TYPES = {
  ar: [
    ["new", "عقد إنشاء جديد"],
    ["continue", "عقد استكمال"],
  ],
  en: [
    ["new", "New Contract"],
    ["continue", "Continuation Contract"],
  ],
};

