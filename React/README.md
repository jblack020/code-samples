# React Code Samples
React, while more of a framework than a language, is what I build most of my frontends in. Two of these files come from the same AI assistant I built for Douglas Rediker's firm (see the TypeScript folder for the backend side), and one is from a desktop PDF reader I started building on my own in spring 2024.

**ChatContainer.jsx**
The main chat interface for the AI assistant. It streams responses from the model, saves each conversation to the database (debounced so it isn't writing on every message), and remembers your scroll position and unsent input across page refreshes. It also matches the sources the model says it used against the documents it was actually given, so users can see exactly where an answer came from.

**useActionWithToast.tsx**
A custom hook I wrote to standardize how the app handles server actions. Wrap any action in it and you get success/error notifications, plus optional retry and "continue" buttons and callbacks for each stage, all without rewriting the same try/catch logic in every component. Probably the piece of the project I'm proudest of from a design standpoint.

**PDFView.jsx**
From ace, an Electron app for reading PDFs. Zooming in react-pdf caused the page to flicker while it re-rendered, so I stacked two copies of each page on top of each other: the hidden one renders at the new zoom level, then the two swap once it's ready. Simple idea, but it made the zoom feel seamless.

