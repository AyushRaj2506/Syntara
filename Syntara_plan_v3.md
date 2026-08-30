# Syntara --- Master Implementation Plan v3

## Functional Repair + Genuine UI/UX Redesign + P2P File Sharing

**Product:** Syntara\
**Tagline:** Learn together. Focus together.\
**Stack:** React + Vite + JavaScript, Node.js + Express, Socket.IO\
**Database:** None\
**Language:** Modern ES6+ JavaScript / JSX --- **do not migrate to
TypeScript**

------------------------------------------------------------------------

## 1. Objective

This is the authoritative plan for the next Syntara implementation pass.

The existing application has substantial functionality, but three areas
still require major work:

1.  Important interactions and form behavior must be reliable.
2.  File sharing must become a real peer-to-peer experience rather than
    a basic upload feature.
3.  The visual and interaction design must be substantially redesigned.
    Small CSS tweaks do not count.

The target is:

> **Minimalist + subtle glassmorphism + soft neo-brutalist accents +
> polished interaction design + Syntara's own identity.**

ShadowRoom is only a reference for interaction quality. Do not clone its
branding or visual design.

------------------------------------------------------------------------

## 2. Non-Negotiable Working Method

For every bug and feature:

``` text
REPRODUCE → INSPECT → IDENTIFY ROOT CAUSE → IMPLEMENT → TEST → VERIFY
```

A feature is not complete because a component, button, socket event,
animation, or CSS rule exists.

Actual browser behavior is the source of truth.

Do not hide failures or claim completion without testing.

------------------------------------------------------------------------

## 3. Product Scope

### Study Room

Contains:

-   Participants
-   Chat
-   Shared Notes
-   Whiteboard
-   Optional Code workspace
-   Focus sessions
-   Study Goals
-   Quiz

### Chat Room

Contains only:

-   Participants
-   Chat
-   File sharing

Do not show Study Room tools in Chat Room.

No accounts and no database. Rooms remain ephemeral and are stored in
server memory.

Future video calling and synchronized YouTube watching are explicitly
deferred.

------------------------------------------------------------------------

## 4. Technology Constraints

Keep:

-   React
-   Vite
-   JavaScript / JSX
-   Node.js
-   Express
-   Socket.IO
-   Tiptap if already used
-   Canvas for whiteboard

Do not migrate to TypeScript.

Do not introduce a database.

Do not introduce authentication.

Do not rewrite working architecture unnecessarily.

------------------------------------------------------------------------

# 5. CRITICAL BUG --- CREATE ROOM FOCUS LOSS

The Room Name and Display Name inputs must never lose focus when another
form field changes.

Test this in BOTH Study Room and Chat Room.

While typing continuously, change:

-   room type
-   subject
-   duration
-   participant count

The cursor must remain active.

### Root-cause requirement

Do not use repeated `focus()` calls as a workaround.

Inspect:

-   React keys
-   conditional rendering
-   component identity
-   nested component declarations
-   parent rerenders
-   state ownership
-   modal lifecycle
-   form subtree recreation

Inputs must remain mounted and stable.

### Acceptance test

Type a long room name without clicking again. Change every other field
one by one and continue typing after each change.

If focus is lost, the bug is not fixed.

------------------------------------------------------------------------

# 6. CREATE ROOM FLOW

Room creation must never happen automatically.

Correct flow:

``` text
Create Room
↓
Choose Room Type
↓
Complete Form
↓
Validate
↓
Explicit Create Room click
↓
Create
↓
Confirmation
↓
Enter Room
```

Changing a field must never submit the form.

Required states:

-   idle
-   editing
-   validation error
-   submitting
-   success
-   failure

Confirmation:

``` text
ROOM CREATED

Room Name

ROOM CODE

[ Copy Code ] [ Enter Room → ]
```

Copy:

``` text
Copy → Copied ✓ → Copy
```

------------------------------------------------------------------------

# 7. CONNECTION STATE

Use actual Socket.IO lifecycle state.

States:

``` text
CONNECTING
CONNECTED
RECONNECTING
DISCONNECTED
```

Never infer connection state from participant count.

