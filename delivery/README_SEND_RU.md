# GeoKZN: что отправить другу и как запустить проект на ноутбуке

## Что уже подготовлено

В папке `delivery` лежат готовые материалы для передачи:

- `db/geomessenger_dump.sql` — актуальный дамп базы PostgreSQL.
- `config/backend.env` — рабочий backend-конфиг.
- `config/app.env.example` — пример конфига для мобильного клиента.
- `FILES_TO_SEND.txt` — краткий список того, что отправлять.

## Что лучше отправить другу

Самый удобный вариант — отправить одну чистую папку проекта:

- `delivery/GeoKZN_share`

Внутри уже должен быть:

- исходный код мобильного приложения;
- backend;
- дамп БД;
- готовый backend `.env`;
- инструкция запуска.

Если отправляете проект вручную, не отправляйте:

- `node_modules`
- `.git`
- `.expo`
- `dist`
- дипломные `.docx`, `.zip`, временные каталоги и кэши

## Что должно быть у друга установлено

### Обязательно

- `Node.js` 20+ или 22+
- `PostgreSQL` 15+

### Для запуска приложения

Один из вариантов:

- Android Studio + Android Emulator
- или Android-телефон с Expo Go

## Быстрый порядок запуска

### 1. Распаковать проект

Друг распаковывает `GeoKZN_share` в удобную папку, например:

```powershell
C:\Projects\GeoKZN_share
```

### 2. Установить зависимости backend

```powershell
cd "C:\Projects\GeoKZN_share\backend"
npm install
```

### 3. Подготовить backend `.env`

Если файл `backend\.env` уже лежит в архиве, ничего делать не нужно.

Если его нет, можно скопировать из:

```powershell
copy "..\delivery\config\backend.env" ".env"
```

Содержимое должно быть таким:

```env
PORT=4000
DATABASE_URL=postgres://geomessenger_user:geomessenger_pass@localhost:5432/geomessenger
JWT_SECRET=change_me_dev_secret
```

### 4. Восстановить базу данных

Есть два варианта.

#### Вариант A. Самый простой: восстановить готовый дамп

Если `psql` установлен:

```powershell
$env:PGPASSWORD='geomessenger_pass'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U geomessenger_user -d geomessenger -f "..\delivery\db\geomessenger_dump.sql"
```

Если база `geomessenger` и пользователь `geomessenger_user` ещё не созданы, сначала можно выполнить:

```powershell
npm run db:setup
```

Потом повторить восстановление дампа.

#### Вариант B. Без дампа, только миграции и сиды

Если дамп не нужен, можно просто создать пустую рабочую БД командой:

```powershell
npm run db:setup
```

Это создаст базу, пользователя и прогонит миграции/seed.

### 5. Запустить backend

```powershell
cd "C:\Projects\GeoKZN_share\backend"
npm run dev
```

Backend должен стартовать на:

```text
http://localhost:4000
```

### 6. Установить зависимости мобильного клиента

Во втором окне PowerShell:

```powershell
cd "C:\Projects\GeoKZN_share"
npm install
```

### 7. Запустить мобильное приложение

```powershell
npm run start -- --offline
```

## Как открыть приложение на ноутбуке

### Вариант A. Через Android Emulator

1. Запустить Android Emulator.
2. Дождаться полной загрузки Android.
3. В терминале Expo нажать `a`.

### Вариант B. Через телефон с Expo Go

1. Телефон и ноутбук должны быть в одной Wi-Fi сети.
2. Установить Expo Go.
3. Открыть проект по QR-коду из терминала Expo.

## Если API не работает на Android Emulator

Обычно для Expo dev-клиента ваш проект сам подхватывает адрес backend через host Expo.

Если нет, можно создать в корне проекта файл `.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

Потом перезапустить Expo:

```powershell
npm run start -- --offline --clear
```

`10.0.2.2` — это localhost хоста для Android Emulator.

## Полезные команды

### Проверить backend

```powershell
Invoke-WebRequest http://localhost:4000/events
```

### Если порт 4000 уже занят

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen
```

### Если порт 8081 уже занят

```powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen
```

## Логин администратора

Если используется только миграция/seed без вашего дампа, backend создаёт администратора:

- логин: `Admin`
- пароль: `1234`

Если используется `geomessenger_dump.sql`, в базе будут лежать те данные, которые были у вас на момент снятия дампа.

