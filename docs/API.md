# API документация

Бэкенд слушает на `http://localhost:5000`.

## Аутентификация и куки

- Аутентификация: JWT в cookie `session_id`.
- Cookie: `HttpOnly`, `Path=/`, срок жизни MaxAge≈3600с. В JWT — `exp` (+24 часа).
- CORS (в `main.go`):
  - `Access-Control-Allow-Origin: http://localhost:3000`
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Headers: Content-Type`
  - `Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE`

## Эндпоинты

### POST /login
Авторизация пользователя.

Request (application/json):
```json
{
  "login": "string",
  "password": "string"
}
```
Responses:
- 200 OK
  - Set-Cookie: `session_id=<JWT>; HttpOnly; Path=/`
  - Body:
  ```json
  {"status":"200","body":{"message":"Пользователь авторизован"}}
  ```
- 401 Unauthorized — "Неверный логин или пароль"
- 400/405 — ошибка данных/метода

---

### POST /signup
Регистрация пользователя.

Request (application/json):
```json
{
  "login": "string",
  "password": "string",
  "username": "string",
  "date_of_birth": "string",
  "gender": "female|male"
}
```
Responses:
- 200 OK
  - Set-Cookie: `session_id=<JWT>; HttpOnly; Path=/`
  - Body:
  ```json
  {"status":"200","body":{"message":"Пользователь зарегистрирован"}}
  ```
- 401 Unauthorized — "Пользователь с таким логином уже существует"
- 400/405

---

### GET /
Проверка валидности сессии (health-check).

Cookie: `session_id` обязателен.

Responses:
- 200 OK
  ```json
  {"status":"200","body":{"message":"Hello, <login>"}}
  ```
- 401 Unauthorized — "Сессия не найдена" | "Неверный токен" | "Токен просрочен"

---

### GET /inbox
Возвращает входящие письма (`models.Message`).

Response (200 OK):
```json
[
  {
    "id": "string",
    "sender": {"email":"string","username":"string","avatar":"string"},
    "subject": "string",
    "snippet": "string",
    "datetime": "2025-09-28T22:12:34Z",
    "is_read": false,
    "folder": "inbox"
  }
]
```

---

### POST /logout
Выход: инвалидирует cookie.

Response (200 OK):
```json
{"status":"200","body":{"message":"Logged out"}}
```
Set-Cookie: `session_id=; Max-Age=-1; Path=/; HttpOnly`

## Коды ошибок

- 400 Bad Request — некорректные данные/JSON.
- 401 Unauthorized — неавторизован/неверные креды/дубликат логина/просрочен токен.
- 405 Method Not Allowed — неверный HTTP метод.
- 500 Internal Server Error — внутренняя ошибка.

## Клиент (Frontend)

- Запросы выполняются с `credentials: 'include'`.
- Методы API клиента: `login()`, `signup()`, `getInbox()`, `healthCheck()`, `logout()`.
- Автологин: при старте вызывается `healthCheck()`, при валидной сессии SPA открывает `/inbox`.