Do not display contradictory states such as:

``` text
1 ONLINE
Disconnected
```

when the socket is connected.

Test disconnect, reconnect, refresh, and room re-entry.

------------------------------------------------------------------------

# 8. P2P FILE SHARING --- PRIMARY ARCHITECTURE

The preferred final architecture is:

``` text
                 Socket.IO
              signaling only
                  /                    /                     ↓       ↓
           Browser A   Browser B
                │       ↑
                └───────┘
                 WebRTC
               DataChannel
                    │
               file chunks
```

Socket.IO handles:

-   peer discovery
-   SDP signaling
-   ICE signaling
-   metadata
-   transfer state metadata

Actual file bytes should use WebRTC DataChannel.

Do not send large binary files through Socket.IO.

------------------------------------------------------------------------

# 9. LARGE FILES

Do not impose arbitrary application limits such as 50 MB or 250 MB.

This does not mean claiming infinite physical capacity.

Real limitations include:

-   disk space
-   network bandwidth
-   browser behavior
-   WebRTC limits
-   connection duration
-   mobile restrictions
-   TURN relay bandwidth

Document practical limitations honestly.

------------------------------------------------------------------------

# 10. FILE CHUNKING

Use incremental chunking with `File.slice()` or equivalent.

Starting chunk size:

``` text
16 KB
```

Tune after testing if needed.

Respect:

``` text
RTCDataChannel.bufferedAmount
```

Implement backpressure:

``` text
buffer low → send
buffer high → pause
buffer low → resume
```

Never load a huge file entirely into React state.

------------------------------------------------------------------------

# 11. WEBRTC NETWORKING

Use STUN for normal peer discovery.

Support TURN as a relay fallback when direct connectivity fails.

Conceptually:

``` text
A ───────── B
     P2P

A ─── TURN ─── B
      relay
```

The user should not need to understand this.

The UI should simply communicate:

-   Connecting
-   Connected
-   Transfer progress
-   Failed
-   Retry

------------------------------------------------------------------------

# 12. MULTI-PARTICIPANT FILE SHARING

Rooms can have multiple users.

Handle:

-   peer creation
-   peer closure
-   participant join
-   participant leave
-   sender disconnect
-   receiver disconnect
-   reconnect
-   cancellation
-   failure

Do not assume only two participants.

Do not implement complex peer-assisted distribution unless required.

------------------------------------------------------------------------

# 13. FILE TRANSFER STATE MACHINE

Use explicit states:

``` text
IDLE
SELECTED
PREPARING
CONNECTING
SENDING
PROGRESS
SENT
RECEIVING
RECEIVED
FAILED
CANCELLED
```

The UI must visually correspond to these states.

------------------------------------------------------------------------

# 14. FILE SHARING UX

A file must behave like a conversation object.

Flow:

``` text
Select
↓
Attachment Preview
↓
User clicks Send
↓
Preparing
↓
Connecting
↓
Sending
↓
Progress
↓
Sent
```

Receiver:

``` text
Incoming File
↓
Receiving
↓
Progress
↓
Received
↓
Open / Download
```

------------------------------------------------------------------------

# 15. FILE UI

### Attachment preview

Show:

-   icon/thumbnail
-   filename
-   size
-   remove
-   send

Do not transmit merely because the file was selected.

### Sending

Show:

-   filename
-   size
-   status
-   progress

### Sent

Show:

``` text
✓ Sent
```

### Receiving

Show:

``` text
Receiving... 67%
```

### Received

Show:

``` text
✓ Received

Open    Download
```

### Failed

Show:

``` text
Transfer failed
Retry
```

For images, use previews.

For videos, show thumbnail/player controls without unexpected autoplay.

------------------------------------------------------------------------

# 16. CHAT ROOM

Chat Room should be intentionally designed around:

**Conversation + Files + Participants**

It should feel lightweight, social, temporary, and polished.

Do not make it a stripped-down Study Room.

------------------------------------------------------------------------

# 17. CHAT UX

Messages should:

