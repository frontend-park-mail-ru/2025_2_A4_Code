```
A4_Mail
├── public
│   ├── img		# статические картинки
│   ├── index.html	# точка входа html
│   └── manifest.json		# прочие статические файлы
└── src
├── app
│   ├── components
│   │   └── Layout	# легату приложения (сайдбар, хедер, контент)
│   ├── App.ts		# контроллер загрузки и инит прилы
│   ├── sw.ts		# сервис варке
│   └──index.ts	# public API (export методов/классов)
├── features		# сервисы (уведомления и тп)
│   ├── ApiService		# сервис спи запросов
│   └── ComponentBase
├── utils		# очень общие утилиты (без бизнес логики)
│   ├── someCommonUtil.ts
│   └── index.ts	# public API
├── infra		# инфраструктурные сервисы
│   └── Router
├── routes		# страницы приложения
│   └── page
│       ├── api		# обработка ответов с бека + создание запросов
│       ├── components
│       │   ├── BasicComponent	# внутренний компонент
│       │   └── index.ts	# public API
│       ├── constants	# размеры, ссылки, текстовки тп
│       ├── views
│       │   ├── Page.scss
│       │   └── Page.hbs
│       ├──utils
│       ├── Page.ts		# контроллер компонента
│       ├── types.ts		# типы (лежат рядом с методом/классом, что их использует)
│       └── index.ts		# public API
└── index.ts		# точка входа в приложение (здесь вызываем инит App)
```