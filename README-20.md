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

1. Keep `index.html`, `styles.css` and `app.js` in the **same folder**.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Works on phone and desktop.

> First load needs internet for the PDF libraries (CDN). After that the app works fully offline.

## Key Features

- Separate accounts for each child
- **Opening Arrears** – enter brought-forward balances in Settings
- Termly fees with monthly instalment due dates (7th of each session month)
- Automatic overdue ageing (0–30 / 31–60 / 61+ days)
- Record payments with method, reference, notes and optional receipt
- Allocate payments to Arrears, Current Term or specific Term
- Family dashboard + per-child progress cards
- Full payment history
- PDF statement export
- Editable fee structures per year
- JSON backup / restore for multi-device use

## How to set Arrears

1. Click **Settings** (or “Set Arrears / Fees” on any child card).
2. In the orange box for each child, enter the **Opening Arrears (KES)**.
3. Click outside the field or press Tab — the value is saved automatically.
4. When recording a payment, choose **Allocate to → Arrears** to reduce the outstanding arrears.

## 2026 Fee Structures (pre-loaded)

**Derek – St. Joseph’s Rapogi**  
Yearly 61,054 | Term 1: 28,777 | Term 2: 18,066 | Term 3: 12,011

**Brian – Christian Outreach (Grade 3)**  
Yearly 33,000 | Terms: 11,000 each

**Joseph – Christian Outreach (Playgroup)**  
Yearly 27,000 | Terms: 9,000 each

## Multi-device

Use **Settings → Export JSON Backup** on one device and **Import JSON** on another.