-   appear immediately for the sender
-   have clear identity
-   show readable timestamps
-   group consecutive messages where appropriate
-   enter naturally
-   support unread state
-   support typing indication

If the user is at the bottom, new messages keep them at the bottom.

If they are reading older messages, do not force-scroll them.

Show a `New messages` indicator.

------------------------------------------------------------------------

# 18. CHAT COMPOSER

Use one cohesive composer containing:

-   attachment
-   emoji
-   message input
-   send

States:

-   idle
-   focused
-   typing
-   attachment selected
-   sending
-   disabled

Multiline input should auto-grow to a sensible maximum height.

------------------------------------------------------------------------

# 19. STUDY ROOM

Redesign the Study Room as one coherent workspace rather than a
dashboard of unrelated cards.

Desktop hierarchy:

``` text
HEADER
  ↓
PRIMARY WORKSPACE
  ↓
CHAT / PARTICIPANTS
  ↓
CONTEXTUAL STUDY TOOLS
```

The central workspace should visually dominate.

Do not make every feature a floating card.

------------------------------------------------------------------------

# 20. WORKSPACE NAVIGATION

Views:

-   Notes
-   Whiteboard
-   Code

Notes and Whiteboard are the default study tools.

Code is optional.

Switching views must not recreate the whole room.

Use a fast, perceptible transition:

``` text
180–280ms
```

Do not use a 0ms hard switch.

Do not use long cinematic transitions.

------------------------------------------------------------------------

# 21. NOTES

Notes should feel like a focused collaborative document.

Use Tiptap if already present.

Requirements:

-   stable editor instance
-   collaborative synchronization
-   editing presence
-   strong typography
-   comfortable reading width
-   compact toolbar
-   clear active states

Clear Notes:

``` text
Clear
↓
Confirm
↓
Immediate local clear
↓
Synchronize
↓
Other users clear
```

Cursor must remain usable after clearing.

------------------------------------------------------------------------

# 22. WHITEBOARD

Drawing must render immediately on the local canvas.

Network synchronization must be separate.

Toolbar:

-   Pen
-   Color
-   Size
-   Eraser
-   Undo
-   Clear

Clear:

``` text
Clear
↓
Confirm
↓
Immediate local clear
↓
Server state cleared
↓
Remote participants clear
```

Reconnect must not restore stale strokes.

------------------------------------------------------------------------

# 23. CODE WORKSPACE

Code is optional.

Languages:

-   Python 3
-   C++20

Controls:

-   Language
-   Run
-   Copy
-   Clear

Keep it a lightweight study coding tool, not a VS Code clone.

------------------------------------------------------------------------

# 24. CODE EXECUTION

Never execute arbitrary user code directly inside the Node.js
application process.

Python may use Pyodide/WebAssembly.

C++ may use a safe remote sandbox such as Wandbox.

Required states:

``` text
IDLE
RUNNING
SUCCESS
COMPILE_ERROR
RUNTIME_ERROR
TIMEOUT
```

Provide stdout, stderr, compilation errors and runtime errors.

Execution must not freeze the UI.

------------------------------------------------------------------------

# 25. FOCUS

States:

``` text
READY
STARTING
FOCUSING
BREAK
COMPLETED
```

Use server-authoritative timestamps.

Keep the experience calm.

Do not make the timer visually overwhelming.

------------------------------------------------------------------------

# 26. GOALS

Goal completion:

``` text
unchecked
↓
checked
↓
strikethrough
↓
subtle completion feedback
```

Do not use confetti or excessive gamification.

------------------------------------------------------------------------

# 27. QUIZ

Use smooth transitions between:

``` text
QUESTION
→ ANSWER SELECTED
→ SUBMITTED
→ REVEAL
→ NEXT
→ LEADERBOARD
```

Answer feedback should be immediate.

------------------------------------------------------------------------

# 28. VISUAL IDENTITY

Target:

``` text
70% Minimalist
20% Subtle Glassmorphism
10% Soft Neo-Brutalist accents
```

Syntara should feel:

-   professional
-   calm
-   focused
-   modern
-   distinctive
-   alive

It should NOT feel:

