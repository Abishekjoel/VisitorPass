# VisitorPass — Visitor Management System (Frontend)

Frontend for a visitor management system: register visitors, issue a
printable pass, track check-in and check-out times, and review visitor
records.

Built with plain HTML, CSS and JavaScript — no frameworks, no build step.

---

## Project structure

```
visitorpass/
├── index.html              Login page
├── dashboard.html          Stats, recent visitors, weekly chart
├── new-visitor.html        Visitor registration form
├── visitor-pass.html       Printable visitor pass
├── visitor-list.html       All visitors: search, filter, actions
├── pass-history.html       Completed visits only
├── settings.html           Profile and password
│
├── css/
│   └── style.css           All styling (design tokens at the top)
│
└── js/
    ├── icons.js            Injects the shared SVG icon sprite
    ├── store.js            Data layer — records, user, persistence
    ├── toast.js            Notification messages
    ├── ui.js               Sidebar, top bar, login guard
    ├── login.js            index.html
    ├── dashboard.js        dashboard.html
    ├── new-visitor.js      new-visitor.html
    ├── visitor-pass.js     visitor-pass.html
    ├── visitor-table.js    visitor-list.html + pass-history.html
    └── settings.js         settings.html
```

---

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5500
# then open http://localhost:5500
```

A local server is recommended so relative paths behave exactly as they
will in production.

**Sign in with any username and password** — authentication is stubbed
until the backend is connected.

---

## How the pages fit together

Every signed-in page loads the same four scripts:

```html
<script src="js/icons.js"></script>   <!-- icon sprite   -->
<script src="js/store.js"></script>   <!-- data          -->
<script src="js/toast.js"></script>   <!-- messages      -->
<script src="js/page.js"></script>    <!-- page logic    -->
<script src="js/ui.js"></script>      <!-- shell, last   -->
```

`ui.js` runs last on purpose. It checks that the user is signed in,
builds the sidebar and top bar around the page's `<main class="page">`,
and then calls the page's `initPage()` function. Each page script
defines `window.initPage` and does nothing until `ui.js` calls it.

To add a new page, copy any existing page's `<head>` and script block,
put your markup inside `<main class="page" hidden>`, add a `js/` file
that defines `window.initPage`, and add a link to the `NAV` array at
the top of `js/ui.js`.

---

## Connecting the FastAPI backend

All data access goes through `js/store.js`. No other file touches
storage. Replace the function bodies under the **API surface** comment
with `fetch()` calls and the rest of the app keeps working unchanged:

| Store function      | Suggested endpoint                  |
|---------------------|-------------------------------------|
| `Store.login()`     | `POST /api/auth/login`              |
| `Store.all()`       | `GET /api/visitors`                 |
| `Store.filter()`    | `GET /api/visitors?q=&date=`        |
| `Store.counts()`    | `GET /api/visitors/summary`         |
| `Store.add()`       | `POST /api/visitors`                |
| `Store.checkOut()`  | `PATCH /api/visitors/{id}/checkout` |
| `Store.remove()`    | `DELETE /api/visitors/{id}`         |
| `Store.getUser()`   | `GET /api/profile`                  |
| `Store.setUser()`   | `PUT /api/profile`                  |

The page scripts call these synchronously today. When you swap in
`fetch`, make each Store function `async` and add `await` at the call
sites — they are all marked in the page scripts by the `Store.` prefix.

Records currently persist in `localStorage` under the key
`visitorpass.data`. Clear that key, or call `Store.reset()` from the
console, to restore the sample data.

---

## Notes

- **The QR block is decorative.** It is generated deterministically from
  the pass number and has real finder squares, but it is not machine
  readable. To make it scannable, include a QR library such as
  `qrcode.js` and replace `qrSvg()` in `js/visitor-pass.js`.
- **Printing** is handled by the `@media print` rules at the bottom of
  `style.css` — only the pass card prints, not the sidebar or buttons.
- **Colours, spacing and radii** are CSS custom properties in the
  `:root` block at the top of `style.css`. Change them there rather
  than hunting through rules.
- Layout is responsive down to mobile, keyboard focus is visible, and
  `prefers-reduced-motion` is respected.
