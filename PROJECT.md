# 📖 Рецептник PWA — Полная документация проекта

**Версия:** v26.9  
**Файл приложения:** `index.html` (~562 KB, ~7591 строк, всё в одном файле)  
**Тип:** Single-page PWA, чистый HTML/CSS/JS без фреймворков  
**Хранилище:** IndexedDB (`receptnik`, store `kv`) + localStorage (только тема и вид)  
**Сайт:** https://tokalerud.github.io/Cookbook/  
**© 2026 Токарев Александр**

---

## 🗂 Структура файлов архива

```
receptnik-vXX.X.zip
├── index.html      ← всё приложение (HTML + CSS + JS в одном файле)
├── manifest.json   ← PWA-манифест
├── sw.js           ← Service Worker (offline-кэш)
├── icon-192.png    ← иконка 192×192
├── icon-512.png    ← иконка 512×512
└── PROJECT.md      ← этот файл
```

Никаких внешних зависимостей, npm, сборщиков. Открывается напрямую в браузере.  
Разрабатывается и тестируется на Android (файловый менеджер ZArchiver, браузер).

---

## 🎨 Дизайн и темы

- **Тёмная тема** (по умолчанию): тёплая оранжево-коричневая палитра
- **Светлая тема**: насыщенная янтарная, переключается кнопкой ☀️/🌙
- **Шрифты**: Playfair Display (заголовки) + Nunito (текст) — Google Fonts
- **Хранение темы:** `localStorage.ck_theme = 'dark'|'light'`

### CSS-переменные (`:root`)