-   generic
-   AI-generated
-   template-based
-   over-designed
-   like Discord
-   like Notion
-   like a crypto dashboard
-   like a university portal
-   like a ShadowRoom clone

------------------------------------------------------------------------

# 29. VISUAL HIERARCHY

Use four meaningful levels:

1.  Background
2.  Primary workspace
3.  Supporting surfaces
4.  Floating/contextual surfaces

Avoid:

``` text
card inside card inside glass card
```

Not every element needs a border, shadow, blur or background.

Whitespace must be intentional.

------------------------------------------------------------------------

# 30. GLASSMORPHISM

Use glass selectively for:

-   modals
-   floating controls
-   contextual overlays
-   selected navigation
-   product preview

Avoid glass everywhere and avoid glass-on-glass.

------------------------------------------------------------------------

# 31. NEO-BRUTALIST ACCENTS

Use sparingly for:

-   primary CTA
-   important actions
-   selected states
-   occasional deliberate offset shadow

Do not make every component neo-brutalist.

------------------------------------------------------------------------

# 32. COLOR

Warm amber is Syntara's signature accent.

Use it mainly for:

-   primary actions
-   focus
-   selected states
-   important feedback

Avoid generic purple/blue/cyan AI gradients.

------------------------------------------------------------------------

# 33. TYPOGRAPHY

Use a professional modern sans-serif system.

Preferred starting combination:

-   Plus Jakarta Sans
-   Inter

Define:

-   heading scale
-   body scale
-   labels
-   captions
-   weights
-   line heights
-   letter spacing

Typography must create hierarchy.

------------------------------------------------------------------------

# 34. DARK THEME

Use:

-   deep near-black background
-   layered surfaces
-   soft primary text
-   muted secondary text
-   subtle borders
-   warm amber accent

Avoid pure black everywhere.

------------------------------------------------------------------------

# 35. LIGHT THEME

Do NOT simply invert dark mode.

Use:

-   warm off-white background
-   white/soft surfaces
-   dark primary text
-   muted secondary text
-   subtle borders
-   warm amber accent

Light mode must be designed intentionally and feel as polished as dark
mode.

------------------------------------------------------------------------

# 36. THEME TOGGLE

Provide a polished Sun/Moon toggle.

Requirements:

-   instant state feedback
-   no reload
-   localStorage persistence
-   no incorrect-theme flash on startup
-   all components work in both themes

Audit every:

-   modal
-   dropdown
-   button
-   input
-   chat
-   file card
-   editor
-   whiteboard toolbar
-   toast
-   connection state
-   empty state
-   error state

------------------------------------------------------------------------

# 37. MOTION PHILOSOPHY

The target is:

> **Alive, not busy.**

Animation should communicate:

-   state change
-   feedback
-   progress
-   continuity
-   hierarchy
-   confirmation

Do not add animation merely to make the application "animated."

------------------------------------------------------------------------

# 38. MOTION TIMING

Use:

``` text
Micro:     100–180ms
Standard:  180–300ms
Large:     300–500ms
Ambient:   several seconds
```

Prefer transform and opacity.

Avoid unnecessary layout animation.

Use consistent easing.

------------------------------------------------------------------------

# 39. LANDING PAGE

Do not simply add a fade-in to the existing landing page.

Recompose it.

Hierarchy:

``` text
Brand
↓
Headline
↓
Description
↓
Actions
↓
Product Preview
↓
Supporting information
```

Avoid:

-   giant gradients
-   random blobs
-   stock illustrations
-   particle backgrounds
-   fake 3D
-   excessive cards
-   generic AI landing-page patterns

------------------------------------------------------------------------

# 40. LANDING PAGE ACTIVITY

The product preview should feel alive.

Subtle simulated activity can include:

-   participant status
-   chat message
-   typing indicator
-   focus timer
-   note activity

Activity must be slow and believable.

------------------------------------------------------------------------

# 41. LANDING PAGE MOTION

Use choreography:

``` text
brand
↓
headline
↓
supporting copy
↓
CTA
↓
product preview
↓
subtle internal activity
```

Do not make everything move simultaneously.

------------------------------------------------------------------------

