INSPIRO DIGITAL — STATIC SITE + REVIEW ANNOTATION LAYER
=======================================================

FILES
-----
index.html         Home
services.html      Services
portfolio.html     Portfolio
case-study.html    Portfolio -> case study detail
about.html         About Us

inspiro.css        Design system (colors, type, spacing, radius, grid,
                   buttons, forms, cards, nav, backgrounds, motion)
inspiro.js         Scroll reveals, carousels, FAQ, filters, forms
annotate.css       Review annotation layer styling
annotate.js        Review annotation engine
notes-server.js    Optional Node server (serves site + writes notes.json)
notes.json         Reviewer notes (starts empty)

BEFORE YOU OPEN IT
------------------
Drop Inspiro-logo-dark.png into this same folder. It is referenced by
the header of every page.

RUNNING IT
----------
Option A — with note saving to notes.json (recommended for client review)
    node notes-server.js
    open http://localhost:4000
  Every note a visitor saves is written into notes.json.
  Custom port: node notes-server.js 8080

Option B — plain static
  Double-click index.html, or host the folder anywhere.
  Notes are kept in the visitor's browser; they use the panel's
  "Download notes.json" button to send them to you.

REVIEW MODE
-----------
Hover any heading, paragraph, card, button, image or section -> a blue
pencil appears in its top-right corner -> click it -> side panel opens
with the selected element and a note box.

  - "Select the parent block instead" moves the target up a level
  - Saved notes outline the element; hovering it shows the note instantly
  - The panel lists all notes on the page; click one to jump to it
  - Ctrl/Cmd+Enter saves, Esc closes
  - The "Review mode" pill (bottom right) turns the whole layer off

Each note stores: page, CSS selector, element label, element text,
the note, author and timestamp.
