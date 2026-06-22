# 🍺 Ocean-Победа КегМастер — Инструкция по деплою

## Шаг 1 — GitHub

1. Зайди на **github.com** → войди в аккаунт
2. Нажми **"New repository"** (зелёная кнопка)
3. Название: `kegmaster`
4. Нажми **"Create repository"**
5. Загрузи все файлы проекта (кнопка **"uploading an existing file"**)
   - Загружай **все файлы и папки** из архива

---

## Шаг 2 — Vercel

1. Зайди на **vercel.com** → войди через GitHub
2. Нажми **"Add New Project"**
3. Выбери репозиторий `kegmaster`
4. Нажми **"Import"**
5. **НЕ меняй настройки сборки** — просто листай вниз
6. Найди раздел **"Environment Variables"** — добавь 4 переменные:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://wbztjvisnaeqpobojtxf.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndienRqdmlzbmFlcXBvYm9qdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTUyMDIsImV4cCI6MjA5NzA5MTIwMn0.Gwe-MxA8Zza-eQTZUUc0-aagGvdB0pZoqyfl0Y793GA` |
| `TG_TOKEN` | `8939183892:AAGyFvW-8Ln2Pyn3ttIAIUNu5CmqUBTPcho` |
| `TG_CHAT_ID` | `6912965927` |
| `DAYS_WARN` | `3` |

7. Нажми **"Deploy"**
8. Подожди ~1 минуту
9. Vercel даст ссылку вида `kegmaster.vercel.app` — это и есть твой сайт! 🎉

---

## Шаг 3 — Проверка

1. Открой сайт по ссылке от Vercel
2. Нажми кнопку **"📩 Уведомить"** в шапке
3. В Telegram должно прийти сообщение

---

## Как работают автоматические уведомления

Каждый день в **9:00 утра по Москве** Vercel автоматически запускает проверку.
Если есть товары с истекающим сроком — бот пришлёт сообщение в Telegram.
Это работает **без открытия сайта**, само по себе.

---

## Доступ для коллег

Просто поделись ссылкой `kegmaster.vercel.app` с коллегами.
Данные общие — все видят одно и то же, изменения сразу видны всем.

---

## Если нужно изменить за сколько дней предупреждать

В Vercel → твой проект → **Settings → Environment Variables**
Измени значение `DAYS_WARN` (например на `2` или `5`)
Нажми **Save** → **Redeploy**