# 42. CREATE ROOM VISUAL DESIGN

Create Room should feel like a deliberate product flow, not a generic
form.

Room type:

``` text
Study Room
Chat Room
```

Selection should provide:

-   active visual state
-   concise description
-   smooth transition
-   no form remount

Validation should be inline.

Loading and success should be visually clear.

------------------------------------------------------------------------

# 43. ROOM ENTRY

Avoid hard screen replacement.

Use subtle continuity:

``` text
Create
↓
Confirmation
↓
Room environment
↓
Workspace settles
```

Do not use dramatic zooms.

------------------------------------------------------------------------

# 44. MODALS

Opening:

``` text
backdrop fade
+
modal opacity
+
small scale/translate
```

Closing reverses it.

No bounce.

------------------------------------------------------------------------

# 45. MICRO-INTERACTIONS

Define polished states for:

-   buttons
-   inputs
-   tabs
-   toggles
-   copy
-   send
-   upload
-   download
-   clear
-   undo
-   run
-   focus
-   goals
-   quiz
-   room creation
-   room joining
-   connection

Examples:

``` text
Copy → Copied ✓
Run → Running... → Complete
Connecting → Connected
```

------------------------------------------------------------------------

# 46. EMPTY STATES

Use intentional empty states.

Chat:

> Start the conversation.

Notes:

> Start writing together.

Whiteboard:

> Start drawing together.

Files:

> No files shared yet.

Goals:

> No goals yet.

Do not leave unexplained dead space.

------------------------------------------------------------------------

# 47. LOADING STATES

Communicate asynchronous actions:

-   Creating room...
-   Joining...
-   Connecting...
-   Preparing...
-   Sending...
-   Receiving...
-   Running...

Never leave the user wondering whether the action happened.

------------------------------------------------------------------------

# 48. ERROR STATES

Errors should be understandable and recoverable.

Examples:

``` text
Could not join room.
[ Try Again ]
```

``` text
Transfer failed.
[ Retry ]
```

``` text
Connection lost.
Reconnecting...
```

Do not expose stack traces.

------------------------------------------------------------------------

# 49. RESPONSIVE DESIGN

Test:

``` text
1440×900
1280×800
768×1024
390×844
```

Desktop:

-   three-column Study Room where appropriate

Tablet:

-   adaptive panels/drawers

Mobile:

-   focused views
-   bottom navigation where useful
-   no compressed desktop layout

Minimum touch target:

``` text
44×44px
```

------------------------------------------------------------------------

# 50. ACCESSIBILITY

Maintain:

-   semantic HTML
-   keyboard navigation
-   visible focus
-   ARIA where necessary
-   sufficient contrast
-   accessible dialogs
-   accessible tabs
-   reduced-motion support
-   44px touch targets

------------------------------------------------------------------------

# 51. PERFORMANCE

Avoid:

-   unnecessary React remounts
-   excessive Socket.IO traffic
-   unthrottled whiteboard events
-   huge React state
-   animation-induced layout thrashing
-   excessive blur/filter effects

Whiteboard, chat and file transfers must remain responsive.

------------------------------------------------------------------------

# 52. DESIGN SYSTEM

Create centralized tokens for:

-   colors
-   surfaces
-   typography
-   spacing
-   radii
-   borders
-   shadows
-   motion
-   z-index
-   breakpoints

Do not scatter arbitrary visual values throughout the project.

Reusable primitives should include where appropriate:

-   Button
-   IconButton
-   Input
-   Select
-   Modal
-   Toast
-   Avatar
-   Badge
-   Tabs
-   Tooltip
-   FileCard
-   Progress
-   ConnectionIndicator

------------------------------------------------------------------------

# 53. VISUAL AUDIT BEFORE IMPLEMENTATION

Before redesigning a screen, inspect the current running version.

For each major screen identify:

1.  Current composition problem.
2.  Current hierarchy problem.
3.  Current interaction problem.
4.  Desired composition.
5.  Desired states.
6.  Desired motion.
7.  Responsive behavior.

Screens:

