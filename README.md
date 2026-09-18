# OGUTA Family School Fees Tracker

Offline-first web app for tracking school fees for **Derek Oguta**, **Brian Oguta Jr.** and **Joseph Oguta**.

## Files

| File          | Purpose                                      |
|---------------|----------------------------------------------|
| `index.html`  | Main HTML structure                          |
| `styles.css`  | All styling                                  |
| `app.js`      | Application logic, data model, calculations  |
| `README.md`   | This file                                    |

## How to use

1. Keep all three files (`index.html`, `styles.css`, `app.js`) in the **same folder**.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Works on phone and desktop. No installation required.
4. Data is stored locally in the browser (localStorage). No server needed.

> **Note:** The first time you open the app you need internet so the browser can load the two jsPDF libraries from CDN. After that the app works fully offline.

## Features

- Separate accounts for each child
- 2026 fee structures pre-loaded
- Arrears tracked as a distinct top line (cleared first)
- Termly fees expected in three equal monthly instalments
- Due dates: 7th of each school-session month
- Automatic overdue ageing (0–30 / 31–60 / 61+ days)
- Payment recording: amount, date, method, transaction reference, notes + optional receipt photo/PDF
- Family dashboard + per-child progress cards with progress bars
- Full payment history table
- PDF statement export (family-wide)
- Editable fee structures per year
- Year selector supports historical and future years
- JSON backup / restore for multi-device or multi-user sharing

## 2026 Fee Structures

**Derek – St. Joseph’s Rapogi School**
- Yearly: KES 61,054
- Term 1 (Jan–Mar): 28,777  
- Term 2 (May–Jul): 18,066  
- Term 3 (Aug–Oct): 12,011  

**Brian – Christian Outreach Academy (Grade 3)**
- Yearly: KES 33,000
- Term 1 / 2 / 3: 11,000 each

**Joseph – Christian Outreach Academy (Playgroup)**
- Yearly: KES 27,000
- Term 1 / 2 / 3: 9,000 each

## Multi-user / Multi-device

Because this is pure client-side, each browser/device keeps its own data.  
Use **Settings → Export JSON Backup** on one device and **Import JSON** on another to synchronise.

## Technical notes

- Receipts are stored as base64 inside localStorage — keep attached files reasonably small.
- Term dates follow the calendar you provided (Jan–Mar, May–Jul, Aug–Oct).
- You can edit any year’s fee structure inside Settings.
- All logic lives in `app.js` so future changes are straightforward.
