// دوال موحدة للتعامل مع localStorage
export function loadSavedList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

export function saveToList(key, item) {
  const list = loadSavedList(key);
  // ✅ البحث عن العنصر الموجود بناءً على name و license
  const existingIndex = list.findIndex(
    x => x.name === item.name && x.license === item.license
  );
  
  if (existingIndex >= 0) {
    // ✅ إذا كان موجوداً، نحدثه (خاصة name_en)
    list[existingIndex] = {
      ...list[existingIndex],
      ...item, // ✅ تحديث جميع البيانات بما فيها name_en
    };
  } else {
    // ✅ إذا لم يكن موجوداً، نضيفه
    list.push(item);
  }
  
  localStorage.setItem(key, JSON.stringify(list));
  return list;
}

