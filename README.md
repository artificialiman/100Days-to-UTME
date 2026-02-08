# 100Days-to-UTME
By Grantapp.edu.ai


# GrantApp AI - Architecture & Design System

## 🎯 Core Philosophy
**"Mature design, teenage engagement, professional execution"** - A JAMB prep platform that respects users' intelligence while providing engaging, modern UX.

## 📁 File Structure
```
grantapp_ai/
├── styles.css          # Complete design system with all effects
├── app.js              # Core JavaScript with proper error handling
├── index.html          # Landing page (stream selection)
├── [stream]_clusters.html      # Stream-specific cluster selection
├── practice_[cluster].html     # Individual subject tests
└── README.md           # This file
```

## 🎨 Design Principles

### 1. Visual Language
- **Color Palette**: Black/White/Gold (#D4AF37) as primary
- **Typography**: Inter (primary) + Playfair Display (luxury accents)
- **Elevation**: Layered shadows with depth perception
- **Motion**: Subtle, purposeful animations (250-400ms durations)

### 2. Interaction Patterns
- **Timers**: Draggable on landing, fixed on quiz pages
- **Loading**: Skeleton screens with shimmer effects
- **Feedback**: Articulate CSS notifications (no "AI slop")
- **Transitions**: Smooth state changes with proper choreography

### 3. User Experience Flow
```
Landing → Stream Selection → Cluster Selection → Practice Test
         (movable timer)     (progress tracking)  (fixed timer)
```

## ⚙️ Technical Architecture

### Timer System
- **Landing Page**: Draggable widget, position saved to localStorage
- **Quiz Pages**: Fixed position in navigation, 15-minute countdown
- **Visual States**: Green (>10m), Orange (5-10m), Red (<5m) with pulse

### Data Management
- **Placeholders**: Use `[COUNT]`, `[PERCENTAGE]` templates (NO hardcoded fake stats)
- **State Persistence**: localStorage for positions/selections
- **Offline First**: Hardcoded clusters for reliability

### Error Handling
- Graceful fallbacks for missing features
- No breaking on back button navigation
- Proper loading state management

## 🚫 Anti-Patterns to Avoid
1. **NO** "AI slop" generic designs
2. **NO** hardcoded fake statistics
3. **NO** broken back button behavior
4. **NO** inaccessible color contrasts
5. **NO** jarring transitions or excessive animations

## ✅ What's Implemented

### Core Components
- [x] Draggable timer widget with localStorage persistence
- [x] Professional footer with WhatsApp/contact/social
- [x] Stream selection cards (Science/Art/Commerce)
- [x] Cluster selection system
- [x] Loading overlay with skeleton screens
- [x] Responsive grid system
- [x] Proper CSS custom properties
- [x] Error-bound JavaScript

### Visual Effects
- [x] Card hover with elevation and accent borders
- [x] Timer pulse animations for urgency
- [x] Shimmer loading skeletons
- [x] Gradient text effects for emphasis
- [x] Smooth transitions (cubic-bezier timing)

## 🚧 What Remains

### Pages to Create
1. `science_clusters.html` - Math/Eng/Phy/Chem + Bio/Eng/Phy/Chem
2. `art_clusters.html` - Eng/Lit/Gov/CRS (with expansion markers)
3. `commercial_clusters.html` - Three commercial combinations
4. `practice_[cluster].html` - Individual test pages (15-minute timer)

### Features to Implement
- Quiz question logic (use original JAMB questions)
- Score tracking and analytics
- Progress persistence across sessions
- Print styles for study materials

## 🔧 Development Guidelines

### CSS Rules
- Use custom properties from `:root`
- Mobile-first responsive design
- BEM-like naming for complex components
- Hardware-accelerated animations only

### JavaScript Standards
- Class-based architecture with proper `this` binding
- Feature detection before usage
- Error boundaries around critical operations
- Clean event listener management

### HTML Semantics
- Proper ARIA labels for interactive elements
- Semantic sectioning elements
- Accessibility-first approach
- Progressive enhancement

## 🎯 Teenage Engagement Features
1. **Visual Urgency**: Timer creates exam-pressure simulation
2. **Interactive Elements**: Draggable components, hover effects
3. **Progress Tracking**: Clear visual progress through steps
4. **Achievement Markers**: Badges and status indicators planned
5. **Modern Aesthetics**: Feels like premium apps they use daily

## 📱 Responsive Behavior
- **Mobile**: Single column, simplified interactions
- **Tablet**: Two-column grids where appropriate
- **Desktop**: Full three-column layouts with enhanced effects
- **Touch**: Optimized for both mouse and touch interactions

## 🔄 State Management
```
localStorage:
  grantappTimerPosition: {x, y}
  selectedStream: 'science'|'art'|'commercial'
  selectedCluster: string
  grantappLoading: boolean
```

## 🚀 Deployment Notes
- Static files only (no CORS issues)
- Works offline after initial load
- Can be deployed to GitHub Pages, Netlify, Vercel
- No build step required

---

**Maintained by**: GrantApp AI Team  
**Philosophy**: "Professional tools shouldn't look amateurish"  
**Target**: Nigerian JAMB candidates (teenagers needing serious prep)