-   Landing
-   Create Room
-   Join
-   Study Room
-   Chat
-   Chat Room
-   Notes
-   Whiteboard
-   Code
-   Focus
-   Goals
-   Quiz
-   File states
-   Light mode
-   Dark mode

------------------------------------------------------------------------

# 54. IMPLEMENTATION ORDER

## Phase 0

Audit current application.

## Phase 1

Fix Create Room focus architecture.

## Phase 2

Fix connection state.

## Phase 3

Fix Notes.

## Phase 4

Fix Whiteboard.

## Phase 5

Fix Chat.

## Phase 6

Implement P2P WebRTC file transfer.

## Phase 7

Implement complete file-transfer UX.

## Phase 8

Verify secure code execution.

## Phase 9

Build design tokens.

## Phase 10

Redesign core components.

## Phase 11

Redesign Landing.

## Phase 12

Redesign Create/Join.

## Phase 13

Redesign Study Room.

## Phase 14

Redesign Chat Room.

## Phase 15

Redesign Notes/Whiteboard/Code.

## Phase 16

Redesign Focus/Goals/Quiz.

## Phase 17

Finish light/dark themes.

## Phase 18

Application-wide motion pass.

## Phase 19

Responsive pass.

## Phase 20

Accessibility pass.

## Phase 21

Performance pass.

## Phase 22

Final QA.

------------------------------------------------------------------------

# 55. Static UI Before Realtime

For every major screen:

1.  Build the visual layout using realistic mock data.
2.  Verify hierarchy.
3.  Verify spacing.
4.  Verify dark/light.
5.  Verify responsive behavior.
6.  Verify interactions.
7.  Verify animation.
8.  Only then wire realtime behavior.
9.  Re-test visual quality after realtime integration.

A realtime feature that works but looks poor is not complete.

------------------------------------------------------------------------

# 56. What Does NOT Count as a Redesign

The following alone are NOT a redesign:

-   changing colors
-   changing border radius
-   adding shadows
-   adding blur
-   adding one fade
-   adding hover scale
-   adding a progress bar
-   changing font size
-   rearranging buttons

A real redesign changes:

-   composition
-   hierarchy
-   information density
-   interaction model
-   state design
-   motion language
-   responsiveness
-   visual identity

The new UI should be immediately distinguishable from the old UI.

------------------------------------------------------------------------

# 57. What Does NOT Count as Animation

These alone are insufficient:

``` css
transition: all .2s;
```

or:

``` css
animation: fadeIn .3s;
```

Every meaningful animation must define:

-   trigger
-   initial state
-   final state
-   duration
-   easing
-   purpose
-   interruption behavior
-   reduced-motion behavior

------------------------------------------------------------------------

# 58. Anti-AI Design Checklist

Avoid:

-   generic purple gradients
-   random blobs
-   excessive rounded cards
-   excessive glass
-   meaningless particles
-   decorative floating shapes
-   excessive glow
-   giant empty hero areas
-   card-heavy dashboards
-   random icon decoration

Every decorative element must have a purpose.

------------------------------------------------------------------------

# 59. Visual Quality Gate

Before marking a screen complete:

### Composition

-   hierarchy is obvious
-   whitespace is intentional
-   controls are discoverable
-   no unnecessary panels

### Typography

-   clear hierarchy
-   readable line height
-   sensible labels

### Surfaces

-   glass is restrained
-   cards are justified
-   shadows are subtle

### Interaction

-   actions give immediate feedback
-   loading is visible
-   success is clear
-   errors are recoverable

### Motion

-   transitions are purposeful
-   animations are fast enough
-   animations are not distracting
-   reduced motion works

### Theme

-   light mode is intentionally designed
-   dark mode is intentionally designed
-   contrast remains good

------------------------------------------------------------------------

# 60. Browser QA

Use at least two independent browser sessions.

Test:

-   Study Room creation
-   Chat Room creation
-   continuous typing
-   room joining
-   participants
-   chat
-   notes
-   notes clear
-   whiteboard
-   whiteboard clear
-   focus
-   goals
-   quiz
-   P2P file transfer
-   file receiving
-   file retry
-   reconnect
-   code execution
-   theme switching