| Переменная | Назначение |
|---|---|
| `--bg` | Фон страницы |
| `--surface`, `--surface2`, `--surface3` | Фоны карточек/элементов |
| `--accent` | Основной акцент (#d4892a тёмная / #b85c00 светлая) |
| `--accent2` | Вторичный акцент |
| `--text`, `--text2`, `--text3` | Уровни текста |
| `--border` | Цвет рамок |
| `--danger` | Красный для ошибок/удаления |
| `--font-head` | Playfair Display |
| `--font-body` | Nunito |

### Светлая тема (`.light-theme`)
```
--bg: #f0e6d3; --surface: #fff9f2; --surface2: #ffe8c8; --surface3: #ffd89e;
--text: #1a0f00; --text2: #3d2800; --text3: #6b4c1e;
--accent: #b85c00; --accent2: #c97a10;
```

---

## 🧭 Навигация — 5 вкладок

| ID страницы | Вкладка | Содержимое |
|---|---|---|
| `page-recipes` | 📖 Рецепты | Сетка/список рецептов, поиск, фильтр |
| `page-shop` | 🛒 Покупки | Список покупок, ручное добавление, быстрый ввод |
| `page-planner` | 📅 Меню | Планировщик по неделям с БЖУ |
| `page-import` | 🌐 Импорт | Импорт с сайтов по URL + ручной ввод |
| `page-export` | 💾 База | Управление базой, экспорт/импорт, базы продуктов |

`switchTab(tabName)` — переключение.

---

## 💾 Хранилище — IndexedDB

**База:** `receptnik`, версия `1`, один store `kv` (keyPath: `'k'`)

| Ключ IDB | Содержимое |
|---|---|
| `db` | `{ recipes: [...], nextId: N }` |
| `shop` | `[{ name, qty, unit, checked }]` |
| `plannerV2` | `{ "2026-W10": [{day, slots, note}] }` |
| `plannerMeals` | `["Завтрак", "Обед", "Ужин", ...]` |
| `plannerNorms` | `{ kcal, protein, fat, carbs, _userProfile? }` |
| `userFoodDB` | `{ "название": [kcal, б, ж, у] }` — всегда массив |

**localStorage** (только 2 ключа): `ck_theme`, `ck_view`

### IDB API

```js
_idbOpen()           // singleton, кэшируется в _idb
_idbGet(key)         // → Promise<value|null>
_idbSet(key, value)  // → Promise + QuotaExceededError → toast
_idbDel(key)         // → Promise
```

### init() — порядок загрузки

```
applyTheme() → _applyWakeBtn() → setView()
→ Promise.all(_safeGet × 5)   // независимые, сбой одного не роняет остальные
→ normalizeUserFoodDB()
→ await loadDB()               // автомиграция localStorage → IDB
→ seedSampleRecipes() → filterRecipes() → renderPlanner()
```

### Автомиграция из localStorage
`loadDB()` читает `ck_db`, `ck_shop`, `ck_planner_v2`, `ck_planner_meals`, `ck_planner_norms`, `ck_user_food_db` → пишет в IDB → удаляет из localStorage.

---

## 🍽 Структура рецепта

```js
{
  id: 42,
  title: "Борщ",
  category: "Супы",
  emoji: "🍲",
  portions: 6,
  time: 90,
  favorite: false,
  photo: "data:image/jpeg;base64,...",   // base64, до 1200px, quality 0.88
  photoSrc: "https://...",               // URL фото при импорте
  sourceUrl: "https://...",             // ссылка на оригинал
  ingredients: [
    { name: "Свекла", amount: "300", unit: "г",
      nutrition: { kcal: 45, protein: 1.5, fat: 0.1, carbs: 9.5, per100g: true } },
    { name: "Для заправки", amount: "", unit: "" }  // ЗАГОЛОВОК СЕКЦИИ
  ],
  steps: "Шаг 1...",
  notes: "Заметки",
  nutrition: { kcal: 320, protein: 12.5, fat: 8.3, carbs: 45.1, manual: true },
  createdAt: "2026-03-13T10:00:00.000Z"
}
```

**Заголовки секций:** `amount === '' && unit === ''` → везде `if (!ing.amount && !ing.unit) continue`

**per100g флаг:** при расчёте умножается на `grams/100`. Без флага — total (обратная совместимость).

**При редактировании** `saveRecipe` восстанавливает `favorite` и `sourceUrl` из старого объекта.

---

## 🔢 Расчёт питательности

```js
toGrams(amount, unit, name)              // граммы или null (raw <= 0 → null)
calcIngredientNutrition(ing)             // {kcal,protein,fat,carbs} или null
calcRecipeNutrition(recipe)              // {kcal,protein,fat,carbs,coverage,manual} или null
itemNutr(item)                           // нутриенты item слота (recipe/ingredient/manual)
slotNutr(slot)                           // сумма по items
renderNutritionBlock(nutr, portions, base)
```

Цвета: ≤90% зелёный · 90–115% оранжевый · >115% красный

---

## 🥦 Базы продуктов

**Системная FOOD_DB** — ~639 позиций, встроена в JS, только чтение.  
**Пользовательская userFoodDB** — полный CRUD, debounce 400ms при сохранении.  
Формат обеих: `{ "продукт": [kcal, белки, жиры, углеводы] }` на 100г.  
`normalizeUserFoodDB()` — конвертирует старые object-записи при загрузке.  
`findFoodInDB(name)` → приоритет: userFoodDB → FOOD_DB (точное → частичное).

---

## 📅 Планировщик

**Навигация:** `plannerWeekOffset` (0 = текущая). Ключ недели: `"2026-W10"`.  
**Стрелка:** `offset < 0` → `→ Текущая неделя` (она правее). `offset > 0` → `← Текущая неделя`.

### Структура дня
```js
{ day: "Понедельник", note: "...", slots: [
  { meal: "Обед", items: [
    { type: "recipe",     recipeId: 42, portions: 2 },
    { type: "ingredient", name: "яблоко", amount: 150, unit: "г",
      kcal: 78, protein: 0.4, fat: 0.4, carbs: 19.5, portions: 1 },
    { type: "manual",     name: "Батончик",
      kcal: 200, protein: 20, fat: 6, carbs: 22, portions: 1 }
  ]}
]}
```

### Пикер modal-planner-pick — 3 вкладки
- 📖 Рецепты — поиск, клик добавляет без закрытия
- 🥦 Продукты — поиск по userFoodDB+FOOD_DB, граммы
- ✏️ Вручную — ввод с ккал/БЖУ за порцию, галочка «Сохранить в мою базу»

### Копирование дня (modal-copy-day)
Выбор недели (−1…+4) + день (Пн–Вс) → `confirmCopyDay()` deep copy slots.

### Калькулятор норм (modal-planner-norms)
Формула Миффлин-Сан Жеор (2005, ВОЗ/ADA):
- М: `10×вес + 6.25×рост − 5×возраст + 5`
- Ж: `10×вес + 6.25×рост − 5×возраст − 161`
- × коэф. активности (1.2–1.9) → TDEE + цель → БЖУ (Б 15%, Ж 28%, У остаток)
- Профиль пользователя сохраняется в `plannerNorms._userProfile`

---

## 💾 Резервная копия

```js
buildHtmlBackupContent()  // → HTML + <script id="cookbook-db-backup">JSON</script>
saveDatabase()            // → .html (showSaveFilePicker + fallback)
shareDatabase()           // → Web Share API + fallback
loadDatabase(input)       // .html или .json, валидирует Array.isArray(recipes)
```

Формат бэкапа v1.1: `{ version, exportedAt, db, settings, shop, planner }`  
HTML-файл содержит заголовок, дату, кол-во рецептов, ссылку на сайт программы.

---

## 🌐 Импорт рецептов с сайтов

CORS-прокси: прямой → allorigins.win → corsproxy.io

| Парсер | Сайт |
|---|---|
| `tryRussianFoodFallback()` | russianfood.com |
| `tryPovarenok()` | povarenok.ru |
| `tryEdimdoma()` | edimdoma.ru |
| `tryGastronom()` | gastronom.ru |
| `tryJsonLd()` | JSON-LD Schema.org |
| `tryMicrodata()` | Microdata |

`parseRecipeHtml(html, sourceUrl)` — внешний HTML не вставляется в DOM (нет XSS).

---

## 🗂 Модалы (12 штук)

| ID | Назначение |
|---|---|
| `modal-add` | Добавление/редактирование рецепта |
| `modal-detail` | Детальный просмотр |
| `modal-export` | Массовая выгрузка |
| `modal-export-single` | HTML/PDF для одного рецепта |
| `modal-shop-quick` | Быстрый ввод покупок |
| `modal-planner-pick` | Пикер (рецепты/продукты/вручную) |
| `modal-planner-meals` | Настройка приёмов пищи |
| `modal-planner-norms` | Нормы БЖУ + калькулятор Миффлина |
| `modal-user-food-db` | Моя база продуктов |
| `modal-sys-food-db` | База продуктов программы |
| `modal-about` | О программе |
| `modal-copy-day` | Копирование дня планировщика |

Все открываются через `openModal(id)` / `closeModal(id)`.  
Клик на оверлей — делегирован на `document` через один listener `_modalDismiss`.

---

## ⚙️ Service Worker

**Кэш:** `receptnik-v2`  
**Кэшируется:** index.html, manifest.json, icon-192.png, icon-512.png, Google Fonts  
**Network-first:** allorigins.win, corsproxy.io, fonts.google  
**Cache-first:** всё остальное + fallback на index.html

---

## 📱 PWA Manifest

```
name:        Рецептник
version:     1.1
version_name: 1.1
start_url:   /Cookbook/index.html
scope:       /Cookbook/
display:     standalone
orientation: portrait-primary
shortcuts:   [Добавить рецепт, Список покупок, Меню на неделю]
share_target: GET ?url=&text=&title= → авто-импорт на вкладку Импорт
icons:       192px (any + maskable), 512px (any + maskable)
```

---

## ⚠️ Важные особенности

1. **Wake Lock** — только HTTPS. На `file://` игнорируется.
2. **CORS-прокси** — нестабильны, перебираются по очереди.
3. **russianfood.com шаги** — AJAX, парсер не видит → ручной ввод.
4. **`MEALS` — `let`**, мутируется при настройке приёмов.
5. **Заголовки секций** — `amount === '' && unit === ''` → пропускать везде.
6. **per100g** — умножать на grams/100. Без флага — total (обратная совместимость).
7. **userFoodDB** — всегда массив, normalizeUserFoodDB() при загрузке.
8. **QuotaExceededError** — обрабатывается в _idbSet → toast.
9. **openModal/closeModal** — только через эти функции, не style.display.
10. **Стрелка недели** — offset < 0 → стрелка вправо (→), offset > 0 → влево (←).
11. **BASE файл** — меняется только по явной команде Александра.
12. **🎤 на file://** — полупрозрачна.
13. **Кнопка 📲 установки** — появляется только на HTTPS когда браузер выдаёт `beforeinstallprompt`. На `file://` и уже установленном PWA скрыта.

---

## 📝 История версий

| Версия | Изменения |
|---|---|
| v25.0–v25.18 | Избранное, таймер готовки, парсер покупок v3 (37/37 тестов), планировщик v2, тулбар |
| v26.0 | Переименован в «Рецептник» · IndexedDB · Автомиграция · ▲▼ у ингредиентов · Светлая тема · Полный бэкап · О программе |
| v26.1 | Иконка в хедере · БЖУ ингредиентов per100g · Обратная совместимость |
| v26.2 | Кнопки карточки 28×28 · Нормализация userFoodDB · Кнопка редактирования базы |
| v26.3 | Вкладка Вручную в пикере · Копирование дня через модал |
| v26.4 | Калькулятор норм Миффлин-Сан Жеор в modal-planner-norms |
| v26.5 | saveDatabase → HTML-формат · buildHtmlBackupContent · Ссылка на сайт · debounce userFoodDB |
| v26.5.1 | Баг: modal-copy-day и modal-export не закрывались — исправлено |
| v26.6 | saveRecipe сохраняет favorite+sourceUrl при редактировании · _safeGet в init · modal click делегирование · wakeLock once:true |
| v26.7 | _idbSet QuotaExceededError → toast · canvas.width=0 для GC · loadDatabase валидация |
| **v26.7.1** | Стрелка текущей недели — правильное направление · manifest.json (shortcuts, orientation) · sw.js (cookbook-v3, corsproxy.io, иконки) |
| v26.7.2 | Утечка памяти: downloadFile — URL.revokeObjectURL после скачивания |
| v26.7.3 | Дублирование слов при голосовом вводе покупок — флаг _sessionRestarted |
| v26.7.4 | applyPhotoUrl и handleUrlFieldPaste — try/catch, loadPhotoFromUrl логирует ошибки |
| v26.8 | Кнопка 📲 установки PWA в хедере — появляется только на HTTPS, скрывается после установки |
| v26.8.1 | SW переписан на network-first — всегда загружает свежую версию с сервера, кэш как fallback · README.md |
| v26.8.2 | Сайты импорта — russianfood.com первым, все четыре сайта в виде кликабельных ссылок |
| v26.8.3 | Кнопка 🌐 в хедере: детект in-app браузера (Telegram, VK, Instagram и др.) → открыть в Chrome для установки |
| v26.8.4 | manifest: version_name: '1.1' · ?action=add открывает форму нового рецепта |
| v26.8.5 | Shortcuts: +«Список покупок» +«Меню на неделю» · share_target: «Поделиться» → авто-импорт URL |
| v26.8.6 | Подсказка на вкладке Импорт: «Поделиться» → «Рецептник» |
| v26.8.7 | Микрофон: накапливает речь молча → при стопе вставляет + авто-парсинг |
| v26.8.8 | Микрофон: дедупликация нарастающих чанков |
| v26.8.9 | Микрофон: continuous:false + interimResults:false |
| **v26.9** | Голосовой ввод удалён полностью (баг Android Chrome, не поддаётся исправлению) |

---

## 🚀 Быстрый старт для нового чата

```
Проект: PWA «Рецептник» v26.9
Файлы: /home/claude/cookbook-v18/index.html (рабочий)
       /home/claude/cookbook-v18/index.BASE.html (база, не трогать без команды)
       /home/claude/cookbook-v18/README.md (GitHub README)
Стек: HTML/CSS/JS, IndexedDB (store kv), без фреймворков
Платформа: Android (ZArchiver, мобильный браузер)
Сайт: https://tokalerud.github.io/Cookbook/
Документация: PROJECT.md — читать перед правками!

Правила версий: x.x.1 хотфикс · x.1 улучшение · новая цифра — существенное изменение
Перед архивом: node --check + проверить все onclick-функции
BASE меняется только по явной команде Александра

Текущая задача: [опиши задачу]
```

---

*Документ актуален для версии **v26.9***  
*Обновляется полностью при каждой версии*
