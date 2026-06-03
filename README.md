# RevMind: AI-Powered Motorcycle Modification Assistant

## Overview

RevMind is an AI-powered motorcycle modification assistant designed specifically for Filipino riders. The system helps users plan motorcycle upgrades based on their motorcycle model, budget, riding style, goals, and existing modifications.

Unlike traditional motorcycle forums or social media groups, RevMind provides structured recommendations, performance predictions, and mechanic-style guidance in a single platform.

**Created by:** Jonathan Charles N. Rugayan
**Course:** Analytics 4

---

## Features

### Personalized Modification Plans

Generate motorcycle upgrade plans tailored to:

* Motorcycle model
* Manufacturing year
* Current mileage
* Budget (PHP)
* Riding goals
* Riding style
* Existing modifications

### AI-Powered Mechanic Chat

Ask motorcycle-related questions and receive mechanic-style advice, including:

* Upgrade recommendations
* Installation guidance
* Maintenance tips
* Performance improvement suggestions

### Performance Comparison

Compare:

* Stock motorcycle setup
* Current setup
* Predicted upgraded build

### Smart Build Sheet

Create a structured list of recommended parts that can be used for:

* Shopping
* Mechanic consultations
* Upgrade planning

### Offline Fallback System

When API keys are unavailable, RevMind automatically generates recommendations using built-in rule-based logic.

### Theme Support

* Light Mode
* Dark Mode

### Persistent Storage

User data is stored locally using browser localStorage:

* Rider profile
* Chat history
* Modification plans
* Cart items
* Application settings

---

## Problem Statement

Motorcycle riders often face challenges when modifying their motorcycles:

* Too many parts and brands available at different price points
* Difficulty determining compatibility with specific motorcycles
* Unclear performance gains relative to budget
* Conflicting advice across forums, social media, and shops
* Lack of structured upgrade planning

RevMind addresses these issues by generating organized and budget-aware modification plans with AI-assisted guidance.

---

## Technology Stack

| Layer             | Technology                         |
| ----------------- | ---------------------------------- |
| Frontend          | React 18, TypeScript               |
| Build Tool        | Vite                               |
| Styling           | Tailwind CSS, Custom CSS Variables |
| AI Chat Assistant | Google Gemini API                  |
| AI Planning Agent | Groq API                           |
| API Format        | OpenAI-Compatible Chat Completions |
| Storage           | Browser localStorage               |
| Deployment        | Local Development Server           |

---

## System Architecture

```text
USER (Rider Profile)
│
├── Motorcycle Model
├── Year
├── Mileage
├── Budget
├── Goal
└── Riding Style
        │
        ▼
 ┌─────────────────┐
 │   Run Agent     │
 │   (Groq API)    │
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ Mechanic Chat   │
 │ (Gemini API)    │
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ Agent Plan      │
 │ Engine          │
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ React UI        │
 │ RevMind         │
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ localStorage    │
 └─────────────────┘
```

### Architecture Highlights

* Dual-provider AI design
* Groq generates structured modification plans
* Gemini handles conversational mechanic support
* Client-side architecture with no backend server
* Hybrid AI and rule-based recommendation system
* Local data persistence through browser storage

---

## Demo Workflow

1. Enter rider profile information

   * Example: Yamaha Aerox 155
   * Budget: PHP 15,000

2. Click **Run Agent**

3. Review:

   * Recommended modifications
   * Performance comparison
   * Build outcome predictions

4. Open **Mechanic Chat**

   * Ask upgrade questions
   * Request maintenance advice
   * Explore modification options

5. Add suggested parts to the build sheet/cart

6. Print or save the generated build plan

---

## Challenges and Solutions

| Challenge                                        | Solution                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Chatbot responding in JSON                       | Separate prompts for chat and planning agent                      |
| Multiple AI providers                            | Dedicated Gemini and Groq configurations                          |
| Chat-to-plan synchronization                     | Automatic part extraction and plan generation                     |
| Different user experiences for chat and planning | Chat provides guidance; agent provides structured recommendations |
| Theme inconsistencies                            | Unified CSS variables and Tailwind theme tokens                   |
| Gemini API errors                                | Retry mechanisms and fallback handling                            |
| Local development setup issues                   | Installation and configuration documentation                      |
| No API keys available                            | Rule-based offline recommendation system                          |

---

## Installation

### Prerequisites

* Node.js (v18 or later)
* npm

### Clone the Repository

```bash
git clone <repository-url>
cd revmind
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### Start Development Server

```bash
npm run dev
```

Application will be available at:

```text
http://localhost:5173
```

---

## Future Improvements

* Real-time motorcycle parts marketplace integration
* Compatibility verification system
* Maintenance scheduling
* Cost estimation from online retailers
* User account synchronization
* Mobile application support
* Advanced performance simulation

---

## License

This project was developed for academic purposes as part of the Analytics 4 course requirement.

---

## Author

**Jonathan Charles N. Rugayan**
Analytics 4 Project

**RevMind — AI-Powered Motorcycle Modification Assistant**
