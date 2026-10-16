// Commercial launch roadmap: premises, tools, materials, assortment and marketing
// for a faux-leather bookbinding workshop + souvenir shop in Coburg's old town.

export const COMMERCIAL_PHASES = [
  { id: 'concept', title: { uk: 'Концепція і ринок', de: 'Konzept & Markt' } },
  { id: 'location', title: { uk: 'Приміщення в центрі Кобурга', de: 'Ladenlokal in der Coburger Innenstadt' } },
  { id: 'workshop', title: { uk: 'Майстерня: інструменти й матеріали', de: 'Werkstatt: Werkzeug & Material' } },
  { id: 'store', title: { uk: 'Облаштування магазину', de: 'Laden einrichten' } },
  { id: 'marketing', title: { uk: 'Маркетинг і відкриття', de: 'Marketing & Eröffnung' } },
  { id: 'after', title: { uk: 'Після відкриття', de: 'Nach der Eröffnung' } },
];

export const COMMERCIAL_STEPS = [
  {
    id: 'c-concept',
    phase: 'concept',
    title: { uk: 'Концепція та асортимент', de: 'Konzept & Sortiment' },
    desc: {
      uk: 'Ядро — блокноти й книги ручної роботи в обкладинках зі штучної шкіри: щоденники, скетчбуки, фотоальбоми, весільні гостьові книги, персоналізація (тиснення імен, ініціалів). Доповнення — сувеніри Кобурга: листівки, магніти, закладки з мотивами Veste Coburg, Schloss Ehrenburg, Marktplatz.',
      de: 'Kern: handgebundene Notizbücher und Bücher mit Kunstleder-Einband — Tagebücher, Skizzenbücher, Fotoalben, Hochzeits-Gästebücher, Personalisierung (Prägung von Namen/Initialen). Ergänzung: Coburg-Souvenirs — Postkarten, Magnete, Lesezeichen mit Motiven von Veste Coburg, Schloss Ehrenburg, Marktplatz.',
    },
    todo: {
      uk: [
        'Обрати 5–7 базових моделей',
        'Продумати 3 «туристичні» товари до 15 €',
        'Визначити послуги: персоналізація, ремонт книг, майстер-класи',
      ],
      de: [
        '5–7 Grundmodelle festlegen',
        '3 Touristen-Artikel unter 15 € planen',
        'Leistungen definieren: Personalisierung, Buchreparatur, Workshops',
      ],
    },
    links: [],
  },
  {
    id: 'c-market',
    phase: 'concept',
    title: { uk: 'Клієнти і конкуренти', de: 'Zielgruppen & Wettbewerb' },
    desc: {
      uk: 'Туристи (Veste, Schloss Ehrenburg, Samba-Festival, різдвяний ярмарок), студенти Hochschule Coburg (дизайн!), пари перед весіллям, компанії (подарунки з логотипом). Обійди центр: які магазини канцтоварів і сувенірів уже є, які ціни.',
      de: 'Touristen (Veste, Schloss Ehrenburg, Samba-Festival, Weihnachtsmarkt), Studierende der Hochschule Coburg (Design!), Brautpaare, Firmen (Werbegeschenke). Innenstadt ablaufen: welche Schreibwaren- und Souvenirläden gibt es, zu welchen Preisen?',
    },
    todo: {
      uk: [
        'Скласти список конкурентів із цінами',
        'Поговорити з 10 потенційними клієнтами',
        'Записати, чим твій магазин відрізняється',
      ],
      de: [
        'Wettbewerberliste mit Preisen',
        'Mit 10 potenziellen Kundinnen sprechen',
        'Alleinstellungsmerkmal formulieren',
      ],
    },
    links: [],
  },
  {
    id: 'c-pricing',
    phase: 'concept',
    title: { uk: 'Порахувати собівартість і ціни', de: 'Kosten & Preise kalkulieren' },
    desc: {
      uk: 'У вкладці «Майстерня» зібери кожну модель у конструкторі: матеріали, час, накладні витрати, націнка → рекомендована ціна. Перевір, що ціни конкурентні і покривають оренду.',
      de: 'Im Tab „Werkstatt“ jedes Modell im Konfigurator zusammenstellen: Material, Zeit, Gemeinkosten, Aufschlag → Preisvorschlag. Prüfen, ob die Preise marktfähig sind und die Miete decken.',
    },
    todo: {
      uk: [
        'Скласти всі моделі в конструкторі',
        'Порахувати, скільки виробів на місяць треба продати (точка беззбитковості)',
      ],
      de: ['Alle Modelle im Konfigurator anlegen', 'Break-even berechnen: wie viele Stück pro Monat?'],
    },
    links: [],
  },
  {
    id: 'c-search',
    phase: 'location',
    title: { uk: 'Знайти приміщення', de: 'Ladenlokal suchen' },
    desc: {
      uk: 'Найкращий потік людей — старе місто: Spitalgasse, Steinweg, Ketschengasse, Herrngasse, біля Marktplatz і Albertsplatz. Розмір 40–80 м²: зона продажу + майстерня, яку видно з вулиці (процес палітурної роботи привертає туристів).',
      de: 'Höchste Frequenz in der Altstadt: Spitalgasse, Steinweg, Ketschengasse, Herrngasse, rund um Marktplatz und Albertsplatz. 40–80 m²: Verkaufsfläche + sichtbare Werkstatt (Schaubuchbinderei zieht Touristen an).',
    },
    todo: {
      uk: [
        'Шукати на ImmoScout24 / Kleinanzeigen (Gewerbe)',
        'Запитати Stadtmarketing Coburg про вільні приміщення',
        'Подивитися мінімум 5 варіантів',
      ],
      de: [
        'ImmoScout24 / Kleinanzeigen (Gewerbe) durchsuchen',
        'Coburg Stadtmarketing nach Leerständen fragen',
        'Mindestens 5 Objekte besichtigen',
      ],
    },
    links: [{ label: 'ImmoScout24 Gewerbe', url: 'https://www.immobilienscout24.de/gewerbe-flaechen/' }],
    time: { uk: '1–3 місяці', de: '1–3 Monate' },
  },
  {
    id: 'c-visit',
    phase: 'location',
    title: { uk: 'Чекліст огляду приміщення', de: 'Checkliste Besichtigung' },
    desc: {
      uk: 'Звертай увагу на: вітрину і видимість з вулиці, денне світло для роботи, розетки, опалення, вологість (папір і шкіра її не люблять!), склад, туалет, вхід без сходинок, комунальні витрати.',
      de: 'Achten auf: Schaufenster und Sichtbarkeit, Tageslicht zum Arbeiten, Steckdosen, Heizung, Feuchtigkeit (Papier und Kunstleder mögen das nicht!), Lager, WC, barrierefreier Zugang, Nebenkosten.',
    },
    todo: {
      uk: ['Фото і заміри кожного варіанту', 'Запитати про комунальні витрати', 'Порівняти варіанти в нотатках'],
      de: ['Fotos und Maße jedes Objekts', 'Nebenkosten erfragen', 'Objekte in Notizen vergleichen'],
    },
    links: [],
  },
  {
    id: 'c-lease',
    phase: 'location',
    title: { uk: 'Домовитися про оренду', de: 'Miete verhandeln' },
    desc: {
      uk: 'Домовляйся про строк 3–5 років з опцією продовження, безкоштовний період на ремонт, право на вивіску. Юридичну перевірку див. у вкладці «Запуск: юридичний».',
      de: 'Laufzeit 3–5 Jahre mit Verlängerungsoption, mietfreie Zeit für den Umbau, Recht auf Werbeschild verhandeln. Rechtliche Prüfung siehe Tab „Gründung: rechtlich“.',
    },
    todo: {
      uk: ['Узгодити умови', 'Підписати договір після перевірки'],
      de: ['Konditionen verhandeln', 'Nach Prüfung unterschreiben'],
    },
    links: [],
  },
  {
    id: 'c-tools',
    phase: 'workshop',
    title: { uk: 'Купити інструменти', de: 'Werkzeug anschaffen' },
    desc: {
      uk: 'Базовий набір: кістяна гладилка (Falzbein), шило, палітурні голки, мат для різання, сталева лінійка, ніж, пензлі для клею, гнітючі дошки і вантажі. Далі: прес для книг, різак для картону (Pappschere), куткоріз, дирокол, прес для гарячого тиснення з літерами. Частину можна купити б/в.',
      de: 'Grundausstattung: Falzbein, Ahle, Buchbindernadeln, Schneidematte, Stahllineal, Cutter, Leimpinsel, Pressbretter und Gewichte. Ausbau: Buchpresse, Pappschere/Hebelschneider, Eckenrunder, Lochstanze, Heißprägepresse mit Lettern. Vieles gibt es gebraucht.',
    },
    todo: {
      uk: ['Скласти список з цінами', 'Перевірити б/в на Kleinanzeigen', 'Внести покупки у «Фінанси» (витрати)'],
      de: [
        'Liste mit Preisen erstellen',
        'Gebrauchtangebote auf Kleinanzeigen prüfen',
        'Käufe unter „Finanzen“ als Ausgabe erfassen',
      ],
    },
    links: [{ label: 'Kleinanzeigen', url: 'https://www.kleinanzeigen.de' }],
  },
  {
    id: 'c-materials',
    phase: 'workshop',
    title: { uk: 'Знайти постачальників матеріалів', de: 'Materiallieferanten finden' },
    desc: {
      uk: 'Палітурна штучна шкіра (рулони), сірий картон 1,5–2,5 мм, папір 80–120 г/м² (чистий, у крапку, лінія), форзацний папір, лляні нитки, ПВА-клей (без кислот), каптал, ляссе, гумки, марля. Спочатку замовляй зразки. Для оптових цін потрібен Gewerbenachweis.',
      de: 'Buchbinder-Kunstleder (Rollenware), Graupappe 1,5–2,5 mm, Papier 80–120 g/m² (blanko, dotted, liniert), Vorsatzpapier, Leinenzwirn, säurefreier PVA-Leim, Kapitalband, Lesebändchen, Gummiband, Gaze. Zuerst Muster bestellen. Für Großhandelspreise ist ein Gewerbenachweis nötig.',
    },
    todo: {
      uk: [
        'Замовити зразки у 3 постачальників',
        'Записати ціни у «Майстерня → Матеріали»',
        'Перевірити мінімальні партії',
      ],
      de: [
        'Muster bei 3 Lieferanten bestellen',
        'Preise unter „Werkstatt → Materialien“ eintragen',
        'Mindestmengen prüfen',
      ],
    },
    links: [],
  },
  {
    id: 'c-souvenirs',
    phase: 'workshop',
    title: { uk: 'Асортимент сувенірів', de: 'Souvenir-Sortiment' },
    desc: {
      uk: 'Частину товарів купуй оптом (листівки, магніти), частину бери на комісію від місцевих художників. Шукай постачальників на виставках (Ambiente і Tendence у Франкфурті, Nordstil у Гамбурзі) — потрібен Gewerbenachweis.',
      de: 'Teils im Großhandel einkaufen (Postkarten, Magnete), teils in Kommission von lokalen Künstlerinnen. Lieferanten auf Messen finden (Ambiente/Tendence Frankfurt, Nordstil Hamburg) — Gewerbenachweis nötig.',
    },
    todo: {
      uk: ['Скласти список 20 товарів', 'Домовитися з 2–3 місцевими художниками', 'Розрахувати націнку'],
      de: ['Liste mit 20 Artikeln', 'Mit 2–3 lokalen Künstlerinnen sprechen', 'Aufschläge kalkulieren'],
    },
    links: [],
  },
  {
    id: 'c-prototypes',
    phase: 'workshop',
    title: { uk: 'Прототипи і фото', de: 'Prototypen & Fotos' },
    desc: {
      uk: 'Зроби по 2 зразки кожної моделі: перевір міцність, як відкривається, як виглядає з часом. Сфотографуй їх для сайту та Instagram.',
      de: 'Je Modell 2 Muster fertigen: Haltbarkeit, Aufschlagverhalten, Alterung prüfen. Für Website und Instagram fotografieren.',
    },
    todo: {
      uk: ['Зробити зразки', 'Фото на світлому фоні', 'Записати фактичний час роботи в конструктор'],
      de: ['Muster fertigen', 'Fotos vor hellem Hintergrund', 'Tatsächliche Arbeitszeit im Konfigurator eintragen'],
    },
    links: [],
  },
  {
    id: 'c-fitout',
    phase: 'store',
    title: { uk: 'Меблі й світло', de: 'Einrichtung & Licht' },
    desc: {
      uk: 'Полиці, прилавок, робочий стіл біля вітрини, хороше світло (теплий білий для товару, нейтральний для роботи), дзеркала, декор вітрини за сезонами. Б/в меблі магазинів — дешевше.',
      de: 'Regale, Tresen, Werkbank am Schaufenster, gutes Licht (warmweiß für Ware, neutralweiß zum Arbeiten), saisonale Schaufensterdeko. Gebrauchter Ladenbau spart Geld.',
    },
    todo: {
      uk: ['Намалювати план приміщення', 'Купити/замовити меблі', 'Ремонт і прибирання'],
      de: ['Grundriss skizzieren', 'Möbel kaufen/bestellen', 'Renovieren & reinigen'],
    },
    links: [],
  },
  {
    id: 'c-pos',
    phase: 'store',
    title: { uk: 'Каса та оплата карткою', de: 'Kasse & Kartenzahlung' },
    desc: {
      uk: 'Каса з TSE (напр., планшетні рішення) + картковий термінал (SumUp, Zettle тощо). Туристи часто платять карткою. Юридичні вимоги — у вкладці «Запуск: юридичний».',
      de: 'Kasse mit TSE (z. B. Tablet-Kasse) + Kartenterminal (SumUp, Zettle o. Ä.). Touristen zahlen oft mit Karte. Rechtliches siehe Tab „Gründung: rechtlich“.',
    },
    todo: {
      uk: ['Порівняти 2–3 касові системи', 'Протестувати оплату до відкриття'],
      de: ['2–3 Kassensysteme vergleichen', 'Zahlung vor Eröffnung testen'],
    },
    links: [],
  },
  {
    id: 'c-branding',
    phase: 'store',
    title: { uk: 'Бренд і упаковка', de: 'Branding & Verpackung' },
    desc: {
      uk: 'Логотип, кольори, етикетки (з адресою за GPSR), пакети, подарункове пакування, візитки, штамп для тиснення логотипу на виробах.',
      de: 'Logo, Farben, Etiketten (mit Adresse nach GPSR), Tüten, Geschenkverpackung, Visitenkarten, Prägestempel mit Logo für die Produkte.',
    },
    todo: {
      uk: ['Логотип і фірмові кольори', 'Етикетки та пакети', 'Штамп із логотипом'],
      de: ['Logo und Markenfarben', 'Etiketten und Tüten', 'Logo-Prägestempel'],
    },
    links: [],
  },
  {
    id: 'c-online',
    phase: 'marketing',
    title: { uk: 'Сайт, інтернет-магазин і соцмережі', de: 'Website, Online-Shop & Social Media' },
    desc: {
      uk: 'Простий сайт з онлайн-магазином (Shopify, WooCommerce або Etsy для старту), профіль Google Business (люди шукають «Souvenirs Coburg»), Instagram/Pinterest/TikTok: короткі відео процесу палітурної роботи дуже добре заходять.',
      de: 'Einfache Website mit Shop (Shopify, WooCommerce oder Etsy zum Start), Google-Unternehmensprofil (Suche „Souvenirs Coburg“), Instagram/Pinterest/TikTok: kurze Videos vom Buchbinden funktionieren sehr gut.',
    },
    todo: {
      uk: ['Зареєструвати домен', 'Створити Google Business профіль', '10 відео процесу до відкриття'],
      de: ['Domain registrieren', 'Google-Unternehmensprofil anlegen', '10 Prozess-Videos vor Eröffnung'],
    },
    links: [{ label: 'Google Business Profile', url: 'https://www.google.com/business/' }],
  },
  {
    id: 'c-partners',
    phase: 'marketing',
    title: { uk: 'Локальні партнерства', de: 'Lokale Kooperationen' },
    desc: {
      uk: 'Tourist-Information Coburg, готелі, весільні салони та організатори, Hochschule Coburg, різдвяний ярмарок. Майстер-класи з палітурної справи — додатковий дохід і реклама.',
      de: 'Tourist-Information Coburg, Hotels, Brautmodengeschäfte und Hochzeitsplanerinnen, Hochschule Coburg, Weihnachtsmarkt. Buchbinde-Workshops bringen Zusatzumsatz und Sichtbarkeit.',
    },
    todo: {
      uk: ['Скласти список з 10 партнерів', 'Підготувати флаєр', 'Запланувати перший майстер-клас'],
      de: ['10 Partner auflisten', 'Flyer vorbereiten', 'Ersten Workshop planen'],
    },
    links: [{ label: 'Coburg Marketing', url: 'https://www.coburg-tourist.de' }],
  },
  {
    id: 'c-opening',
    phase: 'marketing',
    title: { uk: 'Відкриття', de: 'Eröffnung' },
    desc: {
      uk: 'Тихе відкриття для друзів (тест), потім офіційне: пропозиція на відкриття, повідомлення в місцеві медіа (Neue Presse Coburg, Coburger Tageblatt, infranken.de), анонс у соцмережах.',
      de: 'Soft Opening für Freunde (Testlauf), dann offizielle Eröffnung: Eröffnungsangebot, Pressemitteilung an lokale Medien (Neue Presse Coburg, Coburger Tageblatt, infranken.de), Ankündigung in Social Media.',
    },
    todo: {
      uk: ['Дата відкриття в календар', 'Прес-реліз', 'Подарунок першим покупцям'],
      de: ['Eröffnungsdatum in den Kalender', 'Pressemitteilung', 'Kleines Geschenk für die ersten Kundinnen'],
    },
    links: [],
  },
  {
    id: 'c-review',
    phase: 'after',
    title: { uk: 'Щомісячний аналіз', de: 'Monatliche Auswertung' },
    desc: {
      uk: 'Щомісяця дивись у «Фінанси»: дохід, витрати, бестселери. Готуйся до сезонів: Різдво, весілля (травень–вересень), шкільний сезон (вересень), туристичне літо.',
      de: 'Monatlich unter „Finanzen“ prüfen: Umsatz, Kosten, Bestseller. Saisons vorbereiten: Weihnachten, Hochzeiten (Mai–September), Schulanfang (September), Touristensommer.',
    },
    todo: {
      uk: ['Щомісячний огляд цифр', 'Сезонний план товарів'],
      de: ['Monatlicher Zahlen-Check', 'Saisonplan fürs Sortiment'],
    },
    links: [],
  },
];
