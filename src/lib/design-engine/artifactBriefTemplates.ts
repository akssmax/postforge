/** Structured mini-briefs used as category/artifact prompt suggestions in Brief Chat. */

export const ARTIFACT_BRIEF_TEMPLATES: Record<string, string> = {
  meetup_poster: `### Design Challenge: Community Meetup Poster

**Objective**
Design a modern, eye-catching poster for a community meetup that encourages people to attend while clearly communicating the event details.

**Event**

* **Title:** Design & Coffee Meetup
* **Audience:** Designers, developers, and startup enthusiasts
* **Date:** Saturday, 22 August
* **Time:** 10:00 AM – 1:00 PM
* **Venue:** WeWork, Koramangala, Bengaluru
* **CTA:** Scan the QR code to RSVP

**Deliverable**

* One poster (1080 × 1350 px)

**Evaluation**
Your design will be judged on visual hierarchy, typography, layout, creativity, and overall clarity of communication.`,

  birthday_invite: `### Design Challenge: Birthday Party Invitation

**Objective**
Create a playful, photo-friendly birthday invitation that feels personal and makes the party details easy to find at a glance.

**Event**

* **Title:** Maya Turns 8!
* **Host:** The Sharma Family
* **Date:** Sunday, 14 September
* **Time:** 4:00 PM – 7:00 PM
* **Venue:** Skyline Park, Indiranagar, Bengaluru
* **RSVP:** Reply by 7 September — priya@email.com

**Deliverable**

* One invitation card (5:7 portrait, print-ready)

**Evaluation**
Clear hierarchy for name, date, and RSVP; warm celebratory tone without clutter.`,

  wedding_invite: `### Design Challenge: Wedding Save-the-Date

**Objective**
Design an elegant save-the-date that communicates the couple, date, and venue with refined typography and a romantic tone.

**Event**

* **Couple:** Ananya & Rohan
* **Headline:** Save the Date
* **Date:** Saturday, 8 February 2027
* **Venue:** Taj West End, Bengaluru
* **Website:** ananyarohan.com

**Deliverable**

* One save-the-date card (5:7 portrait)

**Evaluation**
Premium typography, restrained palette, and unmistakable date/venue hierarchy.`,

  rsvp_card: `### Design Challenge: RSVP Response Card

**Objective**
Design a concise RSVP card that makes it effortless for guests to confirm attendance and share dietary preferences.

**Details**

* **Event:** Patel–Mehta Wedding Reception
* **Deadline:** Please respond by 1 November
* **Options:** Accepts with pleasure / Regretfully declines
* **Contact:** rsvp@patelmehta.com · +91 98765 43210

**Deliverable**

* One RSVP card (5:7 portrait, print-ready)

**Evaluation**
Minimal copy, large readable type, and a clear response deadline.`,

  business_card: `### Design Challenge: Executive Business Card

**Objective**
Design a premium, print-ready business card with restrained typography and a clear contact hierarchy.

**Contact**

* **Name:** Priya Nair
* **Title:** Head of Product
* **Company:** Northstar Labs
* **Email:** priya@northstar.io
* **Phone:** +91 98765 43210
* **Website:** northstar.io

**Deliverable**

* One business card (3.5 × 2 in, 300 DPI)

**Evaluation**
Legible at arm's length, balanced whitespace, no decorative clutter.`,

  certificate: `### Design Challenge: Course Completion Certificate

**Objective**
Create a formal certificate suitable for printing or PDF sharing, with centered hierarchy and institutional credibility.

**Details**

* **Recipient:** Arjun Desai
* **Award:** Certificate of Completion
* **Program:** Advanced UX Research · Spring 2026
* **Date:** 15 June 2026
* **Signatory:** Dr. Meera Iyer, Program Director

**Deliverable**

* One certificate (11 × 8.5 in landscape)

**Evaluation**
Formal tone, clear recipient name prominence, and balanced ornamental restraint.`,

  proposal_cover: `### Design Challenge: Client Proposal Cover

**Objective**
Design a polished proposal cover page that establishes trust and frames the engagement before the reader opens the document.

**Project**

* **Client:** Horizon Retail Group
* **Title:** Omnichannel Checkout Redesign
* **Prepared by:** Studio Meridian
* **Date:** July 2026
* **Subtitle:** Strategy, UX, and rollout plan

**Deliverable**

* One cover page (landscape, print-ready)

**Evaluation**
Enterprise credibility, strong project title hierarchy, and subtle brand presence.`,

  hiring_post: `### Design Challenge: Open Role Hiring Post

**Objective**
Design a LinkedIn-ready hiring post that attracts qualified candidates with a clear role hook, culture signal, and apply CTA.

**Role**

* **Title:** Senior Product Designer
* **Team:** Design · Bengaluru (hybrid)
* **Hook:** Shape the checkout experience used by 2M+ shoppers
* **Culture:** Small team, high craft, weekly design critiques
* **CTA:** Apply at careers.northstar.io/design

**Deliverable**

* One square social post (1080 × 1080 px)

**Evaluation**
Scannable headline, inclusive tone, and a prominent apply action.`,

  quote_card: `### Design Challenge: Thought-Leadership Quote Card

**Objective**
Turn one sharp insight into a shareable quote card with premium typography and minimal visual noise.

**Quote**

* **Text:** "The best products don't add features — they remove friction."
* **Attribution:** Priya Nair, Head of Product · Northstar Labs

**Deliverable**

* One square quote card (1080 × 1080 px)

**Evaluation**
Quote is the hero; attribution is secondary but legible; generous whitespace.`,

  linkedin_ad: `### Design Challenge: LinkedIn Product Launch Ad

**Objective**
Create a credible B2B LinkedIn ad that leads with a concrete benefit, supports it with proof, and drives a low-friction CTA.

**Campaign**

* **Headline:** Cut invoice processing time by 60%
* **Subheading:** Finance teams at 200+ companies automate approvals with LedgerFlow
* **Proof:** SOC 2 Type II · 14-day free trial
* **CTA:** Book a demo

**Deliverable**

* One LinkedIn feed ad (1080 × 1080 px)

**Evaluation**
Professional tone, benefit-first hierarchy, and CTA visible without scrolling.`,

  instagram_post: `### Design Challenge: Instagram Feature Highlight

**Objective**
Design a visual-first Instagram post that spotlights one product feature with punchy copy and modern SaaS aesthetics.

**Post**

* **Headline:** Smart reminders, zero setup
* **Supporting line:** Turn any deadline into an automatic nudge — no rules engine required
* **Brand:** Pulse App
* **CTA:** Try free → link in bio

**Deliverable**

* One Instagram feed post (1080 × 1080 px)

**Evaluation**
Short copy, strong visual focal point, and mobile-readable type sizes.`,

  checklist: `### Design Challenge: Practical Checklist Graphic

**Objective**
Design a scannable checklist that helps readers complete a task step-by-step without dense paragraphs.

**Content**

* **Title:** Launch-Day Checklist for Product Teams
* **Subtitle:** 24 hours before go-live
* **Items:**
  1. Confirm rollback plan and on-call rotation
  2. Freeze non-critical deploys
  3. Verify analytics events in staging
  4. Send internal comms with support macros
  5. Schedule post-launch retro

**Deliverable**

* One portrait checklist (1080 × 1350 px)

**Evaluation**
Numbered hierarchy, consistent spacing, and each line readable at phone size.`,

  comparison_chart: `### Design Challenge: Product Comparison Chart

**Objective**
Build a side-by-side comparison that helps buyers quickly see why your option wins — without marketing fluff.

**Comparison**

* **Title:** LedgerFlow vs. Spreadsheets
* **Columns:** LedgerFlow · Manual spreadsheets
* **Rows:** Auto-approvals · Audit trail · Real-time dashboards · Setup time · Monthly cost
* **Tone:** Factual, skimmable, checkmark-friendly

**Deliverable**

* One landscape comparison graphic (1200 × 627 px)

**Evaluation**
Clear column headers, aligned rows, and obvious winner signals.`,

  framework: `### Design Challenge: 5-Step Framework Infographic

**Objective**
Explain a repeatable framework in five scannable steps with equal visual weight per stage.

**Framework**

* **Title:** The PRIDE Launch Framework
* **Steps:**
  1. **Plan** — Define success metrics and scope
  2. **Research** — Interview 8–10 target users
  3. **Ideate** — Sketch 3 divergent concepts
  4. **Decide** — Score options against metrics
  5. **Execute** — Ship MVP with instrumentation

**Deliverable**

* One square framework graphic (1080 × 1080 px)

**Evaluation**
Equal step treatment, short labels, and logical left-to-right or top-to-bottom flow.`,

  timeline: `### Design Challenge: Company Timeline Graphic

**Objective**
Tell a chronological story with dated milestones that are easy to follow at a glance.

**Timeline**

* **Title:** Northstar Labs — Our Journey
* **Milestones:**
  * 2019 — Founded in Bengaluru
  * 2021 — Series A · 50 customers
  * 2023 — Expanded to Singapore
  * 2025 — 500+ enterprise accounts
  * 2026 — AI-assisted workflows launch

**Deliverable**

* One landscape timeline (1200 × 627 px)

**Evaluation**
Chronological clarity, consistent milestone styling, and readable dates.`,

  infographic: `### Design Challenge: Data Story Infographic

**Objective**
Combine headline stats, short supporting copy, and section blocks into one cohesive visual guide.

**Story**

* **Title:** How Remote Teams Stay Aligned
* **Stat 1:** 68% — use async standups weekly
* **Stat 2:** 3.2 hrs — saved per person on meetings
* **Sections:** Communication norms · Tooling stack · Weekly rituals
* **CTA:** Download the full playbook

**Deliverable**

* One portrait infographic (1080 × 1350 px)

**Evaluation**
Stat hierarchy pops, sections are scannable, and the narrative flows top to bottom.`,

  pitch_deck: `### Design Challenge: Pitch Deck Title Slide

**Objective**
Open an investor pitch with a bold title slide that states the company, promise, and round context in one glance.

**Slide**

* **Company:** Northstar Labs
* **Headline:** Real-time finance ops for growing SaaS
* **Subheading:** Seed round · $2.4M ARR · 180 customers
* **Presenter:** Priya Nair, CEO
* **Date:** July 2026

**Deliverable**

* One 16:9 title slide (1920 × 1080 px)

**Evaluation**
Confident typography, minimal clutter, and investor-appropriate tone.`,

  roadmap: `### Design Challenge: Product Roadmap Slide

**Objective**
Communicate upcoming quarters with concise milestones investors and customers can scan quickly.

**Roadmap**

* **Title:** H2 2026 Product Roadmap
* **Q3:** Multi-currency approvals · Salesforce integration
* **Q4:** AI anomaly detection · Mobile approvals
* **Q1 2027:** Enterprise SSO · Custom reporting

**Deliverable**

* One 16:9 roadmap slide (1920 × 1080 px)

**Evaluation**
Quarter labels are prominent; milestones are short; timeline reads left to right.`,

  webinar_slides: `### Design Challenge: Webinar Title Slide

**Objective**
Design an opening slide that sells the webinar topic, date, and speaker credibility before the session starts.

**Event**

* **Title:** Designing for Trust in Fintech
* **Date:** Thursday, 18 September · 11:00 AM IST
* **Speaker:** Arjun Desai, VP Design · PayGrid
* **Host:** DesignOps Collective

**Deliverable**

* One 16:9 webinar slide (1920 × 1080 px)

**Evaluation**
Event name dominates, date/time are unmistakable, and speaker credentials add authority.`,

  flowchart: `### Design Challenge: Decision Flowchart

**Objective**
Map a decision process with clear start/end nodes, yes/no branches, and short action labels.

**Process**

* **Title:** Support Ticket Escalation Flow
* **Start:** New ticket received
* **Steps:** Triage → Known issue? → Apply fix / Escalate to L2 → Customer notified → Close ticket
* **Branches:** SLA breach triggers manager alert

**Deliverable**

* One landscape flowchart (1200 × 627 px)

**Evaluation**
Logical flow direction, readable node labels, and obvious decision diamonds.`,

  org_chart: `### Design Challenge: Team Org Chart

**Objective**
Show reporting structure for a small team with names, titles, and readable hierarchy at a glance.

**Organization**

* **Title:** Product & Design — Q3 2026
* **Lead:** Priya Nair · Head of Product
* **Reports:**
  * Arjun Desai · Senior Product Designer
  * Meera Shah · Product Manager
  * Vikram Rao · UX Researcher

**Deliverable**

* One square org chart (1080 × 1080 px)

**Evaluation**
Clear reporting lines, consistent node sizing, and names legible when zoomed out.`,

  process_flow: `### Design Challenge: Process Flow Diagram

**Objective**
Document a repeatable workflow in 4–6 action-oriented steps with left-to-right flow.

**Process**

* **Title:** New Feature Release Pipeline
* **Steps:**
  1. Spec review
  2. Design critique
  3. Build & QA
  4. Staged rollout
  5. Monitor metrics
  6. Retro & docs

**Deliverable**

* One landscape process diagram (1200 × 627 px)

**Evaluation**
Short verb-led labels, even spacing, and arrows that guide the eye naturally.`,
};