------------------------------------------------------------------------

# 61. File Transfer QA

Test:

-   4 KB file
-   PDF
-   image
-   video
-   document
-   archive
-   medium file
-   large practical test file

Test:

-   sender disconnect
-   receiver disconnect
-   reconnect
-   failed negotiation
-   cancelled transfer
-   retry

Verify that files are not placed inside Socket.IO payloads or React
state.

------------------------------------------------------------------------

# 62. Form QA

For BOTH room types:

Type continuously into:

-   Room Name
-   Display Name

While changing:

-   room type
-   subject
-   duration
-   participant count

No focus loss.

No input reset.

No accidental submission.

------------------------------------------------------------------------

# 63. Final Definition of Done

## Functional

-   [ ] Study Room creation works
-   [ ] Chat Room creation works
-   [ ] No input loses focus
-   [ ] No premature room creation
-   [ ] Join works
-   [ ] Connection state is accurate
-   [ ] Chat works
-   [ ] Notes work
-   [ ] Clear Notes works
-   [ ] Whiteboard works
-   [ ] Clear Whiteboard works
-   [ ] Whiteboard drawing is immediate
-   [ ] Python execution works safely
-   [ ] C++ execution works safely
-   [ ] Output works
-   [ ] Focus works
-   [ ] Goals work
-   [ ] Quiz works
-   [ ] P2P file sending works
-   [ ] P2P file receiving works
-   [ ] Progress works
-   [ ] Completion works
-   [ ] Failure/retry works
-   [ ] No arbitrary 50MB/250MB application cap
-   [ ] Reconnection works
-   [ ] Theme switching works
-   [ ] Theme persistence works

## Visual

-   [ ] Landing is substantially redesigned
-   [ ] Create Room is substantially redesigned
-   [ ] Study Room is substantially redesigned
-   [ ] Chat Room is substantially redesigned
-   [ ] Chat is substantially redesigned
-   [ ] File-transfer UX is polished
-   [ ] Notes are polished
-   [ ] Whiteboard is polished
-   [ ] Code is polished
-   [ ] Focus is polished
-   [ ] Goals are polished
-   [ ] Quiz is polished
-   [ ] Dark mode is intentionally designed
-   [ ] Light mode is intentionally designed
-   [ ] Animations are purposeful
-   [ ] Transitions are smooth
-   [ ] Empty states are intentional
-   [ ] Loading states are intentional
-   [ ] Error states are intentional
-   [ ] Mobile is intentionally designed
-   [ ] No obvious AI/template appearance

------------------------------------------------------------------------

# 64. Final Reporting

At completion, report only what was actually verified.

Include:

### Completed

Actually tested features.

### Failed / Partially Working

Anything that did not pass.

### Known Limitations

Browser, network, TURN, large-file and execution-service limitations.

### Browser Tests

Actual sessions and viewports.

### Visual QA

Themes and screen sizes inspected.

### Files Changed

Major files.

### Dependencies Added

Every new dependency and reason.

Never report "complete" merely because the build succeeds.

------------------------------------------------------------------------

# 65. Final Product Principle

Syntara should not feel like a collection of pages.

It should feel like a living collaborative environment.

The desired interaction loop is:

``` text
USER ACTION
    ↓
IMMEDIATE FEEDBACK
    ↓
STATE CHANGE
    ↓
SMOOTH TRANSITION
    ↓
COMPLETION
```

Examples:

``` text
Send message
→ immediate message
→ subtle entrance
→ conversation updates
```

``` text
Send file
→ attachment preview
→ preparing
→ transfer
→ progress
→ sent
→ receiver gets file
→ received
→ Open / Download
```

``` text
Switch workspace
→ current view exits subtly
→ new view enters
→ surrounding workspace remains stable
```

``` text
Switch theme
→ surfaces transition
→ text transitions
→ controls transition
→ new theme settles
```

The final quality bar is:

> **Syntara should feel alive, responsive, polished, calm, professional
> and distinctly its own.**

If the result still feels like the old interface with a few new shadows,
transitions and colors, the redesign is not complete.
