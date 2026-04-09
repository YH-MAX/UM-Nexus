**UM Nexus**

**From campus discussion to campus action.**

**One-line description**

**UM Nexus is an AI-powered open campus platform for University of Malaya that combines student community discussion, trusted second-hand exchange, and society event automation through agents that think, decide, and execute.**

**Final project positioning**

UM Nexus is **not** just:

- a forum
- a marketplace
- an event page builder
- a chatbot

It is a **campus action platform**.

It helps different people in the UM ecosystem:

- **students** discuss, ask, buy, sell, and discover opportunities
- **buyers and sellers** complete safer and faster second-hand transactions
- **student societies** generate and publish event campaigns automatically

So your platform connects **community + commerce + campus operations**.

**Final problem statement**

At UM, important information and student needs are scattered across many disconnected channels:

- WhatsApp and Telegram groups
- random Google Drive links
- word of mouth
- Instagram event posts
- personal chats for buying and selling used items

Because of this:

- useful academic discussions get buried
- event promotion is inefficient
- students miss opportunities
- second-hand buying and selling is messy and risky
- societies spend too much manual effort creating posters, posts, and registration pages

**Final solution**

UM Nexus centralizes these fragmented campus activities into one AI-powered platform.

It provides:

- a **community discussion space**
- a **trusted resale middleman agent**
- a **society event automation agent**

Instead of only showing content, UM Nexus uses AI agents to:

- understand user intent
- make decisions
- take action automatically

That is what makes it fit the hackathon theme:  
**Think → Decide → Execute**

**Final core modules**

**1\. Campus Community Forum**

A central space for UM students to:

- ask questions
- share resources
- discuss courses and assignments
- post internship and hackathon opportunities
- find teammates
- follow campus activities

**Main features**

- posts and comments
- categories and tags
- search and filtering
- thread summaries
- duplicate question detection

This gives the platform daily activity and real user-generated knowledge.

**2\. Trade Agent - AI Resale Middleman**

This is the second-hand marketplace layer, but smarter than a normal listing page.

**Core idea**

The platform acts like an **AI middleman assistant** for campus resale.

**Problems it solves**

- students do not know how to price items
- buyers and sellers cannot find each other efficiently
- many listings are low quality or suspicious
- moving-season demand is chaotic

**Main AI functions**

**Automatic pricing**

A user uploads a photo and short description.

The agent:

- identifies the item
- estimates condition
- suggests a fair price range
- recommends a listing price

Example:

- textbook recognition
- small appliance recognition
- used dorm item recognition

**Active matching**

When someone posts:

- "I want to buy"  
   and someone else posts:
- "I want to sell"

the agent checks:

- item similarity
- price compatibility
- location proximity, such as same KK or nearby campus area

Then it proactively notifies both sides:

A potential match has been found. Do you want to connect?

**Risk detection**

The agent flags:

- suspicious listings
- duplicate or fake-looking ads
- prohibited items
- abnormal price patterns
- misleading descriptions

**Why it is strong**

It is not just a marketplace.  
It is an **AI-assisted trusted campus trading system**.

**3\. EventOps Agent - Society "Ghost Writer"**

This is the automated event operation tool for UM societies and organizers.

**Core idea**

Society committees should not need to manually write every post, design every poster, and create every event page.

The EventOps Agent can take simple inputs such as:

- event title
- date and time
- venue
- target audience
- short description

and then automatically generate and publish campaign assets.

**Agent workflow**

**Think**

The agent analyzes:

- what kind of event it is
- who the audience is
- what communication style is suitable

Example:

- AI students → technical and forward-looking tone
- general students → simpler and more inviting tone
- career event → more professional tone

**Decide**

The agent decides:

- which platforms or channels to post to
- what type of copy is needed
- what poster style is suitable
- whether the message should be short, formal, or promotional

**Execute**

The agent automatically:

- generates event descriptions
- creates forum post copy
- creates Telegram-ready promo text
- generates poster visuals
- creates an event registration page on UM Nexus

**Why it is strong**

This is a real **autonomous content and distribution assistant**, not just a text generator.

**4\. AI Knowledge Layer**

This is the intelligence connecting all modules.

It powers:

- thread summarization
- similar-post retrieval
- user recommendation
- risk detection
- item recognition
- event content generation
- proactive notifications

This is the layer that makes the whole platform feel like one system rather than separate features.

**Final key AI agents**

**1\. Thread Summarizer Agent**

Summarizes long forum discussions into:

- main issue
- best answers
- key takeaways
- next steps

**2\. Similar Question Finder Agent**

Detects repeated questions and surfaces relevant existing threads before a new post is made.

**3\. Trade Agent**

Handles:

- image-based item recognition
- automatic price suggestion
- buyer-seller matching
- scam and prohibited-item detection

**4\. Moderator Agent**

Supports platform quality by flagging:

- spam
- duplicate posts
- unsafe content
- suspicious resale listings

**5\. EventOps Agent**

Handles:

- event copywriting
- style adaptation
- poster generation
- event page generation
- channel-oriented publishing support

**Final MVP for the hackathon**

Do not build everything in full.  
For the hackathon, your MVP should focus on the most impressive and demo-friendly flow.

**MVP modules**

**1\. Forum**

- create post
- comment
- tag/category
- simple feed

**2\. AI Thread Summarizer**

- summarize long discussions
- suggest similar existing posts

**3\. Trade Agent**

- upload item photo
- recognize item
- suggest price
- match buy/sell posts
- flag risky listings

**4\. EventOps Agent**

- input event details
- generate promotional copy
- generate a poster
- auto-create event page

This is enough for a strong prototype

**Final tech stack**

**Frontend**

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**

Reason: Next.js App Router is the current modern routing model and fits public event/listing pages plus app-style dashboards well.

**Backend**

- **FastAPI**
- **Pydantic**
- **SQLAlchemy**
- **Alembic**

Reason: FastAPI is a strong Python API framework, and its official docs align well with typed request/response models and SQL-based apps; FastAPI's SQL guidance also points to SQLModel/SQLAlchemy-style relational usage as a natural fit.

**Database**

- **PostgreSQL** as the core database
- Run it on **Supabase Postgres** for MVP
- Use **pgvector** inside PostgreSQL for embeddings and similarity search

Reason: Supabase is still full Postgres, not a different database, and pgvector is supported as a Postgres extension for storing embeddings and vector similarity.

**Auth / storage / realtime**

- **Supabase Auth**
- **Supabase Storage**
- **Supabase Realtime**

Reason: Supabase's platform bundles these around Postgres, which is useful for your forum, resale images, event assets, and live notifications.

**Async / background jobs**

- **Redis**
- **Celery**

Use this for:

- item recognition jobs
- price suggestion jobs
- buyer/seller matching
- risk scanning
- poster generation
- notification dispatch

This part is my architecture recommendation for your workload.

**AI layer**

- **LLM API** for text generation and reasoning
- **Embeddings API/model** for semantic retrieval and matching
- **Vision-capable model/API** for item recognition and poster/image-related flows

Use AI for:

- thread summarization
- similar question detection
- buy/sell match scoring
- listing risk checks
- event copy generation
- society promo generation

**Deployment**

- **Docker**
- Deploy **Next.js** separately
- Deploy **FastAPI API** separately
- Deploy **FastAPI worker** separately
- Use **Supabase** for managed Postgres/auth/storage/realtime

**Final one-line stack**

**Next.js + TypeScript + Tailwind + shadcn/ui + FastAPI + Pydantic + SQLAlchemy + Alembic + PostgreSQL + Supabase + pgvector + Redis + Celery + LLM/Embeddings/Vision APIs**
