# Erzen AI 🤖✨

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-AGPL-green?style=for-the-badge)](LICENSE)

> A powerful, web-based AI chat application with advanced features and a modern interface.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🌟 Overview

Erzen AI is a sophisticated web-based chat platform that enables seamless interaction with various AI models. Built with a modern tech stack including Next.js, TypeScript, and Tailwind CSS, it offers a robust user experience with real-time communication, model selection, and intelligent features like web search integration and reasoning capabilities.

## ✨ Features

- **💬 Multi-Model Chat**: Chat with different AI models through an intuitive interface
- **🔍 Web Search**: Enable browse mode for AI to search the web for up-to-date information
- **🧠 Advanced Reasoning**: Leverage AI reasoning capabilities for complex problems
- **🧵 Thread Management**: Create, view, and manage multiple chat threads
- **📎 File Attachments**: Upload and share files within conversations
- **💾 Offline Support**: Local storage using IndexedDB for offline capabilities
- **⚡ Real-time Communication**: WebSocket integration for instant responses
- **🔒 Authentication System**: Secure user authentication and session management
- **📱 Responsive Design**: Optimized for both desktop and mobile devices

## 📸 Screenshots

*Coming soon*

<!-- 
![Dashboard](screenshots/dashboard.png)
![Chat Interface](screenshots/chat-interface.png)
![Mobile View](screenshots/mobile-view.png)
-->

## 🛠️ Technologies

- **Frontend**:
- [Next.js 14](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Headless UI components
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [Zustand](https://github.com/pmndrs/zustand) - State management

- **Backend**:
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) - Serverless functions
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - Real-time communication
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Client-side storage

- **AI Integration**:
- Multiple AI model support
- Web search capabilities
- Reasoning engines

## 🚀 Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/erzen-ai.git
cd erzen-ai
```

2. **Install dependencies**:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
```
Edit `.env.local` to add your API keys and configuration.

4. **Run the development server**:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open in browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Usage

### Starting a New Chat

1. Navigate to the dashboard
2. Click on "New Chat" button
3. Select an AI model from the dropdown
4. Type your message and press Enter or click Send

### Using Web Search

1. Enable the "Browse" toggle in the chat interface
2. Ask questions that require up-to-date information
3. The AI will search the web and provide answers with citations

### Managing Threads

1. Access your chat history from the sidebar
2. Rename threads by clicking on the thread name
3. Delete threads using the context menu (three dots)

### Uploading Files

1. Click the attachment icon in the chat input
2. Select files from your device
3. The AI will process and respond to the uploaded content

## ⚙️ Configuration

The application can be configured through environment variables:

```env
NEXT_PUBLIC_API_URL=your_api_url
```

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---

<p align="center">Made with ❤️ by Erzen AI Team</p>

