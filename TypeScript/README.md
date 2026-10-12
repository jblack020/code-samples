# TS Code Samples
I mostly use TypeScript now, instead of JavaScript (type safety FTW!). These files are from my freshman year summer internship, where I worked as a research analyst for Douglas Rediker. My main project was building an AI assistant that would answer questions for his clients based on a set of documents Doug would provide. I built a full end-to-end web app using Next.js, React, Supabase, and many other microservice providers. 

**chunkers.ts** After Doug or other employees at his firm uploaded documents, they must be split up prior to creating the embeddings that allow for effective retrieval. This script implements several different ways to "chunk" these documents, including splitting on a chosen symbol, splitting on line breaks, splitting automatically along paragraph and sentence boundaries, and a custom algorithm I built specifically to handle a common style of document the firm produces by taking advantage of Gmail copying rich text as HTML, which can be walked through via a DOM parser.

**upload-route.ts** The main interaction between the client web app and the database when uploading documents. Highlights my ability to interact with external databases and APIs. 

