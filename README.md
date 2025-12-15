# ⚡ IDEM
### High-Fidelity Prompt Architect & LoRA Forge

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)
![Tech](https://img.shields.io/badge/tech-React%20|%20Vite%20|%20Gemini-black)
![License](https://img.shields.io/badge/license-MIT-gray)

**The ultimate tool for AI identity consistency, dataset synthesis, and commercial-grade prompt engineering.**

</div>

---

## 💎 Overview

**IDEM** is a professional-grade workspace designed for AI artists and engineers. It solves the hardest problem in generative AI: **Identity Consistency**. 

By combining forensic-level image analysis with a "LoRA Forge" workflow, IDEM allows you to deconstruct a subject's physical traits, synthesize consistent training datasets, and generate high-fidelity prompts for commercial, social media, and creative use cases.

## ✨ Key Features

### 🧬 1. Identity Engineering (VisionStruct)
Stop guessing. IDEM uses computer vision to analyze your source images and extract a "VisionStruct" — a forensic map of physical traits.
- **Reference Generator**: Automatically generate perfect 1:1 Headshot and Bodyshot references.
- **Multi-Provider Support**: Switch between **Nano Banana Pro** (Google) and **Wavespeed** API endpoints.
- **Consistency Lock**: Ensures your subject looks the same across thousands of generations.

### 🏭 2. LoRA Forge / Dataset Generator
Build professional training datasets in minutes, not hours.
- **Deep Analysis**: Extracts "Realism Stack" (skin texture, lighting physics) and "Body Stack" (morphology).
- **Auto-Synthesizer**: Generates 100+ unique training prompts based on your subject's actual identity.
- **Batch Processing**: Auto-generates the images, zips them up with JSON metadata, and prepares them for LoRA training.
- **Safety Modes**: Toggle between Standard and "Enhance Form" modes for different artistic requirements.

### 📸 3. Image Cloning & Forensic Analysis
Reverse-engineer any image into a perfect prompt.
- **Image → INI**: Converts any image into a sophisticated configuration file (INI format) describing lighting, camera angles, and geometry.
- **Scene Only Mode**: The "Face Swap". Intelligently strips all physical identity traits from a scene, allowing you to copy the scene as well as the pose, emotion and clothing of the subject.

### 📱 4. UGC & Social Media Architect
Create hyper-realistic prompts for social media and UGC.
- **Scenario Builder**: Describe a niche (e.g., "Coffee shop aesthetic") and get structured prompts.
- **Smart Formatting**: Automatically breaks down prompts into Setting, Outfit, Pose, and Camera settings.
- **Batch Generation**: Create weeks of content concepts in seconds.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: TailwindCSS, Glassmorphism UI
- **AI Core**: Google Gemini 1.5 Flash (Analysis & Logic)
- **Image Engine**: Wavespeed / proprietary integration
- **State**: TanStack Query

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Gemini API Key

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-repo/idem.git
   cd idem
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Launch**
   Open \`http://localhost:5173\` in your browser.

---

## 🔐 Security & Privacy
IDEM runs locally in your browser. Your API keys are stored in `sessionStorage` and are never saved to a server. Identity data is yours and exists only within your session or exported files.

---

<div align="center">
Built with 💜 by Degenerative AI
</div>
