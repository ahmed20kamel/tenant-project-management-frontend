export const formatNumberInput = (v) => {
  if (!v) return "";
  const n = Number(String(v).replace(/,/g, ""));
  if (isNaN(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const toArabicDigits = (str) =>
  String(str).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

export const formatMoneyArabic = (v) => {
  if (!v) return "—";
  const formatted = formatNumberInput(v);
  return toArabicDigits(formatted);
};

export const numberToArabicWords = (num) => {
  if (num === null || num === undefined || num === "") return "";

  num = Number(String(num).replace(/,/g, ""));
  if (isNaN(num)) return "";

  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
  ];
  const tens = [
    "",
    "عشرة",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const teens = [
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];

  const scales = ["", "ألف", "مليون", "مليار", "تريليون"];
  const scalesPlural = ["", "آلاف", "ملايين", "مليارات", "تريليونات"];

  if (num === 0) return "صفر";

  let parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    let chunk = num % 1000;
    num = Math.floor(num / 1000);

    if (chunk > 0) {
      let text = "";

      let h = Math.floor(chunk / 100);
      let t = Math.floor((chunk % 100) / 10);
      let o = chunk % 10;

      if (h === 1) text += "مائة";
      else if (h === 2) text += "مائتان";
      else if (h > 2) text += ones[h] + " مائة";

      if (h > 0 && (t > 0 || o > 0)) text += " و ";

      if (t === 1 && o > 0) {
        text += teens[o - 1];
      } else {
        if (o > 0) text += ones[o];
        if (t > 1) {
          if (o > 0) text += " و ";
          text += tens[t];
        }
        if (t === 1 && o === 0) text += tens[1];
      }

      if (scaleIndex > 0) {
        if (chunk === 1) {
          text += " " + scales[scaleIndex];
        } else if (chunk === 2) {
          text += " " + scales[scaleIndex] + "ان";
        } else if (chunk >= 3 && chunk <= 10) {
          text += " " + scalesPlural[scaleIndex];
        } else {
          text += " " + scales[scaleIndex];
        }
      }

      parts.unshift(text);
    }

    scaleIndex++;
  }

  return parts.join(" و ");
};