/** Extra suggestions for categories without dedicated artifacts in the registry. */
export const CATEGORY_EXTRA_BRIEFS: Partial<
  Record<string, Array<{ label: string; prompt: string }>>
> = {
  marketing: [
    {
      label: "Limited offer",
      prompt: `### Design Challenge: Limited-Time Promotion

**Objective**
Create urgency around a time-bound offer without feeling spammy — credible headline, clear dates, strong CTA.

**Offer**

* **Headline:** 30% off annual plans — this week only
* **Dates:** 24–31 July 2026
* **Proof:** Trusted by 500+ finance teams
* **CTA:** Claim offer before midnight Friday

**Deliverable**

* One LinkedIn square ad (1080 × 1080 px)

**Evaluation**
Urgency is clear but tasteful; dates and CTA are impossible to miss.`,
    },
    {
      label: "Product launch",
      prompt: `### Design Challenge: Product Launch Announcement

**Objective**
Announce a new product with a bold headline, one proof point, and a clear try-now CTA.

**Launch**

* **Headline:** Introducing LedgerFlow 4
* **Subheading:** Close books 3× faster with AI-assisted reconciliation
* **Proof:** Trusted by 500+ finance teams · SOC 2 Type II
* **CTA:** Start free trial

**Deliverable**

* One launch graphic (1200 × 627 px)

**Evaluation**
Benefit-first hierarchy, credible proof line, and CTA visible without scrolling.`,
    },
    {
      label: "Case study promo",
      prompt: `### Design Challenge: Customer Case Study Promo

**Objective**
Tease a customer success story with a concrete result, company name, and read-more CTA.

**Story**

* **Headline:** How Acme Corp cut invoice time by 60%
* **Subheading:** From 12-day cycles to same-week close
* **Customer:** Acme Corp · 800-person SaaS
* **CTA:** Read the case study

**Deliverable**

* One LinkedIn square promo (1080 × 1080 px)

**Evaluation**
Result is the hero stat; customer name adds credibility; CTA is obvious.`,
    },
    {
      label: "Webinar promo",
      prompt: `### Design Challenge: Webinar Registration Promo

**Objective**
Drive sign-ups with topic hook, date/time, speaker credibility, and register CTA.

**Webinar**

* **Title:** Mastering Async Design Critiques
* **Date:** Thursday, 18 September · 11:00 AM IST
* **Speaker:** Arjun Desai, VP Design · PayGrid
* **CTA:** Register free

**Deliverable**

* One webinar promo graphic (1200 × 627 px)

**Evaluation**
Topic and date are unmistakable; speaker line adds authority; register CTA contrasts strongly.`,
    },
  ],
  social: [
    {
      label: "Team milestone",
      prompt: `### Design Challenge: Team Milestone Celebration

**Objective**
Celebrate a team achievement on social with authentic tone — headline win, optional metric, minimal vanity.

**Post**

* **Headline:** We hit 1 million processed invoices 🎉
* **Subheading:** Thank you to every customer who trusted us this year
* **Metric:** 99.97% uptime · 40-person team · 12 countries
* **CTA:** Read the story on our blog

**Deliverable**

* One square social post (1080 × 1080 px)

**Evaluation**
Genuine celebratory tone, readable metric line, and brand-appropriate restraint.`,
    },
    {
      label: "Product tip",
      prompt: `### Design Challenge: Quick Product Tip Post

**Objective**
Share one actionable product tip in a scannable format — hook, 3 bullets max, soft CTA.

**Tip**

* **Headline:** 3 ways to speed up approvals
* **Tips:** Set default approvers · Use amount thresholds · Enable Slack alerts
* **Brand:** LedgerFlow
* **CTA:** Try it free → link in bio

**Deliverable**

* One Instagram carousel cover (1080 × 1080 px)

**Evaluation**
Tip headline pops; bullets are short; mobile-readable at a glance.`,
    },
    {
      label: "Poll question",
      prompt: `### Design Challenge: Engagement Poll Graphic

**Objective**
Design a visual that frames a debate-worthy question and invites comments or votes.

**Poll**

* **Question:** Async or live design critiques?
* **Options:** Async wins · Live wins · Hybrid is best
* **Context:** DesignOps Dispatch · Week 42
* **CTA:** Drop your take in the comments

**Deliverable**

* One square poll graphic (1080 × 1080 px)

**Evaluation**
Question is large and readable; options are balanced; invites participation without clutter.`,
    },
    {
      label: "Event recap",
      prompt: `### Design Challenge: Event Recap Post

**Objective**
Summarize an event in three highlights with photos-friendly layout and grateful tone.

**Recap**

* **Headline:** Bengaluru Design Week — thank you!
* **Highlight 1:** 400+ attendees across 2 days
* **Highlight 2:** 12 workshops · 3 keynotes
* **Highlight 3:** See you next year
* **CTA:** Browse session recordings

**Deliverable**

* One square recap post (1080 × 1080 px)

**Evaluation**
Grateful headline, three equal-weight highlights, and space for event photography.`,
    },
  ],
  education: [
    {
      label: "Lesson summary",
      prompt: `### Design Challenge: Lesson Summary Card

**Objective**
Distill one lesson into a headline takeaway, three key points, and a remember-this line.

**Lesson**

* **Title:** UX Research in 30 Minutes
* **Takeaway:** Talk to 5 users before you wireframe
* **Points:** Define the job · Ask open questions · Synthesize patterns
* **Remember:** Insights beat assumptions

**Deliverable**

* One portrait summary card (1080 × 1350 px)

**Evaluation**
Takeaway dominates; three points are scannable; tone is teacher-friendly not salesy.`,
    },
    {
      label: "Study guide",
      prompt: `### Design Challenge: Exam Study Guide Cover

**Objective**
Create a study guide cover with subject, unit/chapter, and 4–6 topic tags students can skim.

**Guide**

* **Subject:** Introduction to Data Structures
* **Unit:** Unit 3 — Trees & Graphs
* **Topics:** BST operations · Traversals · Shortest path · Practice problems
* **Course:** CS201 · Fall 2026

**Deliverable**

* One study guide cover (A4 portrait)

**Evaluation**
Subject hierarchy clear; topic tags scannable; academic tone without clip-art clutter.`,
    },
  ],
  presentations: [
    {
      label: "Company overview",
      prompt: `### Design Challenge: Company Overview Slide

**Objective**
Introduce the company in one slide — name, one-line mission, and three proof metrics.

**Slide**

* **Company:** Northstar Labs
* **Mission:** Real-time finance ops for growing SaaS
* **Metrics:** $2.4M ARR · 180 customers · 99.97% uptime
* **Presenter:** Company overview · July 2026

**Deliverable**

* One 16:9 overview slide (1920 × 1080 px)

**Evaluation**
Company name and mission lead; metrics are scannable; investor-appropriate restraint.`,
    },
    {
      label: "Quarterly results",
      prompt: `### Design Challenge: Quarterly Results Slide

**Objective**
Present Q2 highlights with revenue, growth, and one strategic win in equal visual weight.

**Results**

* **Title:** Q2 2026 Highlights
* **Revenue:** $620K (+18% QoQ)
* **Growth:** 42 new customers · NPS 62
* **Win:** Launched Smart Approvals — 30% faster close
* **Presenter:** Finance update · July 2026

**Deliverable**

* One 16:9 results slide (1920 × 1080 px)

**Evaluation**
Quarter title prominent; three metrics balanced; numbers legible from the back row.`,
    },
    {
      label: "Team intro",
      prompt: `### Design Challenge: Team Introduction Slide

**Objective**
Introduce a team with group title, 3–4 member names/roles, and a culture one-liner.

**Team**

* **Title:** Meet the Product & Design Team
* **Members:** Priya Nair · Head of Product · Arjun Desai · Senior Designer · Meera Shah · PM
* **Culture:** Small team, high craft, weekly design critiques
* **Context:** All-hands · July 2026

**Deliverable**

* One 16:9 team slide (1920 × 1080 px)

**Evaluation**
Team title dominates; names and roles scannable; warm professional tone.`,
    },
    {
      label: "Case study slide",
      prompt: `### Design Challenge: Customer Case Study Slide

**Objective**
Tell one customer story with problem, solution, and measurable result on a single slide.

**Case Study**

* **Customer:** Horizon Retail Group
* **Problem:** 12-day invoice approval cycles
* **Solution:** LedgerFlow auto-routing + Slack alerts
* **Result:** 60% faster close · 99.2% on-time approvals
* **CTA:** Read full story

**Deliverable**

* One 16:9 case study slide (1920 × 1080 px)

**Evaluation**
Customer name credible; result stat is the hero; problem/solution concise.`,
    },
    {
      label: "Closing slide",
      prompt: `### Design Challenge: Presentation Closing Slide

**Objective**
End with gratitude, one next step, and contact details — minimal copy, confident layout.

**Closing**

* **Headline:** Thank you
* **Next step:** Let's schedule a 30-minute demo
* **Contact:** priya@northstar.io · northstar.io
* **Presenter:** Priya Nair, CEO · Northstar Labs

**Deliverable**

* One 16:9 closing slide (1920 × 1080 px)

**Evaluation**
Thank-you headline clear; contact info legible; generous whitespace.`,
    },
    {
      label: "Agenda slide",
      prompt: `### Design Challenge: Meeting Agenda Slide

**Objective**
List 4–5 agenda items with time boxes so attendees know what to expect.

**Agenda**

* **Title:** Product Strategy Review · H2 2026
* **Items:**
  1. Q2 recap (10 min)
  2. Roadmap priorities (20 min)
  3. Resource plan (15 min)
  4. Open Q&A (15 min)
* **Facilitator:** Meera Shah · Product

**Deliverable**

* One 16:9 agenda slide (1920 × 1080 px)

**Evaluation**
Agenda title prominent; items numbered with time estimates; scannable in 5 seconds.`,
    },
  ],
  business: [
    {
      label: "One-pager",
      prompt: `### Design Challenge: Company One-Pager

**Objective**
Fit company overview, value prop, and contact on one print-ready page for sales leave-behinds.

**One-Pager**

* **Company:** Northstar Labs
* **Headline:** Finance ops that scale with your SaaS
* **Value:** Auto-approvals · Real-time dashboards · SOC 2 compliant
* **Proof:** 500+ customers · $2.4M ARR
* **Contact:** priya@northstar.io · northstar.io

**Deliverable**

* One A4 one-pager (print-ready)

**Evaluation**
Headline and value prop scannable; proof adds credibility; contact impossible to miss.`,
    },
    {
      label: "Investor update",
      prompt: `### Design Challenge: Investor Update Cover

**Objective**
Frame a monthly investor update with period, three headline metrics, and sender credibility.

**Update**

* **Title:** June 2026 Investor Update
* **Metrics:** $620K revenue · 18% MoM growth · 42 new logos
* **Highlight:** Closed Series A extension
* **From:** Priya Nair, CEO · Northstar Labs

**Deliverable**

* One investor update cover (letter size)

**Evaluation**
Period and title clear; metrics prominent; professional investor tone.`,
    },
    {
      label: "Meeting agenda",
      prompt: `### Design Challenge: Client Meeting Agenda

**Objective**
Set expectations for a client workshop with objectives, agenda items, and attendees.

**Meeting**

* **Title:** Checkout Redesign Kickoff
* **Client:** Horizon Retail Group
* **Objectives:** Align on scope · Review research · Confirm timeline
* **Agenda:** Intro (15m) · Research readout (30m) · Next steps (15m)
* **Date:** Tuesday, 22 July 2026

**Deliverable**

* One meeting agenda page (A4)

**Evaluation**
Client name visible; objectives scannable; professional services tone.`,
    },
  ],
  events: [
    {
      label: "Workshop flyer",
      prompt: `### Design Challenge: Workshop Promotional Flyer

**Objective**
Promote a hands-on workshop with topic, instructor, date, venue, and register CTA.

**Workshop**

* **Title:** Design Systems in Practice
* **Instructor:** Meera Shah · Design Systems FM
* **Date:** Saturday, 20 September · 10 AM – 4 PM
* **Venue:** WeWork Koramangala, Bengaluru
* **CTA:** Register — seats limited to 30

**Deliverable**

* One workshop flyer (1080 × 1350 px)

**Evaluation**
Workshop title dominates; instructor adds credibility; date and venue unmistakable.`,
    },
    {
      label: "Conference badge",
      prompt: `### Design Challenge: Conference Badge Design

**Objective**
Design a badge template with event branding, attendee name zone, and role/company line.

**Badge**

* **Event:** Bengaluru Tech Week 2026
* **Attendee:** [Name]
* **Role:** Product Designer · Northstar Labs
* **Access:** Full pass · 12–14 October

**Deliverable**

* One badge template (4 × 3 in landscape)

**Evaluation**
Event branding prominent; name zone large; role line secondary but legible.`,
    },
  ],
  documentation: [
    {
      label: "SOP overview",
      prompt: `### Design Challenge: Standard Operating Procedure Cover

**Objective**
Create an SOP cover with procedure name, owner team, version, and last-updated date.

**SOP**

* **Title:** Invoice Approval Standard Operating Procedure
* **Owner:** Finance Operations
* **Version:** 3.2 · Last updated July 2026
* **Scope:** All AP invoices above ₹10,000

**Deliverable**

* One SOP cover page (A4)

**Evaluation**
Procedure name clear; version and date visible; internal documentation tone.`,
    },
    {
      label: "Onboarding guide",
      prompt: `### Design Challenge: Employee Onboarding Guide Cover

**Objective**
Welcome new hires with guide title, start date placeholder, and 4–5 section previews.

**Guide**

* **Title:** Welcome to Northstar — Your First 30 Days
* **Sections:** Tools setup · Team intro · Product overview · First project · Buddy program
* **HR contact:** people@northstar.io

**Deliverable**

* One onboarding guide cover (A4)

**Evaluation**
Welcoming tone; section previews scannable; HR contact easy to find.`,
    },
    {
      label: "API reference",
      prompt: `### Design Challenge: API Reference Card

**Objective**
Summarize one API endpoint with method, path, short description, and auth note.

**Endpoint**

* **Method:** POST /v1/invoices
* **Description:** Create a new invoice with line items and approver routing
* **Auth:** Bearer token · scope: invoices:write
* **Rate limit:** 100 req/min

**Deliverable**

* One API reference card (1200 × 627 px)

**Evaluation**
Method and path monospace-friendly; description one line; developer-trustworthy clarity.`,
    },
  ],
  hr_internal: [
    {
      label: "We're hiring",
      prompt: `### Design Challenge: Internal Hiring Banner

**Objective**
Design an internal banner employees will proudly share — open role headline, team culture hook, and a clear apply CTA.

**Role**

* **Title:** Senior Backend Engineer
* **Team:** Platform · Bengaluru hybrid
* **Hook:** Build the infra powering 2M daily transactions
* **Culture:** Own your services end-to-end · No ticket factories
* **CTA:** Refer a friend or apply at careers.northstar.io/platform

**Deliverable**

* One internal comms banner (1200 × 627 px)

**Evaluation**
Employee-friendly tone, scannable role details, and share-worthy visual polish.`,
    },
    {
      label: "Welcome aboard",
      prompt: `### Design Challenge: New Hire Welcome Card

**Objective**
Welcome a new teammate with warmth and practical first-day details they'll actually remember.

**Details**

* **Headline:** Welcome to the team, Ananya!
* **Role:** Product Marketing Manager · Growth
* **Start date:** Monday, 4 August 2026
* **Manager:** Meera Shah
* **First day:** Desk 14 · 10 AM kickoff · #team-growth Slack

**Deliverable**

* One internal welcome graphic (1080 × 1080 px)

**Evaluation**
Personal headline, friendly tone, and first-day info easy to screenshot.`,
    },
    {
      label: "All-hands recap",
      prompt: `### Design Challenge: All-Hands Recap Slide

**Objective**
Summarize the company all-hands in three crisp takeaways employees can skim after the meeting.

**Recap**

* **Title:** July All-Hands Highlights
* **Takeaway 1:** Q2 revenue beat plan by 12%
* **Takeaway 2:** New Singapore office opens in September
* **Takeaway 3:** Customer NPS climbed to 62

**Deliverable**

* One internal slide (16:9)

**Evaluation**
Three equal-weight bullets, professional internal comms tone, no dense paragraphs.`,
    },
  ],
  branding: [
    {
      label: "Brand announcement",
      prompt: `### Design Challenge: Brand Refresh Announcement

**Objective**
Announce a brand evolution with confidence — what changed, why it matters, and a premium visual tone.

**Announcement**

* **Headline:** Introducing the new Northstar
* **Subheading:** Same mission. Sharper story. Ready for our next chapter.
* **Changes:** Updated logo, refreshed palette, unified product voice
* **CTA:** Explore the brand guidelines

**Deliverable**

* One announcement graphic (1200 × 627 px)

**Evaluation**
Confident headline hierarchy, restrained copy, and brand mark given room to breathe.`,
    },
    {
      label: "Logo reveal",
      prompt: `### Design Challenge: Logo Reveal Post

**Objective**
Let a new or updated logo be the hero — minimal copy, centered layout, premium whitespace.

**Reveal**

* **Headline:** Meet our new mark
* **Subheading:** Designed for clarity at every size
* **Brand:** Northstar Labs

**Deliverable**

* One square reveal post (1080 × 1080 px)

**Evaluation**
Logo dominates the canvas; typography supports without competing.`,
    },
  ],
  product: [
    {
      label: "Feature release",
      prompt: `### Design Challenge: Feature Release Graphic

**Objective**
Announce what's new, why it matters, and leave room for a product screenshot or UI focal point.

**Release**

* **Headline:** Introducing Smart Approvals
* **Subheading:** Route invoices to the right approver automatically — no rules spreadsheet required
* **Version:** v4.2 · Available now
* **CTA:** See it in action

**Deliverable**

* One product marketing graphic (1200 × 627 px)

**Evaluation**
Benefit-led headline, UI-friendly layout zone, and developer-trustworthy clarity.`,
    },
    {
      label: "Changelog highlight",
      prompt: `### Design Challenge: Changelog Highlight Card

**Objective**
Highlight a release version with the top three improvements developers care about.

**Release**

* **Version:** v2.8.0
* **Improvement 1:** 40% faster webhook delivery
* **Improvement 2:** New /exports batch endpoint
* **Improvement 3:** Fixed timezone edge case in reports
* **CTA:** Read full changelog

**Deliverable**

* One changelog card (1080 × 1080 px)

**Evaluation**
Version number prominent, three scannable bullets, technical but approachable tone.`,
    },
  ],
  editorial: [
    {
      label: "Blog header",
      prompt: `### Design Challenge: Blog Article Header

**Objective**
Create an editorial header graphic that sets tone for a long-form article without giving away the full argument.

**Article**

* **Title:** Why Async Design Critiques Beat Real-Time Reviews
* **Category:** Design Ops
* **Author:** Arjun Desai · 8 min read
* **Publication:** Studio Meridian Journal

**Deliverable**

* One blog header (1200 × 627 px)

**Evaluation**
Serif-friendly title treatment, subtle category tag, and magazine-quality spacing.`,
    },
    {
      label: "Newsletter cover",
      prompt: `### Design Challenge: Newsletter Issue Cover

**Objective**
Design a newsletter issue cover with issue title, date, and one supporting line in a clean magazine feel.

**Issue**

* **Title:** The Alignment Issue
* **Date:** July 2026 · Issue 42
* **Supporting line:** Frameworks for remote teams that actually stick
* **Publication:** DesignOps Dispatch

**Deliverable**

* One newsletter cover (600 × 800 px portrait)

**Evaluation**
Issue title dominates, date is secondary, and layout feels editorial—not promotional.`,
    },
  ],
  commerce: [
    {
      label: "Sale banner",
      prompt: `### Design Challenge: E-Commerce Sale Banner

**Objective**
Drive conversions with a bold discount headline, sale dates, and an unmistakable shop-now CTA.

**Sale**

* **Headline:** Monsoon Sale — Up to 40% Off
* **Dates:** 15–22 July 2026
* **Categories:** Home · Kitchen · Outdoor
* **CTA:** Shop the sale

**Deliverable**

* One web banner (1200 × 400 px)

**Evaluation**
Discount pops immediately, dates are legible, and CTA contrasts strongly.`,
    },
    {
      label: "Product flyer",
      prompt: `### Design Challenge: Retail Product Flyer

**Objective**
Showcase one hero product with price, 2–3 benefits, and retail-ready layout suitable for print or PDF.

**Product**

* **Name:** AeroBrew Coffee Maker
* **Price:** ₹8,499 · Free shipping
* **Benefits:** 60-second brew · Self-clean cycle · 2-year warranty
* **CTA:** Available at select stores

**Deliverable**

* One A5 product flyer

**Evaluation**
Product is the visual hero, price is scannable, benefits use icons or bullets—not paragraphs.`,
    },
  ],
  print: [
    {
      label: "Event poster",
      prompt: `### Design Challenge: Print Event Poster

**Objective**
Design a high-contrast poster readable from a distance — large headline, date, venue, and minimal fine print.

**Event**

* **Title:** Bengaluru Tech Week 2026
* **Date:** 12–14 October
* **Venue:** Palace Grounds, Bengaluru
* **CTA:** Register at btw2026.in

**Deliverable**

* One A2 print poster (420 × 594 mm)

**Evaluation**
Headline readable at 3 metres, date/venue hierarchy clear, print-safe margins.`,
    },
    {
      label: "Roll-up banner",
      prompt: `### Design Challenge: Trade Show Roll-Up Banner

**Objective**
Create a vertical roll-up banner with company name, one value prop, and contact details for booth visitors.

**Banner**

* **Company:** Northstar Labs
* **Headline:** Finance ops that scale with your SaaS
* **Proof:** SOC 2 · 500+ customers · 14-day trial
* **Contact:** northstar.io · Booth B14

**Deliverable**

* One roll-up banner (850 × 2000 mm)

**Evaluation**
Top-third headline impact, minimal body copy, and URL legible from aisle distance.`,
    },
  ],
  personal: [
    {
      label: "Thank you card",
      prompt: `### Design Challenge: Personal Thank You Card

**Objective**
Design a warm thank-you card with a personal message and space for a handwritten signature line.

**Card**

* **Headline:** Thank you
* **Message:** Your kindness made our wedding day unforgettable. We're so grateful you celebrated with us.
* **Sign-off:** With love, Ananya & Rohan

**Deliverable**

* One folded thank-you card (5 × 7 in)

**Evaluation**
Elegant simplicity, readable message body, and signature line given breathing room.`,
    },
    {
      label: "Party invite",
      prompt: `### Design Challenge: Casual Party Invitation

**Objective**
Invite friends to a casual gathering with relaxed tone, clear date/address, and an easy RSVP line.

**Party**

* **Title:** Backyard BBQ at ours
* **Host:** Vikram & Meera
* **Date:** Saturday, 6 September · 6 PM onwards
* **Address:** 42 Palm Grove, Koramangala
* **RSVP:** Text Meera by 3 September — 98765 43210

**Deliverable**

* One invitation card (5 × 7 in)

**Evaluation**
Casual friendly tone, address easy to copy, RSVP deadline visible.`,
    },
  ],
  creator: [
    {
      label: "YouTube thumbnail",
      prompt: `### Design Challenge: YouTube Thumbnail Concept

**Objective**
Design a high-contrast thumbnail with a bold 3-word headline and a clear focal point (face or product).

**Video**

* **Title line:** Fix Slow Builds
* **Subtitle:** in under 10 minutes
* **Channel:** DevCraft with Arjun
* **Mood:** Energetic, high contrast, readable at small size

**Deliverable**

* One thumbnail (1280 × 720 px)

**Evaluation**
Three words max in headline, faces/product large, passes the phone-screen squint test.`,
    },
    {
      label: "Podcast cover",
      prompt: `### Design Challenge: Podcast Cover Art

**Objective**
Create square podcast artwork with strong typographic hierarchy for show name and episode theme.

**Show**

* **Name:** Design Systems FM
* **Episode theme:** Tokens in the Wild
* **Host:** Meera Shah
* **Tagline:** Weekly conversations on scalable UI

**Deliverable**

* One podcast cover (3000 × 3000 px square)

**Evaluation**
Show name readable at 55px app icon size; theme line secondary but legible.`,
    },
  ],
};

export function briefForArtifact(artifactId: string, fallbackLabel?: string): string {
  const template = ARTIFACT_BRIEF_TEMPLATES[artifactId];
  if (template) return template;
  return fallbackLabel
    ? `### Design Challenge: ${fallbackLabel}\n\nDescribe your ${fallbackLabel.toLowerCase()} with objective, key details, deliverable size, and evaluation criteria.`
    : "Describe what you're making — objective, key details, deliverable size, and how you'll judge success.";
}
